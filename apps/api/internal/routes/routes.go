package routes

import (
	"context"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/MUKE-coder/gin-docs/gindocs"
	"github.com/MUKE-coder/gorm-studio/studio"
	"github.com/MUKE-coder/pulse/pulse"
	sentinel "github.com/MUKE-coder/sentinel/v2"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ai"
	"megagig-software-solution/apps/api/internal/cache"
	"megagig-software-solution/apps/api/internal/config"
	"megagig-software-solution/apps/api/internal/flags"
	"megagig-software-solution/apps/api/internal/handlers"
	"megagig-software-solution/apps/api/internal/jobs"
	"megagig-software-solution/apps/api/internal/mail"
	"megagig-software-solution/apps/api/internal/middleware"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/realtime"
	"megagig-software-solution/apps/api/internal/services"
	"megagig-software-solution/apps/api/internal/storage"
	"megagig-software-solution/apps/api/internal/sync"
	"megagig-software-solution/apps/api/internal/webhooks"
)

// APIVersion is the version segment every /api route is served under, so the
// public surface is /api/v1/... rather than /api/....
//
// Why a prefix at all: once anything outside this repo calls your API — a
// mobile build you can't force-update, a partner integration, a customer's
// script — you can no longer change a response shape without breaking them.
// A version in the path gives you somewhere to put the new shape. When that
// day comes, add a v2 group next to v1 and leave v1 answering the old way
// until consumers have moved; delete it when your logs say nobody's left.
//
// Unversioned /api/... requests are rewritten to this version (see
// mountLegacyAPIAlias), so existing clients keep working after an upgrade.
// That alias is a courtesy for the transition, not a second API: it always
// points at whatever APIVersion currently is, so a client that never adopts
// the prefix will eventually be dragged onto a version it wasn't written for.
const APIVersion = "v1"

// Services holds all Phase 4 services for dependency injection.
type Services struct {
	Cache   *cache.Cache
	Storage *storage.Storage
	Mailer  *mail.Mailer
	AI      *ai.AI
	Jobs    *jobs.Client
	// SecObsBridge talks to Sentinel + Pulse over loopback so the
	// in-app Security/Observability dashboards can show summary cards
	// without iframing. Nil when Sentinel/Pulse are both disabled.
	SecObs *services.SecObsBridge
}

