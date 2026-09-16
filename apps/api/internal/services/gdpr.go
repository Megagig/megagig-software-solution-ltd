package services

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"time"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// ErrUserNotFound is returned when the target of an export or erasure doesn't
// exist (or was already erased and hard-deleted).
var ErrUserNotFound = errors.New("user not found")

// UserExport is the right-to-access bundle: everything the system holds about
// one person, gathered from every table that references them.
type UserExport struct {
	GeneratedAt time.Time               `json:"generated_at"`
	Profile     models.User             `json:"profile"`
	Uploads     []models.Upload         `json:"uploads"`
	Sessions    []models.Session        `json:"sessions"`
	Activity    []models.UserActivity   `json:"activity"`
	Layout      *models.DashboardLayout `json:"dashboard_layout,omitempty"`
	TwoFactor   struct {
		Enabled bool `json:"enabled"`
	} `json:"two_factor"`
}

// ExportUserData collects a full copy of a user's data. The User's Password and
// OAuth ids are hidden by their json:"-" tags, so the bundle carries the
// person's data without leaking secrets.
func ExportUserData(db *gorm.DB, userID string) (*UserExport, error) {
	var user models.User
	if err := db.First(&user, "id = ?", userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	// Scrub secrets from the in-memory copy too. The json:"-" tags keep these out
	// of the HTTP response, but clearing them here means no code path can leak the
	// password hash or OAuth ids out of the bundle.
	user.Password = ""
	user.GoogleID = ""
	user.GithubID = ""

	out := &UserExport{GeneratedAt: time.Now().UTC(), Profile: user}
	db.Where("user_id = ?", userID).Find(&out.Uploads)
	db.Where("user_id = ?", userID).Find(&out.Sessions)
	db.Where("user_id = ?", userID).Order("created_at desc").Find(&out.Activity)

	var layout models.DashboardLayout
	if err := db.First(&layout, "user_id = ?", userID).Error; err == nil {
		out.Layout = &layout
	}
	var tf models.TwoFactorConfig
	if err := db.First(&tf, "user_id = ?", userID).Error; err == nil {
		out.TwoFactor.Enabled = true
	}
	return out, nil
}

// erasableTables are the tables whose rows exist only to serve the user and
// carry no independent compliance value — safe to hard-delete on erasure.
func erasableTargets() []struct {
	name  string
	model interface{}
} {
	return []struct {
		name  string
		model interface{}
	}{
		{"uploads", &models.Upload{}},
		{"sessions", &models.Session{}},
		{"password_reset_tokens", &models.PasswordResetToken{}},
		{"user_roles", &models.UserRole{}},
		{"two_factor_configs", &models.TwoFactorConfig{}},
		{"trusted_devices", &models.TrustedDevice{}},
		{"totp_pending_tokens", &models.TOTPPendingToken{}},
		{"dashboard_layouts", &models.DashboardLayout{}},
		{"notifications", &models.Notification{}},
	}
}

// EraseUser fulfils a right-to-erasure request in one transaction: hard-delete
// the user's child PII, anonymize the user row, and append a tamper-evident
// journal entry. The activity log is deliberately left untouched — its rows hold
// only a UUID, so scrubbing the user row anonymizes them too, and editing them
// would break the audit hash chain.
func EraseUser(db *gorm.DB, targetID, actorID, actorEmail, reason string) (*models.DeletionJournal, error) {
	var journal *models.DeletionJournal

	err := db.Transaction(func(tx *gorm.DB) error {
		var user models.User
		if err := tx.First(&user, "id = ?", targetID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrUserNotFound
			}
			return err
		}

		// Unscoped is essential: several of these models carry gorm.DeletedAt, and a
		// normal Delete would only *soft*-delete — setting deleted_at while the row
		// (and its PII) physically remains. That is not erasure. Unscoped removes the
		// row for real, and counts physical rows so the journal reflects what was
		// actually destroyed.
		counts := map[string]int64{}
		total := 0
		for _, t := range erasableTargets() {
			var n int64
			if err := tx.Unscoped().Model(t.model).Where("user_id = ?", targetID).Count(&n).Error; err != nil {
				return fmt.Errorf("counting %s: %w", t.name, err)
			}
			if n > 0 {
				if err := tx.Unscoped().Where("user_id = ?", targetID).Delete(t.model).Error; err != nil {
					return fmt.Errorf("deleting %s: %w", t.name, err)
				}
			}
			counts[t.name] = n
			total += int(n)
		}

		// Anonymize the user row in place: scrub every PII column, keep the id so
		// references resolve to a tombstone. The email keeps a unique, non-routable
		// value so the unique index stays satisfiable if the row is re-read.
		tomb := "erased-" + user.ID + "@deleted.invalid"
		if err := tx.Model(&models.User{}).Where("id = ?", targetID).Updates(map[string]interface{}{
			"first_name":  "Erased",
			"last_name":   "User",
			"email":       tomb,
			"password":    "",
			"avatar":      "",
			"job_title":   "",
			"bio":         "",
			"ip_address":  "",
			"mac_address": "",
			"google_id":   "",
			"github_id":   "",
			"active":      false,
			"role":        "USER",
		}).Error; err != nil {
			return fmt.Errorf("anonymizing user: %w", err)
		}

		countsJSON, _ := json.Marshal(counts)

		var prev models.DeletionJournal
		prevHash := ""
		if err := tx.Order("created_at desc, id desc").First(&prev).Error; err == nil {
			prevHash = prev.Hash
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}

		j := &models.DeletionJournal{
			DeletedUserID:   targetID,
			ActorID:         actorID,
			ActorEmail:      actorEmail,
			Reason:          reason,
			RecordsAffected: total,
			Counts:          string(countsJSON),
			PrevHash:        prevHash,
			CreatedAt:       time.Now().UTC(),
		}
		j.Hash = JournalHash(prevHash, j)
		if err := tx.Create(j).Error; err != nil {
			return err
		}
		journal = j
		return nil
	})
	if err != nil {
		return nil, err
	}
	return journal, nil
}

