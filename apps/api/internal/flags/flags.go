// Package flags is the feature flag + A/B testing engine.
//
// At a glance:
//
//	if flags.IsEnabled(c, "new_dashboard") {
//	    // … render the new dashboard
//	}
//
//	switch flags.Variant(c, "checkout_redesign") {
//	case "control":   /* old flow */
//	case "variant_a": /* new flow */
//	case "variant_b": /* alternate new flow */
//	}
//
// Mechanics:
//   - All flags are loaded into an in-memory map at boot. A background
//     goroutine refreshes every 30s. Flag checks never hit the DB.
//   - Bucketing: SHA-256(user_id || ":" || flag_name) % 100. Sticky
//     per (user, flag) — a user always gets the same bucket for a
//     given flag, so variant assignment doesn't flicker across sessions.
//   - Anonymous users (empty user_id) bucket on a random per-request
//     value, which is effectively random. For sticky anonymous flags
//     pass a stable identifier (session ID, device ID).
//   - Exposure tracking is fire-and-forget — flag checks never block
//     on the DB.
//   - When a flag is created/updated/deleted, the engine refreshes
//     immediately and broadcasts a "flag.updated" realtime event so
//     subscribed clients can refetch.
package flags

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/binary"
	"log"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/realtime"
)

// DefaultRefreshInterval is how often the engine pulls fresh flag
// state from the DB. 30s is a reasonable middle ground — admin
// changes propagate quickly without hammering the DB.
const DefaultRefreshInterval = 30 * time.Second

// Engine owns the in-memory flag cache. One per process.
type Engine struct {
	db    *gorm.DB
	hub   *realtime.Hub // optional — when set, broadcasts on Refresh
	mu    sync.RWMutex
	flags map[string]*models.FeatureFlag
	stop  chan struct{}
}

// New returns an Engine with the cache pre-warmed. Call from
// routes.Setup. hub is optional — pass nil to disable broadcasts.
func New(db *gorm.DB, hub *realtime.Hub) *Engine {
	e := &Engine{
		db:    db,
		hub:   hub,
		flags: make(map[string]*models.FeatureFlag),
		stop:  make(chan struct{}),
	}
	if err := e.Refresh(); err != nil {
		log.Printf("[flags] initial refresh failed: %v", err)
	}
	go e.refreshLoop()
	return e
}

// Stop terminates the background refresh goroutine. Call on graceful
// shutdown to avoid leaking goroutines in tests.
func (e *Engine) Stop() {
	close(e.stop)
}

// Refresh pulls all flags from the DB and replaces the cache. Called
// every DefaultRefreshInterval and immediately after admin writes.
func (e *Engine) Refresh() error {
	var rows []models.FeatureFlag
	if err := e.db.Find(&rows).Error; err != nil {
		return err
	}
	next := make(map[string]*models.FeatureFlag, len(rows))
	for i := range rows {
		f := rows[i]
		next[f.Name] = &f
	}
	e.mu.Lock()
	e.flags = next
	e.mu.Unlock()
	return nil
}

// RefreshAndBroadcast refreshes the cache and (if a hub was provided)
// emits a "flag.updated" realtime event so subscribed clients can
// refetch. Call after admin writes.
func (e *Engine) RefreshAndBroadcast(flagName string) {
	if err := e.Refresh(); err != nil {
		log.Printf("[flags] refresh after change failed: %v", err)
	}
	if e.hub != nil {
		e.hub.Broadcast(realtime.Event{
			Type:    "flag.updated",
			Payload: map[string]interface{}{"name": flagName},
		})
	}
}

func (e *Engine) refreshLoop() {
	t := time.NewTicker(DefaultRefreshInterval)
	defer t.Stop()
	for {
		select {
		case <-t.C:
			if err := e.Refresh(); err != nil {
				log.Printf("[flags] periodic refresh failed: %v", err)
			}
		case <-e.stop:
			return
		}
	}
}

// IsEnabled returns true when the flag is on for the current user.
// Always returns false for unknown flags (fail closed).
func (e *Engine) IsEnabled(c *gin.Context, name string) bool {
	return e.evaluate(userIDFrom(c), name) == "enabled"
}

// Variant returns the assigned variant for an A/B flag. For boolean
// flags, returns "enabled" or "disabled". For unknown flags, returns
// the empty string.
func (e *Engine) Variant(c *gin.Context, name string) string {
	return e.evaluate(userIDFrom(c), name)
}

// IsEnabledForUser is the explicit form for backend code that has the
// user_id directly (e.g. cron jobs operating on a specific user).
func (e *Engine) IsEnabledForUser(userID, name string) bool {
	return e.evaluate(userID, name) == "enabled"
}