// Setup configures all routes and returns the Gin engine.
func Setup(db *gorm.DB, cfg *config.Config, svc *Services) *gin.Engine {
	if cfg.AppEnv == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()

	// Global middleware
	r.Use(middleware.Maintenance())
	r.Use(middleware.SecurityHeaders())
	r.Use(middleware.MaxBodySize(10 << 20)) // 10MB max request body
	r.Use(middleware.RequestID())
	r.Use(middleware.Logger())
	r.Use(gin.Recovery())
	r.Use(middleware.CORS(cfg.CORSOrigins))
	r.Use(middleware.Gzip())

	// CSRF defence — only enforces on cookie-authenticated mutations.
	// Bearer (mobile/desktop) flows pass through with no header required.
	// Pairs with services.AuthService.SetAuthCookies (the HttpOnly cookie
	// path documented in /docs/backend/authentication).
	r.Use(middleware.AutoCSRF())

	// Idempotent retries for unsafe methods. Activates only when the client
	// sends an Idempotency-Key header; cached for 24h on 2xx responses.
	r.Use(middleware.Idempotency(svc.Cache))

	// Mount Sentinel security suite (WAF, rate limiting, auth shield, anomaly detection)
	if cfg.SentinelEnabled {
		// In development, use relaxed rate limits so devs don't get blocked while testing
		isDev := cfg.AppEnv == "development"
		ipLimit := &sentinel.Limit{Requests: 100, Window: 1 * time.Minute}
		routeLimits := map[string]sentinel.Limit{
			"/api/auth/login":    {Requests: 5, Window: 15 * time.Minute},
			"/api/auth/register": {Requests: 3, Window: 15 * time.Minute},
		}
		if isDev {
			ipLimit = &sentinel.Limit{Requests: 1000, Window: 1 * time.Minute}
			routeLimits = map[string]sentinel.Limit{
				"/api/auth/login":    {Requests: 100, Window: 1 * time.Minute},
				"/api/auth/register": {Requests: 100, Window: 1 * time.Minute},
			}
		}

		// Sentinel persists its security data (threat log, blocked IPs,
		// audit trail) through its own storage adapter, NOT the *gorm.DB we
		// pass in. Left unset it silently falls back to a local sentinel.db
		// SQLite file — which is ephemeral inside a container, so every
		// redeploy would drop the threat log and the blocked-IP list. Point
		// it at the same database the app uses when that's Postgres.
		sentinelStorage := sentinel.StorageConfig{Driver: sentinel.SQLite, DSN: "sentinel.db"}
		if !strings.HasPrefix(cfg.DatabaseURL, "sqlite:") {
			sentinelStorage = sentinel.StorageConfig{Driver: sentinel.Postgres, DSN: cfg.DatabaseURL}
		}

		// Sentinel v2 — use MountE so we can recover gracefully on
		// misconfiguration in dev instead of log.Fatalf-ing the host.
		// Mount runs sentinel.ValidateConfig and logs any dead config.
		if err := sentinel.MountE(r, db, sentinel.Config{
			Storage: sentinelStorage,
			Dashboard: sentinel.DashboardConfig{
				Username:  cfg.SentinelUsername,
				Password:  cfg.SentinelPassword,
				SecretKey: cfg.SentinelSecretKey,
				// Sentinel refuses default credentials in gin.ReleaseMode;
				// opt-in only for dev so prod can't ship forgeable JWTs.
				AllowInsecureDefaults: isDev,
			},
			WAF: sentinel.WAFConfig{
				Enabled: true,
				Mode: func() sentinel.WAFMode {
					if isDev {
						return sentinel.ModeLog
					}
					return sentinel.ModeBlock
				}(),
				// v2.0 X-Forwarded-For trust closed. Empty list = ignore
				// XFF entirely (the safe default). Operators behind a known
				// reverse proxy should populate via SENTINEL_TRUSTED_PROXIES.
				TrustedProxies: cfg.SentinelTrustedProxies,
				// 1 MB cap covers richtext admin payloads — Tiptap blog
				// bodies with embedded inline images comfortably exceed
				// the prior 64 KB ceiling. Bump higher if your content
				// embeds large base64 images.
				MaxBodyBytes:        1 * 1024 * 1024,
				RejectOversizedBody: true,
				// Authenticated admin write endpoints handle their own
				// HTML/richtext payloads via Tiptap. The WAF's XSS detection
				// otherwise flags every <p>/<strong>/<img> tag in a blog
				// body as a payload. These routes still pass through auth
				// + RBAC + binding validation; WAF is just stepped aside
				// for their bodies.
				//
				// IMPORTANT: the WAF matches these against the real request
				// path (c.Request.URL.Path), NOT gin's route template. Gin
				// params like "/api/blogs/:id" therefore match only the
				// literal string ":id" and never "/api/blogs/123" — they
				// were silent dead config. Use "/*" (a subtree match) so the
				// id/token routes are actually excluded.
				ExcludeRoutes: []string{
					"/api/blogs",
					"/api/blogs/*",
					"/api/posts",
					"/api/posts/*",
					"/api/articles",
					"/api/articles/*",
					"/api/uploads",
					// v3.31.20 — public form-share submissions. Auth is
					// the share's bcrypt password (optional) and the
					// token itself; Sentinel rate-limits the path. The
					// subtree match also covers .../submit.
					"/api/public/forms/*",
				},
			},
			RateLimit: sentinel.RateLimitConfig{
				Enabled: !isDev,
				ByIP:    ipLimit,
				ByRoute: routeLimits,
			},
			AuthShield: sentinel.AuthShieldConfig{
				Enabled:    !isDev,
				LoginRoute: "/api/auth/login",
				// v2.0 CAPTCHA tier sits between soft and hard thresholds.
				// Wire a provider by setting CaptchaProvider in your app code.
			},
			Anomaly: sentinel.AnomalyConfig{Enabled: !isDev},
			Geo:     sentinel.GeoConfig{Enabled: !isDev},
		}); err != nil {
			log.Printf("Warning: Sentinel mount failed: %v", err)
		} else {
			log.Println("Sentinel v2.2.0 mounted at /sentinel")
		}
	}

	// Mount GORM Studio
	if cfg.GORMStudioEnabled {
		studioCfg := studio.Config{
			Prefix: "/studio",
		}
		if cfg.GORMStudioUsername != "" && cfg.GORMStudioPassword != "" {
			studioCfg.AuthMiddleware = gin.BasicAuth(gin.Accounts{
				cfg.GORMStudioUsername: cfg.GORMStudioPassword,
			})
		}
		studio.Mount(r, db, []interface{}{&models.User{}, &models.Upload{}, &models.Blog{}, &models.TeamMember{}, &models.CaseStudy{}, &models.Testimonial{}, &models.Product{}, &models.JobOpening{}, &models.FAQ{}, &models.Lead{}, &models.SiteSettings{} /* grit:studio */}, studioCfg)
		log.Println("GORM Studio mounted at /studio")
	}

	// API Documentation (gin-docs — auto-generated from routes + models)
	gindocs.Mount(r, db, gindocs.Config{
		Title:       cfg.AppName + " API",
		Description: "REST API built with [Grit](https://gritframework.dev) — Go + React meta-framework.",
		Version:     "1.0.0",
		UI:          gindocs.UIScalar,
		ScalarTheme: "kepler",
		Models:      []interface{}{&models.User{}, &models.Upload{}, &models.Blog{}},
		Auth: gindocs.AuthConfig{
			Type:         gindocs.AuthBearer,
			BearerFormat: "JWT",
		},
	})
	log.Println("API docs available at /docs")

	// Mount Pulse observability (request tracing, DB monitoring, runtime metrics, error tracking)
	if cfg.PulseEnabled {
		// Pulse v1.0 uses functional options + a context. The context
		// drives clean shutdown of the dashboard's WebSocket + background
		// samplers; we hand it the request context so a server shutdown
		// also unwinds Pulse.
		pulseOpts := []pulse.Option{
			pulse.WithAppName(cfg.AppName),
			pulse.WithCredentials(cfg.PulseUsername, cfg.PulsePassword),
			pulse.WithExcludePaths("/studio/*", "/sentinel/*", "/docs/*", "/pulse/*"),
			pulse.WithPrometheus(),
			// CRITICAL: Pulse's error middleware captures a request-body snippet
			// (MaxBodySize, default 4096) for error context, but restores ONLY
			// that snippet to the request — it discards everything past 4096
			// bytes. That truncates EVERY request carrying a Content-Length
			// (mobile / native / curl clients; browsers dodge it by sending
			// chunked), silently breaking file uploads and any large JSON POST.
			// Disable body capture so the full body always reaches the handler.
			pulse.WithRequestBodyCaptureDisabled(),
		}
		if cfg.IsDevelopment() {
			pulseOpts = append(pulseOpts, pulse.WithDevMode())
		}
		// Pulse v1.0 SQLite-backed storage — request/query/error data
		// survives a restart. Stay on the in-memory ring buffer for peak
		// write throughput.
		if cfg.PulseStorage == "sqlite" && cfg.PulseStorageDSN != "" {
			pulseOpts = append(pulseOpts, pulse.WithSQLite(cfg.PulseStorageDSN))
		}
		p := pulse.Mount(context.Background(), r, db, pulseOpts...)

		// Register health checks for connected services
		if svc.Cache != nil {
			p.AddHealthCheck(pulse.HealthCheck{
				Name:     "redis",
				Type:     "redis",
				Critical: false,
				CheckFunc: func(ctx context.Context) error {
					return svc.Cache.Client().Ping(ctx).Err()
				},
			})
		}

		log.Println("Pulse observability mounted at /pulse")
	}

	// Auth service
	authService := &services.AuthService{
		Secret:        cfg.JWTSecret,
		AccessExpiry:  cfg.JWTAccessExpiry,
		RefreshExpiry: cfg.JWTRefreshExpiry,
	}

	// Handlers
	authHandler := &handlers.AuthHandler{
		DB:          db,
		AuthService: authService,
		Config:      cfg,
		Mailer:      svc.Mailer,
	}
	userHandler := &handlers.UserHandler{
		DB:          db,
		AuthService: authService,
	}
	uploadHandler := &handlers.UploadHandler{
		DB:      db,
		Storage: svc.Storage,
		Jobs:    svc.Jobs,
	}
	aiHandler := &handlers.AIHandler{
		AI: svc.AI,
	}
	jobsHandler := &handlers.JobsHandler{
		RedisURL: cfg.RedisURL,
	}
	cronHandler := &handlers.CronHandler{}
	blogHandler := handlers.NewBlogHandler(db)
	totpHandler := &handlers.TOTPHandler{
		DB:          db,
		AuthService: authService,
		Issuer:      cfg.TOTPIssuer,
	}
	activityHandler := handlers.NewActivityHandler(db)
	webhookHandler := handlers.NewWebhookHandler(db)
	webhooks.Setup(db)
	realtimeHub := realtime.NewHub()
	flagsEngine := flags.New(db, realtimeHub)
	featureFlagHandler := handlers.NewFeatureFlagHandler(db, flagsEngine)
	realtimeHandler := handlers.NewRealtimeHandler(realtimeHub, authService)
	_ = realtimeHub // available to handlers/services that want to push events

	// In-app Security + Observability dashboards — read from Sentinel/Pulse APIs
	// over loopback. notificationHandler powers the admin bell.
	notificationHandler := &handlers.NotificationHandler{DB: db}
	securityHandler := &handlers.SecurityHandler{Bridge: svc.SecObs}
	observabilityHandler := &handlers.ObservabilityHandler{Bridge: svc.SecObs}

	// v3.30 — semantic activity log + ticket system. Mailer is optional;
	// when nil the ticket handler skips email-out and only writes the row
	// + admin notifications.
	userActivityHandler := &handlers.UserActivityHandler{DB: db}
	ocsfHandler := handlers.NewOCSFHandler(db, cfg.AppName)
	accessReviewHandler := handlers.NewAccessReviewHandler(db)
	gdprHandler := handlers.NewGDPRHandler(db)
	ticketHandler := &handlers.TicketHandler{DB: db, Mail: svc.Mailer}
	// v3.31.20 — public form sharing (Phase 2)
	formShareHandler := &handlers.FormShareHandler{DB: db}
	// v3.31.40 — per-user dashboard customisation
	dashboardLayoutHandler := &handlers.DashboardLayoutHandler{DB: db}
	// v3.31.44 — per-resource dashboard stats (Total + sparkline + Latest N)
	resourceStatsHandler := &handlers.ResourceStatsHandler{DB: db}
	// v3.31.47 — Preset Chart builder
	chartHandler := &handlers.ChartHandler{DB: db}

	// Sync registry — list every model that should be syncable from
	// offline-first desktop clients. The resource generator injects
	// new resources at the marker below.
	syncRegistry := sync.NewRegistry()
	syncRegistry.Register("users", &models.User{})
	syncRegistry.Register("uploads", &models.Upload{})
	syncRegistry.Register("blogs", &models.Blog{})
	syncRegistry.Register("team_members", &models.TeamMember{})
	syncRegistry.Register("case_studies", &models.CaseStudy{})
	syncRegistry.Register("testimonials", &models.Testimonial{})
	syncRegistry.Register("products", &models.Product{})
	syncRegistry.Register("job_openings", &models.JobOpening{})
	syncRegistry.Register("faqs", &models.FAQ{})
	syncRegistry.Register("leads", &models.Lead{})
	// grit:sync
	syncHandler := handlers.NewSyncHandler(db, syncRegistry)
	// v3.31.68 — shared background CSV import status endpoint
	importJobHandler := &handlers.ImportJobHandler{DB: db}
	// v3.31.77 — full-database backups (weekly cron + manual + download)
	backupHandler := &handlers.BackupHandler{DB: db, Storage: svc.Storage}
	roleHandler := handlers.NewRoleHandler(db)
	sessionHandler := handlers.NewSessionHandler(db)

	// Enterprise SSO. Providers are built once here (each one performs OIDC
	// discovery against the customer's IdP) and rebuilt whenever an admin saves
	// a connection, so adding a customer never needs a restart. A connection
	// whose discovery fails is logged and skipped — one broken IdP must not
	// stop everyone else signing in.
	ssoRegistry := services.NewSSORegistry(cfg.AppURL)
	for _, err := range ssoRegistry.Reload(db) {
		log.Printf("sso: %v", err)
	}
	samlRegistry := services.NewSAMLRegistry(cfg.AppURL)
	for _, err := range samlRegistry.Reload(db) {
		log.Printf("saml: %v", err)
	}
	ssoHandler := handlers.NewSSOHandler(db, authService, cfg, ssoRegistry, samlRegistry)
	teamMemberHandler := &handlers.TeamMemberHandler{
		DB: db,
	}
	caseStudyHandler := &handlers.CaseStudyHandler{
		DB: db,
	}
	testimonialHandler := &handlers.TestimonialHandler{
		DB: db,
	}
	productHandler := &handlers.ProductHandler{
		DB: db,
	}
	jobOpeningHandler := &handlers.JobOpeningHandler{
		DB: db,
	}
	fAQHandler := &handlers.FAQHandler{
		DB: db,
	}
	leadHandler := &handlers.LeadHandler{
		DB: db,
	}
	siteSettingsHandler := handlers.NewSiteSettingsHandler(db)
	// grit:handlers

	// Health check
	// /api/health probes every infrastructure dependency the dashboard's
	// System Health page wants to render. Each probe is bounded by a 500ms
	// timeout so a hung dependency doesn't pile up health requests; failing
	// probes mark themselves down and the overall status downgrades to
	// "degraded" rather than failing the endpoint.
	r.GET("/api/health", func(c *gin.Context) {
		type compStatus struct {
			OK         bool   `json:"ok"`
			LatencyMS  int64  `json:"latency_ms,omitempty"`
			Tables     int    `json:"tables,omitempty"`
			QueueKeys  int    `json:"queue_keys,omitempty"`
			Configured bool   `json:"configured,omitempty"`
			Error      string `json:"error,omitempty"`
		}

		// Database ping + table count. We probe with a 500ms deadline so a
		// blocked write loop can't hang the health check.
		dbStatus := compStatus{OK: true}
		dbStart := time.Now()
		if sqlDB, err := db.DB(); err == nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 500*time.Millisecond)
			defer cancel()
			if err := sqlDB.PingContext(ctx); err != nil {
				dbStatus.OK = false
				dbStatus.Error = err.Error()
			}
		}
		dbStatus.LatencyMS = time.Since(dbStart).Milliseconds()
		if dbStatus.OK {
			// Best-effort table count — failure is non-fatal and just drops
			// the "tables: N" tooltip on the health card.
			var count int
			db.Raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = current_schema()").Scan(&count)
			dbStatus.Tables = count
		}

		// Redis ping. Reuse the same cache client the rest of the app uses
		// rather than opening a new connection — that way "Redis healthy"
		// on the dashboard means the same Redis the cache + jobs use.
		redisStatus := compStatus{}
		if svc.Cache != nil {
			redisStart := time.Now()
			ctx, cancel := context.WithTimeout(c.Request.Context(), 500*time.Millisecond)
			defer cancel()
			if err := svc.Cache.Client().Ping(ctx).Err(); err != nil {
				redisStatus.OK = false
				redisStatus.Error = err.Error()
			} else {
				redisStatus.OK = true
			}
			redisStatus.LatencyMS = time.Since(redisStart).Milliseconds()
		}

		// Background-jobs queue — count active asynq keys as a liveness
		// signal. If asynq isn't wired (Jobs == nil), report unconfigured
		// rather than "down" so the dashboard distinguishes the cases.
		jobsStatus := compStatus{}
		if svc.Jobs != nil && svc.Cache != nil {
			ctx, cancel := context.WithTimeout(c.Request.Context(), 500*time.Millisecond)
			defer cancel()
			n, err := svc.Cache.Client().Eval(ctx,
				"local total = 0\nfor _, k in ipairs(redis.call('keys', 'asynq:*')) do total = total + 1 end\nreturn total",
				[]string{}).Int()
			if err == nil {
				jobsStatus.OK = true
				jobsStatus.QueueKeys = n
			} else {
				// Fall back to a simple ping so a "no keys yet" install still
				// reports OK rather than down.
				if perr := svc.Cache.Client().Ping(ctx).Err(); perr == nil {
					jobsStatus.OK = true
				}
			}
		}

		// Email is "configured" when Resend key is set + non-default. The
		// dashboard treats unconfigured as "—" not "down".
		mailStatus := compStatus{
			Configured: cfg.ResendAPIKey != "" && cfg.ResendAPIKey != "re_your_api_key",
			OK:         cfg.ResendAPIKey != "" && cfg.ResendAPIKey != "re_your_api_key",
		}

		// Overall status — ok if every wired-up component is up. Components
		// that aren't configured (e.g. Redis off in a single-binary dev
		// run) don't drag the overall status down.
		overall := "ok"
		if !dbStatus.OK || (svc.Cache != nil && !redisStatus.OK) {
			overall = "degraded"
		}

		c.JSON(http.StatusOK, gin.H{
			"status":   overall,
			"version":  "0.1.0",
			"database": dbStatus,
			"redis":    redisStatus,
			"api":      compStatus{OK: true},
			"jobs":     jobsStatus,
			"email":    mailStatus,
		})
	})

	// WebSocket: realtime hub. Auth via ?token=<jwt> on the handshake
	// because browsers can't set custom headers on WS upgrade.
	r.GET("/api/ws", realtimeHandler.Connect)

	// Public webhook receiver — no auth on the route itself; each
	// provider's signature verification is the real auth boundary.
	// POST /webhooks/:provider routes to whatever was registered via
	// webhooks.Register(...) at app boot.
	r.POST("/webhooks/:provider", webhookHandler.Receive)

	// ── API version ──────────────────────────────────────────────────────
	// Every /api route hangs off this group, so the whole surface is served
	// under /api/v1. When a breaking change is unavoidable, add a v2 group
	// beside it and keep v1 serving the old shape until consumers migrate —
	// that's the entire point of the prefix.
	//
	// Unversioned /api/... requests are rewritten to the current version by
	// the fallback at the bottom of this file, so older clients (and the
	// generated frontends) keep working untouched.
	v1 := r.Group("/api/" + APIVersion)

	// Public blog routes (no auth required)
	blogs := v1.Group("/blogs")
	{
		blogs.GET("", blogHandler.ListPublished)
		blogs.GET("/:slug", blogHandler.GetBySlug)
	}

	// Public, published-only routes for apps/web (no auth required).
	// Namespaced under /public/* rather than reusing the bare resource
	// path — CaseStudy/Product/Testimonial/FAQ's protected CRUD (below,
	// under `protected`) already occupies the bare path, unlike Blog's,
	// which was free because Blog's admin CRUD lives under /admin/blogs/*.
	public := v1.Group("/public")
	{
		public.GET("/case-studies", caseStudyHandler.ListPublished)
		public.GET("/case-studies/:slug", caseStudyHandler.GetBySlug)
		public.GET("/products", productHandler.ListPublished)
		public.GET("/products/:slug", productHandler.GetBySlug)
		public.GET("/testimonials", testimonialHandler.ListPublished)
		public.GET("/faqs", fAQHandler.ListPublished)
	}

	// Public site settings (no auth required) — contact info, hero copy,
	// pricing blurbs read by apps/web. Writes are admin-only, see below.
	v1.GET("/site-settings", siteSettingsHandler.Get)

	// Public auth routes
	auth := v1.Group("/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/refresh", authHandler.Refresh)
		auth.POST("/forgot-password", authHandler.ForgotPassword)
		auth.POST("/reset-password", authHandler.ResetPassword)
	}

	// OAuth2 social login
	oauth := auth.Group("/oauth")
	{
		oauth.GET("/:provider", authHandler.OAuthBegin)
		oauth.GET("/:provider/callback", authHandler.OAuthCallback)
	}

	// Enterprise SSO (OIDC). Public by design — these ARE the login flow.
	// Discover tells the login form whether an address belongs to a connection;
	// the other two are the redirect out to the IdP and the return trip.
	//
	// Like the OAuth callbacks above, /callback is registered in the customer's
	// IdP console, so its unversioned path must keep working — see the note on
	// APIVersion.
	sso := auth.Group("/sso")
	{
		sso.POST("/discover", ssoHandler.Discover)
		sso.GET("/:slug", ssoHandler.Begin)
		sso.GET("/:slug/callback", ssoHandler.Callback)
	}

	// SAML 2.0. /metadata is what the customer uploads to their IdP and /acs is
	// where that IdP POSTs the signed assertion — both get registered on their
	// side, so like the OAuth callbacks these unversioned paths must keep
	// working across API version bumps.
	samlGroup := auth.Group("/saml")
	{
		samlGroup.GET("/:slug/metadata", ssoHandler.SAMLMetadata)
		samlGroup.GET("/:slug", ssoHandler.SAMLBegin)
		samlGroup.POST("/:slug/acs", ssoHandler.SAMLACS)
	}

	// TOTP verification (public — uses pending tokens, not JWT)
	auth.POST("/totp/verify", totpHandler.Verify)
	auth.POST("/totp/backup-codes/verify", totpHandler.VerifyBackupCode)

	// Protected routes
	protected := v1.Group("")
	protected.Use(middleware.Auth(db, authService))
	// Activity logger writes one row per successful authenticated mutation.
	// Records who/what/when/where for audit. Read-only — see admin/activity.
	protected.Use(middleware.ActivityLogger(db))
	{
		protected.GET("/auth/me", authHandler.Me)
		// The caller's own permissions, for the frontend can() helper and nav
		// gating. Any authenticated user may read their own — it tells them
		// nothing they can't already discover by clicking.
		protected.GET("/auth/permissions", roleHandler.MyPermissions)

		// Which optional modules are enabled. The admin reads this to hide nav
		// entries for modules that are switched off — a dead link to a route
		// that no longer exists is worse than no link.
		protected.GET("/system/modules", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"data": cfg.Modules.Map()})
		})
		protected.POST("/auth/logout", authHandler.Logout)

		// Active sessions — see every signed-in device and revoke one or all.
		protected.GET("/auth/sessions", sessionHandler.List)
		protected.DELETE("/auth/sessions/:id", sessionHandler.Revoke)
		protected.POST("/auth/sessions/revoke-all", sessionHandler.RevokeAll)

		// Two-Factor Authentication (TOTP)
		protected.POST("/auth/totp/setup", totpHandler.Setup)
		protected.POST("/auth/totp/enable", totpHandler.Enable)
		protected.POST("/auth/totp/disable", totpHandler.Disable)
		protected.GET("/auth/totp/status", totpHandler.Status)
		protected.POST("/auth/totp/backup-codes", totpHandler.RegenerateBackupCodes)
		protected.DELETE("/auth/totp/trusted-devices", totpHandler.RevokeTrustedDevices)

		// User routes (authenticated)
		protected.GET("/users/:id", userHandler.GetByID)

		// GDPR right-to-access: a user may export their own data; an admin, anyone's.
		protected.GET("/users/:id/gdpr-export", gdprHandler.Export)

		// File uploads
		protected.POST("/uploads", uploadHandler.Create)
		protected.POST("/uploads/presign", uploadHandler.Presign)
		protected.POST("/uploads/complete", uploadHandler.CompleteUpload)
		protected.GET("/uploads", uploadHandler.List)
		protected.GET("/uploads/stats", uploadHandler.Stats)
		protected.GET("/uploads/:id", uploadHandler.GetByID)
		protected.DELETE("/uploads/:id", uploadHandler.Delete)

		// Offline-first sync — desktop clients call these to flush their
		// local outbox and pull server-side updates.
		protected.POST("/sync/push", syncHandler.Push)
		protected.GET("/sync/pull", syncHandler.Pull)

		// AI — only mounted when the module is enabled, so an app that
		// doesn't use it exposes no AI surface at all (MODULE_AI=false).
		if cfg.Modules.AI {
			protected.POST("/ai/complete", aiHandler.Complete)
			protected.POST("/ai/chat", aiHandler.Chat)
			protected.POST("/ai/stream", aiHandler.Stream)
		}

		// In-app notification bell — every authenticated user. Pulls
		// from a single Notification table that the SecObs poller
		// writes into when Sentinel/Pulse fires a high-severity event.
		protected.GET("/notifications", notificationHandler.List)
		protected.POST("/notifications/:id/read", notificationHandler.MarkRead)
		protected.POST("/notifications/read-all", notificationHandler.MarkAllRead)

		// v3.31.40 — per-user dashboard layout customisation.
		protected.GET("/dashboard-layout", dashboardLayoutHandler.Get)
		protected.PUT("/dashboard-layout", dashboardLayoutHandler.Put)

		// v3.30 — tickets. Any authenticated user can open + reply; the
		// handler scopes List/Get visibility to the caller unless they're
		// ADMIN/EDITOR (then they see the full queue).
		protected.POST("/tickets", ticketHandler.Create)
		protected.GET("/tickets", ticketHandler.List)
		protected.GET("/tickets/:id", ticketHandler.Get)
		protected.POST("/tickets/:id/reply", ticketHandler.Reply)
		protected.PATCH("/tickets/:id/close", ticketHandler.Close)
		protected.PATCH("/tickets/:id/reopen", ticketHandler.Reopen)
		protected.PATCH("/tickets/:id/assign", ticketHandler.Assign) // admin-gated inside the handler

		// v3.31.68 — poll a background CSV import's progress/result.
		protected.GET("/imports/:id", importJobHandler.GetByID)

		protected.GET("/team_members", teamMemberHandler.List)
		protected.GET("/team_members/export", teamMemberHandler.Export)
		protected.POST("/team_members/import", teamMemberHandler.Import)
		protected.GET("/team_members/import/template", teamMemberHandler.Template)
		protected.GET("/team_members/:id", teamMemberHandler.GetByID)
		protected.GET("/team_members/:id/pdf", teamMemberHandler.PDF)
		protected.POST("/team_members", teamMemberHandler.Create)
		protected.PUT("/team_members/:id", teamMemberHandler.Update)
		protected.PATCH("/team_members/:id", teamMemberHandler.Patch)
		protected.GET("/case_studies", caseStudyHandler.List)
		protected.GET("/case_studies/export", caseStudyHandler.Export)
		protected.POST("/case_studies/import", caseStudyHandler.Import)
		protected.GET("/case_studies/import/template", caseStudyHandler.Template)
		protected.GET("/case_studies/:id", caseStudyHandler.GetByID)
		protected.GET("/case_studies/:id/pdf", caseStudyHandler.PDF)
		protected.POST("/case_studies", caseStudyHandler.Create)
		protected.PUT("/case_studies/:id", caseStudyHandler.Update)
		protected.PATCH("/case_studies/:id", caseStudyHandler.Patch)
		protected.GET("/testimonials", testimonialHandler.List)
		protected.GET("/testimonials/export", testimonialHandler.Export)
		protected.POST("/testimonials/import", testimonialHandler.Import)
		protected.GET("/testimonials/import/template", testimonialHandler.Template)
		protected.GET("/testimonials/:id", testimonialHandler.GetByID)
		protected.GET("/testimonials/:id/pdf", testimonialHandler.PDF)
		protected.POST("/testimonials", testimonialHandler.Create)
		protected.PUT("/testimonials/:id", testimonialHandler.Update)
		protected.PATCH("/testimonials/:id", testimonialHandler.Patch)
		protected.GET("/products", productHandler.List)
		protected.GET("/products/export", productHandler.Export)
		protected.POST("/products/import", productHandler.Import)
		protected.GET("/products/import/template", productHandler.Template)
		protected.GET("/products/:id", productHandler.GetByID)
		protected.GET("/products/:id/pdf", productHandler.PDF)
		protected.POST("/products", productHandler.Create)
		protected.PUT("/products/:id", productHandler.Update)
		protected.PATCH("/products/:id", productHandler.Patch)
		protected.GET("/job_openings", jobOpeningHandler.List)
		protected.GET("/job_openings/export", jobOpeningHandler.Export)
		protected.POST("/job_openings/import", jobOpeningHandler.Import)
		protected.GET("/job_openings/import/template", jobOpeningHandler.Template)
		protected.GET("/job_openings/:id", jobOpeningHandler.GetByID)
		protected.GET("/job_openings/:id/pdf", jobOpeningHandler.PDF)
		protected.POST("/job_openings", jobOpeningHandler.Create)
		protected.PUT("/job_openings/:id", jobOpeningHandler.Update)
		protected.PATCH("/job_openings/:id", jobOpeningHandler.Patch)
		protected.GET("/faqs", fAQHandler.List)
		protected.GET("/faqs/export", fAQHandler.Export)
		protected.POST("/faqs/import", fAQHandler.Import)
		protected.GET("/faqs/import/template", fAQHandler.Template)
		protected.GET("/faqs/:id", fAQHandler.GetByID)
		protected.GET("/faqs/:id/pdf", fAQHandler.PDF)
		protected.POST("/faqs", fAQHandler.Create)
		protected.PUT("/faqs/:id", fAQHandler.Update)
		protected.PATCH("/faqs/:id", fAQHandler.Patch)
		protected.GET("/leads", leadHandler.List)
		protected.GET("/leads/export", leadHandler.Export)
		protected.POST("/leads/import", leadHandler.Import)
		protected.GET("/leads/import/template", leadHandler.Template)
		protected.GET("/leads/:id", leadHandler.GetByID)
		protected.GET("/leads/:id/pdf", leadHandler.PDF)
		protected.POST("/leads", leadHandler.Create)
		protected.PUT("/leads/:id", leadHandler.Update)
		protected.PATCH("/leads/:id", leadHandler.Patch)
		// grit:routes:protected
	}

	// Profile routes (any authenticated user)
	profile := protected.Group("/profile")
	{
		profile.GET("", userHandler.GetProfile)
		profile.PUT("", userHandler.UpdateProfile)
		profile.DELETE("", userHandler.DeleteProfile)
	}

	// Admin routes
	admin := v1.Group("")
	admin.Use(middleware.Auth(db, authService))
	admin.Use(middleware.RequireRole("ADMIN"))
	{
		admin.GET("/users", userHandler.List)
		admin.POST("/users", userHandler.Create)
		admin.PUT("/users/:id", userHandler.Update)
		admin.DELETE("/users/:id", userHandler.Delete)

		// Activity audit log + tamper-evident chain verification
		admin.GET("/admin/activity", activityHandler.List)
		admin.GET("/admin/activity/integrity", activityHandler.VerifyIntegrity)

		// v3.30 — semantic user activity dashboard (action + IP + severity).
		// Separate from /admin/activity above which is the HTTP audit log.
		admin.GET("/user-activity", userActivityHandler.List)
		admin.GET("/user-activity/stats", userActivityHandler.Stats)

		// OCSF audit export — the semantic activity log in the vendor-neutral
		// shape SIEMs ingest. Cursor-paginated NDJSON; poll to resume.
		admin.GET("/audit/ocsf", ocsfHandler.Export)

		// Access reviews (recertification) — snapshot every grant, certify or
		// revoke each, sign off. Admin-only; revocations hit the audit trail.
		admin.GET("/access-reviews", accessReviewHandler.List)
		admin.POST("/access-reviews", accessReviewHandler.Open)
		admin.GET("/access-reviews/:id", accessReviewHandler.Get)
		admin.POST("/access-reviews/:id/items/:itemId/decision", accessReviewHandler.Decide)
		admin.POST("/access-reviews/:id/complete", accessReviewHandler.Complete)

		// GDPR right-to-erasure: anonymize a user + hard-delete their PII, recorded
		// in a tamper-evident deletion journal. Admin-only; the journal is verifiable.
		admin.POST("/users/:id/gdpr-erase", gdprHandler.Erase)
		admin.GET("/gdpr/journal", gdprHandler.Journal)

		// Webhook receiver admin (review + replay failed events)
		admin.GET("/admin/webhooks", webhookHandler.List)
		admin.POST("/admin/webhooks/:id/replay", webhookHandler.Replay)

		// Feature flags + A/B testing
		admin.GET("/admin/flags", featureFlagHandler.List)
		admin.POST("/admin/flags", featureFlagHandler.Create)
		admin.PUT("/admin/flags/:id", featureFlagHandler.Update)
		admin.DELETE("/admin/flags/:id", featureFlagHandler.Delete)
		admin.GET("/admin/flags/:id/exposures", featureFlagHandler.Exposures)

		// Admin system routes
		admin.GET("/admin/jobs/stats", jobsHandler.Stats)
		admin.GET("/admin/jobs/:status", jobsHandler.ListByStatus)
		admin.POST("/admin/jobs/:id/retry", jobsHandler.Retry)
		admin.DELETE("/admin/jobs/queue/:queue", jobsHandler.ClearQueue)
		admin.GET("/admin/cron/tasks", cronHandler.ListTasks)

		// Blog management (admin)
		admin.GET("/admin/blogs", blogHandler.List)
		admin.GET("/admin/blogs/:id", blogHandler.GetByID)
		admin.POST("/admin/blogs", blogHandler.Create)
		admin.PUT("/admin/blogs/:id", blogHandler.Update)
		admin.DELETE("/admin/blogs/:id", blogHandler.Delete)

		// In-app Security dashboard — aggregates Sentinel APIs into one
		// envelope so the React page does a single round-trip. Operators
		// who want to dig deeper open /sentinel/ui directly.
		admin.GET("/admin/security/summary", securityHandler.Summary)
		// In-app Observability dashboard — same pattern against Pulse.
		// Operators who want a flame graph or the full SLO timeline open
		// /pulse/ui directly.
		admin.GET("/admin/observability/summary", observabilityHandler.Summary)

		// v3.31.20 — public form sharing admin
		// SSO connections — admin only. Client secrets are write-only: they go
		// in on create/update and are never returned, so a compromised admin
		// session can't read a customer's IdP credentials back out.
		admin.GET("/sso/connections", middleware.RequireRole("ADMIN"), ssoHandler.List)
		admin.POST("/sso/connections", middleware.RequireRole("ADMIN"), ssoHandler.Create)
		admin.PUT("/sso/connections/:id", middleware.RequireRole("ADMIN"), ssoHandler.Update)
		admin.DELETE("/sso/connections/:id", middleware.RequireRole("ADMIN"), ssoHandler.Delete)
		admin.GET("/sso/connections/:id/test", middleware.RequireRole("ADMIN"), ssoHandler.Test)

		admin.GET("/admin/form-shares", formShareHandler.List)
		admin.POST("/admin/form-shares", formShareHandler.Create)
		admin.PATCH("/admin/form-shares/:id", formShareHandler.Update)
		admin.DELETE("/admin/form-shares/:id", formShareHandler.Delete)
		// v3.31.50 — dropdown source + field preview for the New
		// Share / Edit Share modal. Both read-only.
		admin.GET("/admin/form-shares/resources", formShareHandler.Resources)
		admin.GET("/admin/form-shares/resources/:resource/fields", formShareHandler.FieldsPreview)
		// v3.31.25 — audit log of public submissions
		admin.GET("/admin/form-submissions", formShareHandler.ListSubmissions)

		// v3.31.44 — per-resource dashboard stats: Total + 30-day
		// sparkline + Latest N. Dispatched server-side; only resources
		// registered in services/resource_stats_dispatch.go are reachable.
		admin.GET("/admin/dashboard/resource-stats/:resource", resourceStatsHandler.Get)

		// v3.31.47 — Preset Chart builder. Same dispatch boundary;
		// only resources registered in chart_dispatch.go reachable.
		admin.GET("/admin/dashboard/chart/:resource", chartHandler.Get)

		// v3.31.77 — full-database backups. Weekly cron writes them; an
		// operator can also take one on demand (rate-limited to 1/24h) and
		// download it via a short-lived pre-signed URL straight from storage.
		admin.GET("/backups", backupHandler.List)
		admin.POST("/backups/generate", backupHandler.Generate)
		admin.GET("/backups/:id/download", backupHandler.Download)
		// Separate path (not /backups/settings) so it doesn't collide with the
		// /backups/:id wildcard segment in Gin's router.
		admin.GET("/backup-settings", backupHandler.GetSettings)
		admin.PUT("/backup-settings", backupHandler.UpdateSettings)

		// Roles & permissions. Guarded by permission as well as the group's
		// ADMIN role, so a custom role can be given role-management rights
		// without being made a full admin.
		admin.GET("/permissions", roleHandler.Catalog)
		admin.GET("/roles", middleware.RequireRole("ADMIN", "perm:roles.view"), roleHandler.List)
		admin.POST("/roles", middleware.RequireRole("ADMIN", "perm:roles.create"), roleHandler.Create)
		admin.GET("/roles/:id", middleware.RequireRole("ADMIN", "perm:roles.view"), roleHandler.Get)
		admin.PUT("/roles/:id", middleware.RequireRole("ADMIN", "perm:roles.edit"), roleHandler.Update)
		admin.DELETE("/roles/:id", middleware.RequireRole("ADMIN", "perm:roles.delete"), roleHandler.Delete)
		admin.PUT("/users/:id/roles", middleware.RequireRole("ADMIN", "perm:users.edit"), roleHandler.AssignUserRoles)

		admin.DELETE("/team_members/:id", teamMemberHandler.Delete)
		admin.DELETE("/case_studies/:id", caseStudyHandler.Delete)
		admin.DELETE("/testimonials/:id", testimonialHandler.Delete)
		admin.DELETE("/products/:id", productHandler.Delete)
		admin.DELETE("/job_openings/:id", jobOpeningHandler.Delete)
		admin.DELETE("/faqs/:id", fAQHandler.Delete)
		admin.DELETE("/leads/:id", leadHandler.Delete)

		// Site settings singleton — GET is public (registered above on v1
		// directly), this PUT is the only write path, admin-only.
		admin.PUT("/site-settings", siteSettingsHandler.Update)
		// grit:routes:admin
	}

	// Public form-sharing endpoints. NO auth, NO CSRF — Sentinel rate
	// limits each token aggressively. The dispatch service is the
	// security boundary (whitelists which resources are reachable).
	publicForms := v1.Group("/public/forms")
	{
		publicForms.GET("/:token", formShareHandler.PublicGet)
		publicForms.POST("/:token/submit", formShareHandler.PublicSubmit)
	}

	// Custom role-restricted routes
	// grit:routes:custom

	mountLegacyAPIAlias(r)

	return r
}

