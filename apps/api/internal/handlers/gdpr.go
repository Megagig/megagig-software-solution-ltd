package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/services"
)

// GDPRHandler serves the right-to-access and right-to-erasure endpoints.
type GDPRHandler struct {
	DB *gorm.DB
}

func NewGDPRHandler(db *gorm.DB) *GDPRHandler {
	return &GDPRHandler{DB: db}
}

// Export returns the full data bundle for a user as a downloadable JSON file.
// A user may export their own data; an admin may export anyone's.
func (h *GDPRHandler) Export(c *gin.Context) {
	targetID := c.Param("id")
	callerID, _ := c.Get("user_id")
	callerRole, _ := c.Get("user_role")
	if fmt.Sprint(callerID) != targetID && fmt.Sprint(callerRole) != "ADMIN" {
		c.JSON(http.StatusForbidden, gin.H{"error": gin.H{"code": "FORBIDDEN", "message": "you may only export your own data"}})
		return
	}

	bundle, err := services.ExportUserData(h.DB, targetID)
	if err != nil {
		if err == services.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "user not found"}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "EXPORT_FAILED", "message": err.Error()}})
		return
	}

	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=\"user-%s-export.json\"", targetID))
	c.JSON(http.StatusOK, bundle)
}

type eraseRequest struct {
	Reason string `json:"reason"`
}

// Erase fulfils a right-to-erasure request (admin only). It refuses to let an
// admin erase themselves — that would revoke their own access mid-request and
// orphan the operation.
func (h *GDPRHandler) Erase(c *gin.Context) {
	targetID := c.Param("id")
	callerID, _ := c.Get("user_id")
	callerEmail, _ := c.Get("user_email")

	if fmt.Sprint(callerID) == targetID {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "SELF_ERASE", "message": "you cannot erase your own account here"}})
		return
	}

	var req eraseRequest
	_ = c.ShouldBindJSON(&req)

	journal, err := services.EraseUser(h.DB, targetID, fmt.Sprint(callerID), fmt.Sprint(callerEmail), req.Reason)
	if err != nil {
		if err == services.ErrUserNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": gin.H{"code": "NOT_FOUND", "message": "user not found"}})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "ERASE_FAILED", "message": err.Error()}})
		return
	}

	// Record the erasure in the semantic activity log too, so it shows up in the
	// dashboard and flows out through the OCSF/SIEM export.
	h.DB.Create(&models.UserActivity{
		UserID:       fmt.Sprint(callerID),
		Action:       "user.gdpr_erase",
		Severity:     "warn",
		Summary:      fmt.Sprintf("Erased all personal data for user %s (%d records)", targetID, journal.RecordsAffected),
		ResourceType: "user",
		ResourceID:   targetID,
	})

	c.JSON(http.StatusOK, gin.H{"data": journal, "message": "User data erased"})
}

// Journal lists the deletion journal and replays its hash chain so the caller
// can see at a glance whether the record of erasures is intact (admin only).
func (h *GDPRHandler) Journal(c *gin.Context) {
	var rows []models.DeletionJournal
	if err := h.DB.Order("created_at desc, id desc").Find(&rows).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "QUERY_FAILED", "message": err.Error()}})
		return
	}
	verification, err := services.VerifyJournalChain(h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "VERIFY_FAILED", "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": rows, "meta": verification})
}