// canonicalJournal is the stable serialization hashed into the chain. It
// excludes ID (random, uncorrelated) and PrevHash/Hash (derived) so the digest
// depends only on the entry's content.
func canonicalJournal(j *models.DeletionJournal) string {
	return fmt.Sprintf("%s|%s|%s|%s|%d|%s|%d",
		j.DeletedUserID, j.ActorID, j.ActorEmail, j.Reason,
		j.RecordsAffected, j.Counts, j.CreatedAt.UTC().Unix())
}

// JournalHash returns hex(sha256(prevHash || canonical(entry))) — the same
// construction the activity log uses, so the two chains verify identically.
func JournalHash(prevHash string, j *models.DeletionJournal) string {
	sum := sha256.Sum256([]byte(prevHash + canonicalJournal(j)))
	return hex.EncodeToString(sum[:])
}

// JournalVerification is the result of replaying the deletion journal.
type JournalVerification struct {
	Verified bool   `json:"verified"`
	Count    int    `json:"count"`
	BrokenAt string `json:"broken_at,omitempty"` // id of the first row that fails
}

// VerifyJournalChain replays the whole journal in order and confirms each row's
// stored hash equals a fresh recomputation, and that each PrevHash links to the
// row before it. Any post-hoc edit, reorder, or deletion surfaces here.
func VerifyJournalChain(db *gorm.DB) (*JournalVerification, error) {
	var rows []models.DeletionJournal
	if err := db.Order("created_at asc, id asc").Find(&rows).Error; err != nil {
		return nil, err
	}
	// Guard against a tie on created_at producing a nondeterministic order by
	// sorting on the same keys the writer used.
	sort.SliceStable(rows, func(a, b int) bool {
		if rows[a].CreatedAt.Equal(rows[b].CreatedAt) {
			return rows[a].ID < rows[b].ID
		}
		return rows[a].CreatedAt.Before(rows[b].CreatedAt)
	})

	prevHash := ""
	for i := range rows {
		r := rows[i]
		if r.PrevHash != prevHash {
			return &JournalVerification{Verified: false, Count: len(rows), BrokenAt: r.ID}, nil
		}
		if JournalHash(prevHash, &r) != r.Hash {
			return &JournalVerification{Verified: false, Count: len(rows), BrokenAt: r.ID}, nil
		}
		prevHash = r.Hash
	}
	return &JournalVerification{Verified: true, Count: len(rows)}, nil
}
