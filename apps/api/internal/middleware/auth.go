package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/authz"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/services"
)

// Auth creates a JWT authentication middleware.
func Auth(db *gorm.DB, authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Resolve the access token. The HttpOnly cookie path is the
		// recommended flow for browser clients — JS never sees the token,
		// so XSS cannot exfiltrate it. The Authorization: Bearer header
		// path is the fallback for native mobile / desktop clients that
		// can't or don't want to use cookies.
		token := ""
		if cookieValue, err := c.Cookie("grit_access"); err == nil && cookieValue != "" {
			token = cookieValue
		} else if authHeader := c.GetHeader("Authorization"); authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				c.JSON(http.StatusUnauthorized, gin.H{
					"error": gin.H{
						"code":    "UNAUTHORIZED",
						"message": "Invalid authorization header format",
					},
				})
				c.Abort()
				return
			}
			token = parts[1]
		}

		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Authentication required",
				},
			})
			c.Abort()
			return
		}

		claims, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Invalid or expired token",
				},
			})
			c.Abort()
			return
		}

		// Load user from database.
		// Use Where("id = ?") rather than First(&user, id) — GORM's shorthand
		// emits the bare value into the WHERE clause and Postgres rejects UUID
		// primary keys with "trailing junk after numeric literal".
		var user models.User
		if err := db.Where("id = ?", claims.UserID).First(&user).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "User not found",
				},
			})
			c.Abort()
			return
		}

		if !user.Active {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "ACCOUNT_DISABLED",
					"message": "Your account has been disabled",
				},
			})
			c.Abort()
			return
		}

		c.Set("user", user)
		c.Set("user_id", user.ID)
		c.Set("user_email", user.Email)
		c.Set("user_role", user.Role)

		// Resolve the caller's permission grants once per request so route
		// guards and handlers don't each hit the database. authz.GrantsFor is
		// cached and invalidated on role changes, so this is usually free.
		// A failure here is not fatal: the request continues with no grants and
		// role-name checks still apply, which fails closed rather than 500ing
		// every route the moment the roles table has a problem.
		if grants, err := authz.GrantsFor(db, user.ID); err == nil {
			c.Set("user_grants", grants)
		}

		c.Next()
	}
}

// RequireRole guards a route by role name, permission, or both.
//
// Each argument is either a legacy role name ("ADMIN") or a permission key
// prefixed with "perm:" ("perm:users.delete"). Access is granted if ANY
// argument matches — so the two styles can be mixed during a migration:
//
//	protected.Use(middleware.RequireRole("ADMIN", "perm:users.delete"))
//
// The signature is unchanged on purpose: every existing RequireRole("ADMIN")
// call site keeps working untouched, and permissions can be adopted route by
// route instead of in one breaking sweep.
func RequireRole(rolesOrPerms ...string) gin.HandlerFunc {
	// Split once at construction rather than per request.
	var roles, perms []string
	for _, arg := range rolesOrPerms {
		if strings.HasPrefix(arg, "perm:") {
			perms = append(perms, strings.TrimPrefix(arg, "perm:"))
			continue
		}
		roles = append(roles, arg)
	}

	return func(c *gin.Context) {
		// Permission check first — it's the model we want callers to move to.
		if len(perms) > 0 {
			if grants, ok := c.Get("user_grants"); ok {
				if list, ok := grants.([]string); ok {
					for _, p := range perms {
						if authz.Granted(list, p) {
							c.Next()
							return
						}
					}
				}
			}
		}

		// No permission matched; fall back to the legacy role names.
		if len(roles) == 0 {
			c.JSON(http.StatusForbidden, gin.H{
				"error": gin.H{
					"code":    "FORBIDDEN",
					"message": "You do not have permission to perform this action",
				},
			})
			c.Abort()
			return
		}

		userRole, exists := c.Get("user_role")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": gin.H{
					"code":    "UNAUTHORIZED",
					"message": "Not authenticated",
				},
			})
			c.Abort()
			return
		}

		role, ok := userRole.(string)
		if !ok {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{
					"code":    "INTERNAL_ERROR",
					"message": "Invalid user role",
				},
			})
			c.Abort()
			return
		}

		for _, r := range roles {
			if role == r {
				c.Next()
				return
			}
		}

		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{
				"code":    "FORBIDDEN",
				"message": "You do not have permission to access this resource",
			},
		})
		c.Abort()
	}
}
