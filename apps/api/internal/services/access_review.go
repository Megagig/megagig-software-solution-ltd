package services

import (
	"errors"
	"fmt"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

var (
	// ErrReviewClosed is returned when a decision is attempted on a review that
	// has already been signed off. A completed review is immutable evidence.
	ErrReviewClosed = errors.New("access review is already completed")
	// ErrReviewIncomplete is returned when completion is attempted while items
	// are still pending. You cannot certify a review you have not finished.
	ErrReviewIncomplete = errors.New("access review still has undecided items")
	// ErrItemDecided guards the one-way door: a revoked grant is already gone, so
	// re-approving it here would record a certification the system can't honour.
	ErrItemDecided = errors.New("this item has already been revoked and cannot be changed")
)

// OpenAccessReview snapshots every current role assignment into a new campaign
// of pending items. The snapshot copies user email and role name so the record
// stays legible after later deletions.
func OpenAccessReview(db *gorm.DB, name, note, createdBy, createdByEmail string) (*models.AccessReview, error) {
	review := &models.AccessReview{
		Name:           name,
		Note:           note,
		Status:         "open",
		CreatedBy:      createdBy,
		CreatedByEmail: createdByEmail,
	}

	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(review).Error; err != nil {
			return err
		}

		// Join UserRole to users and roles so the snapshot carries human-readable
		// identifiers, not just opaque ids.
		type grant struct {
			UserID    string
			UserEmail string
			RoleID    string
			RoleName  string
		}
		var grants []grant
		if err := tx.Table("user_roles").
			Select("user_roles.user_id, users.email AS user_email, user_roles.role_id, roles.name AS role_name").
			Joins("LEFT JOIN users ON users.id = user_roles.user_id").
			Joins("LEFT JOIN roles ON roles.id = user_roles.role_id").
			Scan(&grants).Error; err != nil {
			return err
		}

		items := make([]models.AccessReviewItem, 0, len(grants))
		for _, g := range grants {
			items = append(items, models.AccessReviewItem{
				ReviewID:  review.ID,
				UserID:    g.UserID,
				UserEmail: g.UserEmail,
				RoleID:    g.RoleID,
				RoleName:  g.RoleName,
				Decision:  "pending",
			})
		}
		if len(items) > 0 {
			if err := tx.Create(&items).Error; err != nil {
				return err
			}
		}
		review.Items = items
		return nil
	})
	if err != nil {
		return nil, err
	}
	return review, nil
}

// DecideAccessReviewItem records an approve/revoke decision. A revoke removes
// the underlying UserRole in the same transaction and logs it to the activity
// trail, so the decision and its effect can never drift apart.
func DecideAccessReviewItem(db *gorm.DB, c *gin.Context, reviewID, itemID, decision, note, reviewerID, reviewerEmail string) (*models.AccessReviewItem, error) {
	if decision != "approved" && decision != "revoked" {
		return nil, fmt.Errorf("decision must be \"approved\" or \"revoked\", got %q", decision)
	}

	var item models.AccessReviewItem
	err := db.Transaction(func(tx *gorm.DB) error {
		var review models.AccessReview
		if err := tx.First(&review, "id = ?", reviewID).Error; err != nil {
			return err
		}
		if review.Status == "completed" {
			return ErrReviewClosed
		}
		if err := tx.First(&item, "id = ? AND review_id = ?", itemID, reviewID).Error; err != nil {
			return err
		}
		// Revoke is terminal: the grant is already gone, so the record must not be
		// walked back to a certification the system can't stand behind.
		if item.Decision == "revoked" {
			return ErrItemDecided
		}

		if decision == "revoked" {
			// Remove the actual grant. Scoped to this user+role so nothing else is
			// touched; a no-op if it was already removed out of band.
			if err := tx.Where("user_id = ? AND role_id = ?", item.UserID, item.RoleID).
				Delete(&models.UserRole{}).Error; err != nil {
				return err
			}
		}

		now := time.Now()
		item.Decision = decision
		item.Note = note
		item.DecidedBy = reviewerID
		item.DecidedByEmail = reviewerEmail
		item.DecidedAt = &now
		return tx.Save(&item).Error
	})
	if err != nil {
		return nil, err
	}

	// Log the revocation to the semantic activity trail (best-effort, outside the
	// transaction — losing the log line must not roll back a real revocation).
	if decision == "revoked" && c != nil {
		LogActivity(db, c, ActivityArgs{
			UserID:       reviewerID,
			Action:       "access_review.revoke",
			Severity:     "warn",
			Summary:      fmt.Sprintf("Revoked role %q from %s during access review", item.RoleName, item.UserEmail),
			ResourceType: "user",
			ResourceID:   item.UserID,
			Metadata: map[string]interface{}{
				"review_id": reviewID,
				"role_id":   item.RoleID,
			},
		})
	}
	return &item, nil
}

// CompleteAccessReview signs off a campaign. It refuses while any item is still
// pending: a review with undecided grants is not a review.
func CompleteAccessReview(db *gorm.DB, reviewID, reviewerID, reviewerEmail string) (*models.AccessReview, error) {
	var review models.AccessReview
	err := db.Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&review, "id = ?", reviewID).Error; err != nil {
			return err
		}
		if review.Status == "completed" {
			return ErrReviewClosed
		}
		var pending int64
		if err := tx.Model(&models.AccessReviewItem{}).
			Where("review_id = ? AND decision = ?", reviewID, "pending").
			Count(&pending).Error; err != nil {
			return err
		}
		if pending > 0 {
			return ErrReviewIncomplete
		}
		now := time.Now()
		review.Status = "completed"
		review.CompletedBy = reviewerID
		review.CompletedByEmail = reviewerEmail
		review.CompletedAt = &now
		return tx.Save(&review).Error
	})
	if err != nil {
		return nil, err
	}
	return &review, nil
}

// AccessReviewSummary is the per-campaign counts the list view shows.
type AccessReviewSummary struct {
	models.AccessReview
	TotalItems    int64 `json:"total_items"`
	PendingItems  int64 `json:"pending_items"`
	ApprovedItems int64 `json:"approved_items"`
	RevokedItems  int64 `json:"revoked_items"`
}
