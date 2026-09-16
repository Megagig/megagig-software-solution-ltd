// Package authz contains the ownership-check helpers Grit uses to
// prevent IDOR (Insecure Direct Object Reference) — OWASP Top 10:2025
// A01 Broken Access Control's most common concrete form.
//
// The cardinal rule (from PHASE 2 §4.3 of the security course): every
// object access must be authorised against the current user, server-side.
// authz.MustOwn enforces that with a single call.
//
// Usage:
//
//	var invoice models.Invoice
//	if err := authz.MustOwn(c, db, &invoice, c.Param("id")); err != nil {
//	    return // helper has already written 404 / 401
//	}
//	// invoice belongs to c.MustGet("user_id"). Safe to use.
package authz

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Ownable is implemented by domain models whose ownership is identified
// by a single user-id column. For models with team/tenant scoping use
// CheckScope instead.
type Ownable interface {
	GetOwnerID() string
}

// ErrNotFound and ErrForbidden are returned by the helpers below so
// callers can branch (e.g. log differently) — but the HTTP responses
// they produce are deliberately identical (404 NOT_FOUND) to avoid
// leaking the existence of rows the caller doesn't own.
var (
	ErrNotFound  = errors.New("authz: not found")
	ErrForbidden = errors.New("authz: forbidden")
)

// MustOwn loads the row by id and verifies that the authenticated user
// is its owner. On any failure it writes a 404 response and returns a
// non-nil error so the caller can return immediately.
//
// The 404 (not 403) is intentional. Returning 403 confirms the row
// exists, which lets attackers enumerate IDs.
func MustOwn(c *gin.Context, db *gorm.DB, dest Ownable, id string) error {
	userID, ok := c.Get("user_id")
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"code": "UNAUTHORIZED", "message": "Authentication required"},
		})
		return ErrForbidden
	}

	if err := db.Where("id = ?", id).First(dest).Error; err != nil {
		writeNotFound(c)
		return ErrNotFound
	}

	if dest.GetOwnerID() != userID {
		writeNotFound(c) // 404, not 403 — see comment above
		return ErrForbidden
	}
	return nil
}

// CheckScope verifies a (column, value) pair matches the current user's
// authoritative scope (e.g. team_id, tenant_id). Use this when ownership
// is by membership rather than a single user_id column.
func CheckScope(c *gin.Context, scopeKey, expectedValue string) bool {
	got, ok := c.Get(scopeKey)
	return ok && got == expectedValue
}

// RequireRoles returns a gin middleware that 403s when the authenticated
// user's role isn't in the allowlist. This is a stricter sibling of the
// generic Auth middleware — use it on admin-only routes.
func RequireRoles(roles ...string) gin.HandlerFunc {
	allowed := make(map[string]struct{}, len(roles))
	for _, r := range roles {
		allowed[r] = struct{}{}
	}
	return func(c *gin.Context) {
		role, _ := c.Get("user_role")
		if _, ok := allowed[asString(role)]; !ok {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
				"error": gin.H{"code": "FORBIDDEN", "message": "Insufficient role"},
			})
			return
		}
		c.Next()
	}
}

func asString(v interface{}) string {
	if v == nil {
		return ""
	}
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

func writeNotFound(c *gin.Context) {
	c.JSON(http.StatusNotFound, gin.H{
		"error": gin.H{"code": "NOT_FOUND", "message": "Resource not found"},
	})
}
