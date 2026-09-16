package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/markbates/goth"
	"github.com/markbates/goth/providers/openidConnect"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// SSORegistry holds one configured OIDC provider per enabled connection.
//
// It deliberately does NOT use goth's package-level provider map. That map is
// written by goth.UseProviders and read on every login with no lock, so an
// admin saving a connection while somebody signs in is a concurrent map
// read/write — which in Go is a fatal runtime error that takes the process
// down, not a race the detector merely complains about. Owning the map here
// with an RWMutex makes runtime reconfiguration safe.
//
// Building a provider performs OIDC discovery (a network call to the IdP), so
// providers are built once at boot and rebuilt only when a connection changes.
type SSORegistry struct {
	mu        sync.RWMutex
	providers map[string]*openidConnect.Provider
	appURL    string
}

// ErrSSOConnectionUnavailable is returned when a slug has no live provider —
// either it was never configured, it's disabled, or discovery failed at boot.
var ErrSSOConnectionUnavailable = errors.New("sso connection unavailable")

func NewSSORegistry(appURL string) *SSORegistry {
	return &SSORegistry{
		providers: map[string]*openidConnect.Provider{},
		appURL:    strings.TrimRight(appURL, "/"),
	}
}

// CallbackURL is where the IdP sends the user back. It is deliberately
// UNVERSIONED (/api/auth/..., not /api/v1/auth/...) because this exact string
// is registered as a redirect URI in the customer's IdP console — a value they
// control, not us. Versioning it would break every existing connection the day
// the API version bumps. The unversioned path is re-dispatched internally.
func (r *SSORegistry) CallbackURL(slug string) string {
	return r.appURL + "/api/auth/sso/" + slug + "/callback"
}

// Reload rebuilds the whole registry from the database. Called at boot and
// after any connection is created, updated or deleted. A connection whose
// discovery fails is logged and skipped rather than failing the others — one
// customer's misconfigured IdP must not stop everyone else signing in.
func (r *SSORegistry) Reload(db *gorm.DB) []error {
	var conns []models.SSOConnection
	if err := db.Where("enabled = ?", true).Find(&conns).Error; err != nil {
		return []error{fmt.Errorf("loading sso connections: %w", err)}
	}

	built := map[string]*openidConnect.Provider{}
	var errs []error
	for _, conn := range conns {
		p, err := r.build(conn)
		if err != nil {
			errs = append(errs, fmt.Errorf("sso %q: %w", conn.Slug, err))
			continue
		}
		built[conn.Slug] = p
	}

	r.mu.Lock()
	r.providers = built
	r.mu.Unlock()
	return errs
}

func (r *SSORegistry) build(conn models.SSOConnection) (*openidConnect.Provider, error) {
	secret := strings.TrimSpace(string(conn.ClientSecret))
	if conn.ClientID == "" || secret == "" {
		return nil, errors.New("client id and secret are required")
	}
	// NewNamed suffixes the name with "-oidc" internally; the slug is what we
	// key on here, so callers never have to know that.
	p, err := openidConnect.NewNamed(
		conn.Slug,
		conn.ClientID,
		secret,
		r.CallbackURL(conn.Slug),
		conn.Discovery(),
		conn.ScopeList()...,
	)
	if err != nil {
		return nil, fmt.Errorf("openid discovery: %w", err)
	}
	return p, nil
}

// Provider returns the live provider for a slug.
func (r *SSORegistry) Provider(slug string) (*openidConnect.Provider, error) {
	r.mu.RLock()
	p, ok := r.providers[slug]
	r.mu.RUnlock()
	if !ok {
		return nil, ErrSSOConnectionUnavailable
	}
	return p, nil
}

// Count reports how many providers are live — used by the admin UI to
// distinguish "no connections" from "connections that all failed discovery".
func (r *SSORegistry) Count() int {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return len(r.providers)
}

// ConnectionForEmail resolves the connection an address should authenticate
// against, matching on the domain after "@". Returns nil when nothing matches,
// which the caller should treat as "fall back to password login" rather than an
// error — most users of most apps are not SSO users.
func ConnectionForEmail(db *gorm.DB, email string) (*models.SSOConnection, error) {
	at := strings.LastIndex(email, "@")
	if at < 0 || at == len(email)-1 {
		return nil, nil
	}
	domain := strings.ToLower(strings.TrimSpace(email[at+1:]))
	if domain == "" {
		return nil, nil
	}

	var conns []models.SSOConnection
	if err := db.Where("enabled = ?", true).Find(&conns).Error; err != nil {
		return nil, err
	}
	for i := range conns {
		for _, d := range conns[i].DomainList() {
			if d == domain {
				return &conns[i], nil
			}
		}
	}
	return nil, nil
}

// GroupRoleNames maps the IdP groups on a login to local role names, using the
// connection's GroupMappings. Unmapped groups are ignored — an IdP typically
// carries far more groups than an app has roles.
func GroupRoleNames(conn *models.SSOConnection, groups []string) []string {
	raw := strings.TrimSpace(conn.GroupMappings)
	if raw == "" || len(groups) == 0 {
		return nil
	}
	mapping := map[string]string{}
	if err := json.Unmarshal([]byte(raw), &mapping); err != nil {
		// Fail closed: a malformed mapping grants nothing rather than
		// everything, matching how Role.GrantsList treats bad JSON.
		return nil
	}

	lower := map[string]string{}
	for k, v := range mapping {
		lower[strings.ToLower(strings.TrimSpace(k))] = v
	}

	seen := map[string]bool{}
	out := []string{}
	for _, g := range groups {
		if role, ok := lower[strings.ToLower(strings.TrimSpace(g))]; ok && !seen[role] {
			seen[role] = true
			out = append(out, role)
		}
	}
	return out
}

// ClaimGroups pulls the group list out of a raw claims map. IdPs disagree on
// shape — a JSON array for Okta/Keycloak, occasionally a single string — so
// both are accepted.
func ClaimGroups(raw map[string]interface{}, claim string) []string {
	if claim == "" {
		claim = "groups"
	}
	v, ok := raw[claim]
	if !ok {
		return nil
	}
	switch t := v.(type) {
	case []interface{}:
		out := []string{}
		for _, item := range t {
			if s, ok := item.(string); ok && s != "" {
				out = append(out, s)
			}
		}
		return out
	case []string:
		return t
	case string:
		if t == "" {
			return nil
		}
		return []string{t}
	}
	return nil
}

// TouchConnection records that a connection was just used to sign somebody in.
func TouchConnection(db *gorm.DB, id string) {
	now := time.Now()
	db.Model(&models.SSOConnection{}).Where("id = ?", id).Update("last_used_at", now)
}

// providerSession is the goth session marshalled between the redirect to the
// IdP and the callback. Kept as its own type so the handler can be explicit
// about what it stores in the cookie.
type providerSession = goth.Session