// VariantForUser is the explicit form of Variant.
func (e *Engine) VariantForUser(userID, name string) string {
	return e.evaluate(userID, name)
}

// evaluate is the core decision routine. Returns:
//
//	""           — unknown flag
//	"disabled"   — flag exists but rules deny the user
//	"enabled"    — boolean flag passed; user is in the rollout
//	"<variant>"  — A/B flag passed; the user's bucket maps to this variant
//
// Lock discipline: the read lock is held only long enough to copy the
// flag struct + ID. All decision logic (date checks, allowlist scans,
// bucketing) runs unlocked. Under sustained read load this turns the
// flag check into a near-zero-contention path.
func (e *Engine) evaluate(userID, name string) string {
	e.mu.RLock()
	cached, ok := e.flags[name]
	if !ok {
		e.mu.RUnlock()
		return ""
	}
	flagID := cached.ID
	enabled := cached.Enabled
	rulesJSON := cached.Rules
	e.mu.RUnlock()

	if !enabled {
		return "disabled"
	}

	// Decode rules outside the lock — JSON parsing is the slowest
	// part of the flag check and we don't want it serializing.
	flagForParse := models.FeatureFlag{Rules: rulesJSON}
	rules := flagForParse.ParsedRules()

	// Date window — out-of-window short-circuits before bucketing.
	now := time.Now()
	if rules.EnabledFrom != nil && now.Before(*rules.EnabledFrom) {
		return "disabled"
	}
	if rules.EnabledUntil != nil && now.After(*rules.EnabledUntil) {
		return "disabled"
	}

	// Blocklist always wins.
	for _, b := range rules.BlocklistUserIDs {
		if b == userID {
			return "disabled"
		}
	}

	// Allowlist (when non-empty) restricts to the listed users.
	// Skip the percentage roll for allowlisted users — they always
	// see it, that's the point.
	allowlistMode := len(rules.AllowlistUserIDs) > 0
	allowed := false
	for _, a := range rules.AllowlistUserIDs {
		if a == userID {
			allowed = true
			break
		}
	}
	if allowlistMode && !allowed {
		return "disabled"
	}

	bucket := bucketFor(userID, name)

	// A/B mode — assign variant by bucket.
	if len(rules.Variants) > 0 {
		v := rules.Variants[bucket%len(rules.Variants)]
		e.trackExposure(flagID, name, userID, v)
		return v
	}

	// Boolean mode — percentage rollout. Allowlisted users always
	// pass; everyone else is gated by the percentage.
	if allowed || bucket < rules.RolloutPercentage {
		e.trackExposure(flagID, name, userID, "enabled")
		return "enabled"
	}
	e.trackExposure(flagID, name, userID, "disabled")
	return "disabled"
}

// trackExposure records the flag check asynchronously. Never blocks
// the request path; logs failures.
func (e *Engine) trackExposure(flagID, flagName, userID, variant string) {
	if userID == "" {
		// Anonymous exposures pollute the table without buying us
		// anything (we can't link them to a user later). Skip.
		return
	}
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		err := e.db.WithContext(ctx).Create(&models.FlagExposure{
			FlagID:   flagID,
			FlagName: flagName,
			UserID:   userID,
			Variant:  variant,
		}).Error
		if err != nil {
			log.Printf("[flags] exposure insert failed: %v", err)
		}
	}()
}

// bucketFor hashes (userID || ":" || flagName) and returns the bucket
// 0..99. Same input always produces the same bucket — that's what
// makes the assignment sticky.
//
// We use SHA-256 (not Go's default hash) because it's stable across
// process restarts + Go versions. FNV would be faster but Grit isn't
// running flag checks in a hot loop — sub-microsecond cost is fine.
func bucketFor(userID, name string) int {
	if userID == "" {
		// Anonymous users get a uniform random bucket. We avoid
		// UnixNano%100 because nanosecond timing is biased toward
		// recent buckets under high QPS. crypto/rand gives us a
		// uniform draw without that artifact.
		var b [4]byte
		if _, err := rand.Read(b[:]); err != nil {
			// rand should never fail on a healthy OS; if it does,
			// fall back to bucket 0 so behavior is deterministic.
			return 0
		}
		return int(binary.BigEndian.Uint32(b[:]) % 100)
	}
	h := sha256.Sum256([]byte(userID + ":" + name))
	return int(binary.BigEndian.Uint32(h[:4]) % 100)
}

// userIDFrom reads "user_id" from the gin context (set by the auth
// middleware). Empty string for anonymous requests.
func userIDFrom(c *gin.Context) string {
	if v, ok := c.Get("user_id"); ok {
		s, _ := v.(string)
		return s
	}
	return ""
}
