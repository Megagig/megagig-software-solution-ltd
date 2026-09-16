package handlers

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/authz"
	"megagig-software-solution/apps/api/internal/config"
	"megagig-software-solution/apps/api/internal/crypto"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/respond"
	"megagig-software-solution/apps/api/internal/services"
)

// ssoStateCookie carries the marshalled provider session plus the CSRF state
// between the redirect out to the IdP and the callback. It is HttpOnly and
// short-lived: it exists only for the seconds the user spends at the IdP.
// externalIdentity is one person as an identity provider described them,
// normalized so OIDC and SAML converge before any account is touched. Keeping
// provisioning, identity linking and role mapping on this one shape means SAML
// inherits the behaviour OIDC already has tests for, instead of growing a
// second, subtly different copy.
type externalIdentity struct {
	Subject   string // the IdP's immutable ID: OIDC "sub", SAML NameID
	Email     string
	FirstName string
	LastName  string
	Avatar    string
	Groups    []string
}

const ssoStateCookie = "grit_sso"

// ssoCookiePath is deliberately "/api" rather than "/api/auth".
//
// The redirect out to the IdP and the return trip can legitimately arrive on
// either the versioned path (/api/v1/auth/sso/...) or the unversioned alias
// (/api/auth/sso/..., which is what gets registered in the IdP console). A
// cookie scoped to /api/auth is not sent to /api/v1/auth/..., so scoping it
// that tightly makes the flow work or break depending on which URL the caller
// happened to use. The cookie is HttpOnly and lives `10 minutes, so the wider
// path costs nothing.
const ssoCookiePath = "/api"

type SSOHandler struct {
	DB          *gorm.DB
	AuthService *services.AuthService
	Config      *config.Config
	Registry    *services.SSORegistry
	SAML        *services.SAMLRegistry
}

func NewSSOHandler(db *gorm.DB, auth *services.AuthService, cfg *config.Config,
	reg *services.SSORegistry, samlReg *services.SAMLRegistry) *SSOHandler {
	return &SSOHandler{DB: db, AuthService: auth, Config: cfg, Registry: reg, SAML: samlReg}
}

// ── Public: discovery ────────────────────────────────────────────────────────

