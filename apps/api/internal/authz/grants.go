package authz

import (
	"sync"
	"sync/atomic"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// grantCache memoises user -> grants for the lifetime of a generation.
//
// Authorization runs on every request, so hitting the database twice per call
// is a real cost. Rather than expire by time (which makes a revoked permission
// linger for up to the TTL), the whole cache is dropped whenever roles change —
// see Invalidate. Revocation is therefore immediate.
var (
	grantCache sync.Map // userID -> []string
	generation atomic.Uint64
)

// Invalidate drops every cached grant set. Call it after any write that could
// change authorization: role grants edited, role deleted, user's roles changed.
func Invalidate() {
	generation.Add(1)
	grantCache.Range(func(k, _ any) bool {
		grantCache.Delete(k)
		return true
	})
}

type cachedGrants struct {
	gen    uint64
	grants []string
}

// GrantsFor returns every permission grant the user holds, unioned across their
// roles. Wildcards are preserved — pass the result to Granted, which understands
// them; do not compare strings directly.
func GrantsFor(db *gorm.DB, userID string) ([]string, error) {
	if userID == "" {
		return nil, nil
	}

	gen := generation.Load()
	if v, ok := grantCache.Load(userID); ok {
		if c, ok := v.(cachedGrants); ok && c.gen == gen {
			return c.grants, nil
		}
	}

	grants, err := resolveGrants(db, userID)
	if err != nil {
		return nil, err
	}
	grantCache.Store(userID, cachedGrants{gen: gen, grants: grants})
	return grants, nil
}

func resolveGrants(db *gorm.DB, userID string) ([]string, error) {
	var roles []models.Role
	err := db.
		Joins("JOIN user_roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ?", userID).
		Find(&roles).Error
	if err != nil {
		return nil, err
	}

	// Backwards compatibility: an app upgrading from role-string authorization
	// has no user_roles rows yet. Fall back to the role named on the user so
	// existing admins don't lose access the moment permissions ship.
	if len(roles) == 0 {
		var user models.User
		if err := db.Select("id", "role").Where("id = ?", userID).First(&user).Error; err != nil {
			if err == gorm.ErrRecordNotFound {
				return nil, nil
			}
			return nil, err
		}
		if user.Role == "" {
			return nil, nil
		}
		if err := db.Where("name = ?", user.Role).Find(&roles).Error; err != nil {
			return nil, err
		}
	}

	seen := map[string]bool{}
	var out []string
	for _, r := range roles {
		for _, g := range r.GrantsList() {
			if seen[g] {
				continue
			}
			seen[g] = true
			out = append(out, g)
		}
	}
	return out, nil
}

// Can reports whether the user holds the permission.
// Prefer the middleware guard for routes; use this for conditional logic inside
// a handler (e.g. hiding fields).
func Can(db *gorm.DB, userID, permission string) bool {
	grants, err := GrantsFor(db, userID)
	if err != nil {
		return false // fail closed
	}
	return Granted(grants, permission)
}