// mountLegacyAPIAlias keeps unversioned /api/... paths working by re-dispatching
// them to /api/<APIVersion>/... .
//
// It runs as the 404 fallback rather than as middleware because Gin resolves the
// route before middleware executes — by the time a handler could rewrite the
// path, the routing decision is already made. Landing here means no route
// matched, so the only cost is on requests that were going to 404 anyway.
//
// /api/ws is deliberately excluded: a WebSocket upgrade re-dispatched through
// HandleContext does not survive reliably, and a transport endpoint isn't part
// of the REST surface being versioned.
func mountLegacyAPIAlias(r *gin.Engine) {
	versioned := "/api/" + APIVersion + "/"

	r.NoRoute(func(c *gin.Context) {
		p := c.Request.URL.Path

		if strings.HasPrefix(p, "/api/") &&
			!strings.HasPrefix(p, versioned) &&
			p != "/api/ws" {
			c.Request.URL.Path = "/api/" + APIVersion + strings.TrimPrefix(p, "/api")
			// Tell the caller they're on a deprecated path. Harmless to
			// ignore, but it shows up in their logs before v2 forces the issue.
			c.Header("Deprecation", "true")
			c.Header("Link", "</api/"+APIVersion+">; rel=\"successor-version\"")
			r.HandleContext(c)
			return
		}

		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "no route matches " + c.Request.Method + " " + p,
			},
		})
	})
}
