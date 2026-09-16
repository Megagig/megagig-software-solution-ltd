package handlers

import (
	"testing"

	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"megagig-software-solution/apps/api/internal/authz"
	"megagig-software-solution/apps/api/internal/models"
)

func syncDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.User{}, &models.Role{}, &models.UserRole{}))
	require.NoError(t, models.SeedRoles(db))
	return db
}

// Changing the role dropdown must actually change what the user can do, even
// when they already hold an explicit assignment. Grant resolution prefers
// user_roles, so without the sync this update is a silent no-op.
func TestSyncUserRoleAssignment_ChangesEffectivePermissions(t *testing.T) {
	db := syncDB(t)
	u := models.User{ID: "u1", Email: "u1@x.com", FirstName: "U", LastName: "1", Role: models.RoleAdmin}
	require.NoError(t, db.Create(&u).Error)

	// Start as ADMIN via an explicit assignment.
	require.NoError(t, syncUserRoleAssignment(db, u.ID, models.RoleAdmin))
	g, _ := authz.GrantsFor(db, u.ID)
	require.True(t, authz.Granted(g, "users.delete"), "admin should hold users.delete")

	// Demote to USER — the effective permissions must follow.
	require.NoError(t, syncUserRoleAssignment(db, u.ID, models.RoleUser))
	g, _ = authz.GrantsFor(db, u.ID)
	assert.False(t, authz.Granted(g, "users.delete"), "demotion did not take effect")

	// Exactly one assignment, not an accumulation.
	var n int64
	db.Model(&models.UserRole{}).Where("user_id = ?", u.ID).Count(&n)
	assert.Equal(t, int64(1), n)
}

// An unrecognised legacy role name must not fail the update; resolution falls
// back to the users.role string.
func TestSyncUserRoleAssignment_UnknownNameIsTolerated(t *testing.T) {
	db := syncDB(t)
	u := models.User{ID: "u2", Email: "u2@x.com", FirstName: "U", LastName: "2", Role: "LEGACY_THING"}
	require.NoError(t, db.Create(&u).Error)

	require.NoError(t, syncUserRoleAssignment(db, u.ID, "LEGACY_THING"))

	var n int64
	db.Model(&models.UserRole{}).Where("user_id = ?", u.ID).Count(&n)
	assert.Equal(t, int64(0), n, "unknown role should leave no assignment")
}