// Discover answers "should this email address use SSO, and if so where?".
//
// The login form calls it as the user submits their address. A miss is a normal
// answer, not an error — most people at most apps sign in with a password.
//
//	POST /api/auth/sso/discover  {"email": "bob@acme.com"}
//	200 {"data": {"sso": true, "slug": "acme", "name": "Acme Okta", "redirect_url": "..."}}
func (h *SSOHandler) Discover(c *gin.Context) {
	var req struct {
		Email string `json:"email" binding:"required,email"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		respond.BadRequest(c, "a valid email address is required")
		return
	}

	conn, err := services.ConnectionForEmail(h.DB, req.Email)
	if err != nil {
		respond.Internal(c, err)
		return
	}
	if conn == nil {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{"sso": false}})
		return
	}

	// The two protocols start at different URLs, so the caller is told which
	// one to send the browser to rather than having to infer it.
	start := "/api/auth/sso/" + conn.Slug
	if conn.IsSAML() {
		start = "/api/auth/saml/" + conn.Slug
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"sso":          true,
		"slug":         conn.Slug,
		"name":         conn.Name,
		"protocol":     conn.Protocol,
		"redirect_url": start,
	}})
}

// ── Public: the login flow ───────────────────────────────────────────────────

// Begin redirects the user to their identity provider.
//
//	GET /api/auth/sso/:slug
func (h *SSOHandler) Begin(c *gin.Context) {
	slug := strings.ToLower(c.Param("slug"))

	provider, err := h.Registry.Provider(slug)
	if err != nil {
		h.failLogin(c, "That sign-in method is not available.")
		return
	}

	state, err := randomState()
	if err != nil {
		h.failLogin(c, "Could not start sign-in. Please try again.")
		return
	}

	sess, err := provider.BeginAuth(state)
	if err != nil {
		log.Printf("sso %s: begin: %v", slug, err)
		h.failLogin(c, "Could not reach the identity provider.")
		return
	}
	authURL, err := sess.GetAuthURL()
	if err != nil {
		log.Printf("sso %s: auth url: %v", slug, err)
		h.failLogin(c, "Could not reach the identity provider.")
		return
	}

	// The session and the state travel together in one HttpOnly cookie. The
	// state is echoed back by the IdP and compared on return, which is what
	// stops an attacker replaying someone else's callback.
	payload, _ := json.Marshal(map[string]string{
		"slug":    slug,
		"state":   state,
		"session": sess.Marshal(),
	})
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(ssoStateCookie, base64.RawURLEncoding.EncodeToString(payload),
		600, ssoCookiePath, "", isSecureRequest(c), true)

	c.Redirect(http.StatusTemporaryRedirect, authURL)
}

// Callback completes the login: verifies the response, resolves or provisions
// the user, applies role mapping, and issues the same cookies a password login
// would.
//
//	GET /api/auth/sso/:slug/callback
func (h *SSOHandler) Callback(c *gin.Context) {
	slug := strings.ToLower(c.Param("slug"))

	raw, err := c.Cookie(ssoStateCookie)
	if err != nil {
		h.failLogin(c, "Your sign-in session expired. Please try again.")
		return
	}
	// One-shot: clear it whatever happens next.
	c.SetCookie(ssoStateCookie, "", -1, ssoCookiePath, "", isSecureRequest(c), true)

	decoded, err := base64.RawURLEncoding.DecodeString(raw)
	if err != nil {
		h.failLogin(c, "Your sign-in session was invalid. Please try again.")
		return
	}
	var stash map[string]string
	if err := json.Unmarshal(decoded, &stash); err != nil {
		h.failLogin(c, "Your sign-in session was invalid. Please try again.")
		return
	}

	if stash["slug"] != slug {
		h.failLogin(c, "Your sign-in session did not match. Please try again.")
		return
	}
	if s := c.Query("state"); s == "" || s != stash["state"] {
		h.failLogin(c, "Your sign-in session did not match. Please try again.")
		return
	}

	provider, err := h.Registry.Provider(slug)
	if err != nil {
		h.failLogin(c, "That sign-in method is not available.")
		return
	}

	sess, err := provider.UnmarshalSession(stash["session"])
	if err != nil {
		h.failLogin(c, "Your sign-in session was invalid. Please try again.")
		return
	}
	if _, err := sess.Authorize(provider, c.Request.URL.Query()); err != nil {
		log.Printf("sso %s: authorize: %v", slug, err)
		h.failLogin(c, "Sign-in was not completed.")
		return
	}

	external, err := provider.FetchUser(sess)
	if err != nil {
		log.Printf("sso %s: fetch user: %v", slug, err)
		h.failLogin(c, "Could not read your profile from the identity provider.")
		return
	}
	if strings.TrimSpace(external.Email) == "" {
		h.failLogin(c, "Your identity provider did not release an email address.")
		return
	}

	var conn models.SSOConnection
	if err := h.DB.Where("slug = ? AND enabled = ?", slug, true).First(&conn).Error; err != nil {
		h.failLogin(c, "That sign-in method is not available.")
		return
	}

	ident := externalIdentity{
		Subject:   external.UserID,
		Email:     external.Email,
		FirstName: firstNonBlank(external.FirstName, external.NickName),
		LastName:  external.LastName,
		Avatar:    external.AvatarURL,
		Groups:    services.ClaimGroups(external.RawData, conn.GroupsClaim),
	}

	user, err := h.resolveUser(c, &conn, ident)
	if err != nil {
		h.failLogin(c, err.Error())
		return
	}

	if err := h.applyGroupRoles(&conn, user, ident); err != nil {
		// Role mapping failing shouldn't strand a user who authenticated
		// correctly — log it and let them in with whatever they already have.
		log.Printf("sso %s: role mapping for %s: %v", slug, user.ID, err)
	}

	// Reload so the token carries any role the mapping just assigned.
	if err := h.DB.Where("id = ?", user.ID).First(user).Error; err != nil {
		h.failLogin(c, "Could not complete sign-in.")
		return
	}

	tokens, err := h.AuthService.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		h.failLogin(c, "Could not complete sign-in.")
		return
	}
	if _, err := services.CreateSession(h.DB, c, user.ID, tokens.RefreshToken); err != nil {
		log.Printf("sso: failed to record session for %s: %v", user.ID, err)
	}
	h.AuthService.SetAuthCookies(c, tokens)

	services.TouchConnection(h.DB, conn.ID)

	c.Redirect(http.StatusTemporaryRedirect, h.Config.OAuthFrontendURL+"/auth/callback")
}

// resolveUser finds the account this login belongs to, provisioning one when
// the connection allows it.
//
// Order matters. The IdP subject is matched first because it is the only
// identifier guaranteed stable — someone who changes their email at the IdP
// must keep their account rather than silently getting a second one. Email is
// the fallback, which is also how an existing password user gets linked to SSO
// the first time their company turns it on.
func (h *SSOHandler) resolveUser(c *gin.Context, conn *models.SSOConnection, external externalIdentity) (*models.User, error) {
	now := time.Now()
	email := strings.ToLower(strings.TrimSpace(external.Email))

	var identity models.UserIdentity
	err := h.DB.Where("provider = ? AND subject = ?", conn.Slug, external.Subject).First(&identity).Error
	if err == nil {
		var user models.User
		if err := h.DB.Where("id = ?", identity.UserID).First(&user).Error; err != nil {
			return nil, fmt.Errorf("Your account could not be found.")
		}
		if !user.Active {
			return nil, fmt.Errorf("Your account has been disabled.")
		}
		h.DB.Model(&identity).Updates(map[string]interface{}{"last_login_at": now, "email": email})
		return &user, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("Could not complete sign-in.")
	}

	var user models.User
	err = h.DB.Where("email = ?", email).First(&user).Error
	switch {
	case err == nil:
		if !user.Active {
			return nil, fmt.Errorf("Your account has been disabled.")
		}
	case err == gorm.ErrRecordNotFound:
		if !conn.JITProvisioning {
			return nil, fmt.Errorf("No account exists for %s. Ask your administrator to create one.", email)
		}
		user = models.User{
			FirstName:       firstNonBlank(external.FirstName, "User"),
			LastName:        external.LastName,
			Email:           email,
			Avatar:          external.Avatar,
			Provider:        conn.Slug,
			Role:            models.RoleUser,
			Active:          true,
			EmailVerifiedAt: &now, // the IdP asserted it
			IPAddress:       c.ClientIP(),
		}
		if err := h.DB.Create(&user).Error; err != nil {
			return nil, fmt.Errorf("Could not create your account.")
		}
	default:
		return nil, fmt.Errorf("Could not complete sign-in.")
	}

	// Link the external identity so subsequent logins match on subject.
	link := models.UserIdentity{
		UserID:      user.ID,
		Provider:    conn.Slug,
		Subject:     external.Subject,
		Email:       email,
		LastLoginAt: &now,
	}
	if err := h.DB.Create(&link).Error; err != nil {
		log.Printf("sso %s: linking identity for %s: %v", conn.Slug, user.ID, err)
	}
	return &user, nil
}

// applyGroupRoles grants the roles the IdP's groups map to.
//
// Roles are replaced, not merged, so removing someone from a group at the IdP
// removes the role here on their next login — which is the only reason to map
// groups at all. Connections with no mapping configured are left alone so an
// admin's manual grants survive.
func (h *SSOHandler) applyGroupRoles(conn *models.SSOConnection, user *models.User, external externalIdentity) error {
	names := services.GroupRoleNames(conn, external.Groups)

	if len(names) == 0 {
		if strings.TrimSpace(conn.GroupMappings) != "" {
			return nil // mapping configured but nothing matched — leave as-is
		}
		if conn.DefaultRoleID == "" {
			return nil
		}
		var role models.Role
		if err := h.DB.Where("id = ?", conn.DefaultRoleID).First(&role).Error; err != nil {
			return err
		}
		names = []string{role.Name}
	}

	var roles []models.Role
	if err := h.DB.Where("name IN ?", names).Find(&roles).Error; err != nil {
		return err
	}
	if len(roles) == 0 {
		return nil
	}

	err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Where("user_id = ?", user.ID).Delete(&models.UserRole{}).Error; err != nil {
			return err
		}
		for _, r := range roles {
			if err := tx.Create(&models.UserRole{UserID: user.ID, RoleID: r.ID}).Error; err != nil {
				return err
			}
		}
		// The legacy users.role string is what GenerateTokenPair bakes into the
		// JWT, so it has to move in step with the join table or the token and
		// the grants disagree.
		return tx.Model(&models.User{}).Where("id = ?", user.ID).
			Update("role", strings.ToUpper(roles[0].Name)).Error
	})
	if err != nil {
		return err
	}
	authz.Invalidate()
	return nil
}

func (h *SSOHandler) failLogin(c *gin.Context, message string) {
	c.Redirect(http.StatusTemporaryRedirect,
		fmt.Sprintf("%s/login?error=%s", h.Config.OAuthFrontendURL, url.QueryEscape(message)))
}

// ── Admin CRUD ───────────────────────────────────────────────────────────────

type ssoConnectionInput struct {
	Slug            string `json:"slug"`
	Name            string `json:"name"`
	Domains         string `json:"domains"`
	IssuerURL       string `json:"issuer_url"`
	DiscoveryURL    string `json:"discovery_url"`
	ClientID        string `json:"client_id"`
	ClientSecret    string `json:"client_secret"`
	Scopes          string `json:"scopes"`
	Enabled         *bool  `json:"enabled"`
	JITProvisioning *bool  `json:"jit_provisioning"`
	DefaultRoleID   string `json:"default_role_id"`
	GroupsClaim     string `json:"groups_claim"`
	GroupMappings   string `json:"group_mappings"`

	Protocol           string `json:"protocol"`
	MetadataURL        string `json:"metadata_url"`
	MetadataXML        string `json:"metadata_xml"`
	EmailAttribute     string `json:"email_attribute"`
	FirstNameAttribute string `json:"first_name_attribute"`
	LastNameAttribute  string `json:"last_name_attribute"`
	GroupsAttribute    string `json:"groups_attribute"`
	AllowIDPInitiated  *bool  `json:"allow_idp_initiated"`
}

func (h *SSOHandler) List(c *gin.Context) {
	var conns []models.SSOConnection
	if err := h.DB.Order("created_at desc").Find(&conns).Error; err != nil {
		respond.Internal(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data": conns,
		"meta": gin.H{"live": h.Registry.Count()},
	})
}

func (h *SSOHandler) Create(c *gin.Context) {
	var in ssoConnectionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respond.BadRequest(c, err.Error())
		return
	}
	protocol := strings.ToLower(strings.TrimSpace(in.Protocol))
	if protocol == "" {
		protocol = "oidc"
	}
	if in.Slug == "" || in.Name == "" {
		respond.BadRequest(c, "slug and name are required")
		return
	}
	// The two protocols need different things: OIDC needs client credentials,
	// SAML needs the IdP metadata and no secret at all.
	if protocol == "saml" {
		if in.MetadataURL == "" && in.MetadataXML == "" {
			respond.BadRequest(c, "a metadata URL or metadata XML is required for SAML")
			return
		}
	} else if in.IssuerURL == "" || in.ClientID == "" || in.ClientSecret == "" {
		respond.BadRequest(c, "issuer_url, client_id and client_secret are required for OIDC")
		return
	}

	conn := models.SSOConnection{
		Protocol:           protocol,
		MetadataURL:        in.MetadataURL,
		MetadataXML:        in.MetadataXML,
		EmailAttribute:     in.EmailAttribute,
		FirstNameAttribute: in.FirstNameAttribute,
		LastNameAttribute:  in.LastNameAttribute,
		GroupsAttribute:    in.GroupsAttribute,
		AllowIDPInitiated:  in.AllowIDPInitiated == nil || *in.AllowIDPInitiated,
		Slug:               strings.ToLower(strings.TrimSpace(in.Slug)),
		Name:               in.Name,
		Domains:            in.Domains,
		IssuerURL:          in.IssuerURL,
		DiscoveryURL:       in.DiscoveryURL,
		ClientID:           in.ClientID,
		ClientSecret:       crypto.EncryptedString(in.ClientSecret),
		Scopes:             firstNonBlank(in.Scopes, "profile,email"),
		Enabled:            in.Enabled == nil || *in.Enabled,
		JITProvisioning:    in.JITProvisioning == nil || *in.JITProvisioning,
		DefaultRoleID:      in.DefaultRoleID,
		GroupsClaim:        firstNonBlank(in.GroupsClaim, "groups"),
		GroupMappings:      in.GroupMappings,
	}
	if err := h.DB.Create(&conn).Error; err != nil {
		respond.BadRequest(c, "could not save the connection — is the slug already in use?")
		return
	}
	// AfterFind hasn't run on a freshly-created struct, so set the flag the UI
	// reads rather than reporting "no secret" on the record we just stored one on.
	conn.HasSecret = true

	h.reload()
	c.JSON(http.StatusCreated, gin.H{"data": conn, "message": "SSO connection created"})
}

func (h *SSOHandler) Update(c *gin.Context) {
	var conn models.SSOConnection
	if err := h.DB.Where("id = ?", c.Param("id")).First(&conn).Error; err != nil {
		respond.NotFound(c, "SSO connection not found")
		return
	}

	var in ssoConnectionInput
	if err := c.ShouldBindJSON(&in); err != nil {
		respond.BadRequest(c, err.Error())
		return
	}

	updates := map[string]interface{}{}
	if in.Name != "" {
		updates["name"] = in.Name
	}
	if in.Domains != "" {
		updates["domains"] = in.Domains
	}
	if in.IssuerURL != "" {
		updates["issuer_url"] = in.IssuerURL
	}
	updates["discovery_url"] = in.DiscoveryURL
	if in.ClientID != "" {
		updates["client_id"] = in.ClientID
	}
	// An empty secret means "leave the stored one alone" — the UI never has the
	// current value to send back, so treating blank as a clear would wipe it on
	// every unrelated edit.
	if in.ClientSecret != "" {
		updates["client_secret"] = crypto.EncryptedString(in.ClientSecret)
	}
	if in.Scopes != "" {
		updates["scopes"] = in.Scopes
	}
	if in.Enabled != nil {
		updates["enabled"] = *in.Enabled
	}
	if in.JITProvisioning != nil {
		updates["jit_provisioning"] = *in.JITProvisioning
	}
	updates["default_role_id"] = in.DefaultRoleID
	if in.GroupsClaim != "" {
		updates["groups_claim"] = in.GroupsClaim
	}
	updates["group_mappings"] = in.GroupMappings
	updates["metadata_url"] = in.MetadataURL
	if in.MetadataXML != "" {
		updates["metadata_xml"] = in.MetadataXML
	}
	updates["email_attribute"] = in.EmailAttribute
	updates["first_name_attribute"] = in.FirstNameAttribute
	updates["last_name_attribute"] = in.LastNameAttribute
	updates["groups_attribute"] = in.GroupsAttribute
	if in.AllowIDPInitiated != nil {
		updates["allow_idp_initiated"] = *in.AllowIDPInitiated
	}

	if err := h.DB.Model(&conn).Updates(updates).Error; err != nil {
		respond.Internal(c, err)
		return
	}

	h.reload()
	h.DB.Where("id = ?", conn.ID).First(&conn)
	c.JSON(http.StatusOK, gin.H{"data": conn, "message": "SSO connection updated"})
}

func (h *SSOHandler) Delete(c *gin.Context) {
	if err := h.DB.Where("id = ?", c.Param("id")).Delete(&models.SSOConnection{}).Error; err != nil {
		respond.Internal(c, err)
		return
	}
	h.reload()
	c.JSON(http.StatusOK, gin.H{"message": "SSO connection deleted"})
}

// Test re-runs discovery for one connection so an admin can tell a typo in the
// issuer URL from a wrong client secret without waiting for a user to fail.
func (h *SSOHandler) Test(c *gin.Context) {
	var conn models.SSOConnection
	if err := h.DB.Where("id = ?", c.Param("id")).First(&conn).Error; err != nil {
		respond.NotFound(c, "SSO connection not found")
		return
	}
	if _, err := h.Registry.Provider(conn.Slug); err != nil {
		c.JSON(http.StatusOK, gin.H{"data": gin.H{
			"ok":      false,
			"message": "Not live. Check the issuer URL and credentials, then save again.",
		}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": gin.H{
		"ok":           true,
		"message":      "Connection is live.",
		"callback_url": h.Registry.CallbackURL(conn.Slug),
	}})
}

func (h *SSOHandler) reload() {
	for _, err := range h.Registry.Reload(h.DB) {
		log.Printf("sso: %v", err)
	}
	if h.SAML != nil {
		for _, err := range h.SAML.Reload(h.DB) {
			log.Printf("sso: %v", err)
		}
	}
}

func randomState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func firstNonBlank(vals ...string) string {
	for _, v := range vals {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func isSecureRequest(c *gin.Context) bool {
	if c.Request.TLS != nil {
		return true
	}
	return strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https")
}
