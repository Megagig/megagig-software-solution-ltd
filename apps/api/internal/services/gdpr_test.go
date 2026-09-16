package services

import (
	"testing"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

func gdprDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(
		&models.User{}, &models.Upload{}, &models.Session{}, &models.UserActivity{},
		&models.DashboardLayout{}, &models.DeletionJournal{},
		&models.PasswordResetToken{}, &models.UserRole{}, &models.TwoFactorConfig{},
		&models.TrustedDevice{}, &models.TOTPPendingToken{}, &models.Notification{},
	); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return db
}

func seedUserWithData(t *testing.T, db *gorm.DB, email string) models.User {
	t.Helper()
	u := models.User{FirstName: "Real", LastName: "Person", Email: email, Password: "hash", Active: true}
	if err := db.Create(&u).Error; err != nil {
		t.Fatalf("create user: %v", err)
	}
	db.Create(&models.Upload{UserID: u.ID, Filename: "a.png"})
	db.Create(&models.Upload{UserID: u.ID, Filename: "b.png"})
	db.Create(&models.Session{UserID: u.ID})
	db.Create(&models.UserActivity{UserID: u.ID, Action: "login", Summary: "signed in"})
	return u
}

func TestExportGathersEverything(t *testing.T) {
	db := gdprDB(t)
	u := seedUserWithData(t, db, "export@test.dev")

	bundle, err := ExportUserData(db, u.ID)
	if err != nil {
		t.Fatalf("export: %v", err)
	}
	if bundle.Profile.Email != "export@test.dev" {
		t.Errorf("profile email = %q", bundle.Profile.Email)
	}
	if len(bundle.Uploads) != 2 {
		t.Errorf("uploads = %d, want 2", len(bundle.Uploads))
	}
	if len(bundle.Sessions) != 1 {
		t.Errorf("sessions = %d, want 1", len(bundle.Sessions))
	}
	if len(bundle.Activity) != 1 {
		t.Errorf("activity = %d, want 1", len(bundle.Activity))
	}
	if bundle.Profile.Password != "" {
		t.Errorf("export leaked the password hash")
	}
}

func TestExportUnknownUser(t *testing.T) {
	db := gdprDB(t)
	if _, err := ExportUserData(db, "nope"); err != ErrUserNotFound {
		t.Errorf("err = %v, want ErrUserNotFound", err)
	}
}

func TestEraseDeletesChildrenAndAnonymizes(t *testing.T) {
	db := gdprDB(t)
	u := seedUserWithData(t, db, "erase@test.dev")

	j, err := EraseUser(db, u.ID, "admin-1", "admin@test.dev", "user request")
	if err != nil {
		t.Fatalf("erase: %v", err)
	}

	// Unscoped counts PHYSICAL rows. A soft delete would leave the row (and its
	// PII) in place while a plain Count hid it — so this must be Unscoped to prove
	// the data is actually gone, not just flagged deleted.
	var uploads, sessions int64
	db.Unscoped().Model(&models.Upload{}).Where("user_id = ?", u.ID).Count(&uploads)
	db.Unscoped().Model(&models.Session{}).Where("user_id = ?", u.ID).Count(&sessions)
	if uploads != 0 || sessions != 0 {
		t.Errorf("child rows survived erasure (soft-deleted?): uploads=%d sessions=%d", uploads, sessions)
	}

	var after models.User
	db.First(&after, "id = ?", u.ID)
	if after.Email == "erase@test.dev" || after.FirstName == "Real" {
		t.Errorf("user was not anonymized: %+v", after)
	}
	if after.Email != "erased-"+u.ID+"@deleted.invalid" {
		t.Errorf("tombstone email = %q", after.Email)
	}

	if j.RecordsAffected != 3 { // 2 uploads + 1 session
		t.Errorf("records affected = %d, want 3", j.RecordsAffected)
	}
}

func TestEraseKeepsActivityLog(t *testing.T) {
	db := gdprDB(t)
	u := seedUserWithData(t, db, "keep@test.dev")

	if _, err := EraseUser(db, u.ID, "admin-1", "admin@test.dev", ""); err != nil {
		t.Fatalf("erase: %v", err)
	}
	// The activity row must remain — it carries only the UUID, now anonymized.
	var acts int64
	db.Model(&models.UserActivity{}).Where("user_id = ?", u.ID).Count(&acts)
	if acts != 1 {
		t.Errorf("activity rows = %d, want 1 (audit trail must survive)", acts)
	}
}

func TestJournalChainVerifies(t *testing.T) {
	db := gdprDB(t)
	for _, e := range []string{"a@t.dev", "b@t.dev", "c@t.dev"} {
		u := seedUserWithData(t, db, e)
		if _, err := EraseUser(db, u.ID, "admin-1", "admin@test.dev", ""); err != nil {
			t.Fatalf("erase: %v", err)
		}
	}
	v, err := VerifyJournalChain(db)
	if err != nil {
		t.Fatalf("verify: %v", err)
	}
	if !v.Verified || v.Count != 3 {
		t.Errorf("verification = %+v, want verified with 3 rows", v)
	}
}

func TestJournalTamperDetected(t *testing.T) {
	db := gdprDB(t)
	u := seedUserWithData(t, db, "tamper@t.dev")
	if _, err := EraseUser(db, u.ID, "admin-1", "admin@test.dev", "before"); err != nil {
		t.Fatalf("erase: %v", err)
	}
	// Forge the record: change the reason after the fact without rehashing.
	if err := db.Model(&models.DeletionJournal{}).Where("deleted_user_id = ?", u.ID).
		Update("reason", "after").Error; err != nil {
		t.Fatalf("tamper: %v", err)
	}
	v, _ := VerifyJournalChain(db)
	if v.Verified {
		t.Errorf("tampering was not detected")
	}
}
