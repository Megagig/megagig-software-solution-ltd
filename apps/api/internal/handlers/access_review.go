package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/services"
)

// AccessReviewHandler exposes the recertification workflow. Admin-only: the
// point of an access review is that a privileged reviewer certifies access, and
// its evidence must not be editable by the people whose access it covers.
type AccessReviewHandler struct {
	DB *gorm.DB
}

func NewAccessReviewHandler(db *gorm.DB) *AccessReviewHandler {
	return &AccessReviewHandler{DB: db}
}

// List returns campaigns newest first, each with its decision counts.
func (h *AccessReviewHandler) List(c *gin.Context) {
	var reviews []models.AccessReview
	if err := h.DB.Order("created_at desc").Find(&reviews).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to load reviews"},
		})
		return
	}

	out := make([]services.AccessReviewSummary, 0, len(reviews))
	for _, r := range reviews {
		s := services.AccessReviewSummary{AccessReview: r}
		h.DB.Model(&models.AccessReviewItem{}).Where("review_id = ?", r.ID).Count(&s.TotalItems)
		h.DB.Model(&models.AccessReviewItem{}).Where("review_id = ? AND decision = ?", r.ID, "pending").Count(&s.PendingItems)
		h.DB.Model(&models.AccessReviewItem{}).Where("review_id = ? AND decision = ?", r.ID, "approved").Count(&s.ApprovedItems)
		h.DB.Model(&models.AccessReviewItem{}).Where("review_id = ? AND decision = ?", r.ID, "revoked").Count(&s.RevokedItems)
		out = append(out, s)
	}
	c.JSON(http.StatusOK, gin.H{"data": out})
}

// Get returns one campaign with all its items.
func (h *AccessReviewHandler) Get(c *gin.Context) {
	var review models.AccessReview
	if err := h.DB.Preload("Items", func(db *gorm.DB) *gorm.DB {
		return db.Order("user_email asc, role_name asc")
	}).First(&review, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "access review not found"},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": review})
}

type openReviewRequest struct {
	Name string `json:"name" binding:"required"`
	Note string `json:"note"`
}

// Open starts a campaign, snapshotting all current role assignments.
func (h *AccessReviewHandler) Open(c *gin.Context) {
	var req openReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}
	review, err := services.OpenAccessReview(h.DB, req.Name, req.Note, c.GetString("user_id"), c.GetString("user_email"))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "failed to open review"},
		})
		return
	}
	c.JSON(http.StatusCreated, gin.H{
		"data":    review,
		"message": "Access review opened",
	})
}

type decideRequest struct {
	Decision string `json:"decision" binding:"required"`
	Note     string `json:"note"`
}

// Decide records an approve/revoke on one item. A revoke removes the grant.
func (h *AccessReviewHandler) Decide(c *gin.Context) {
	var req decideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}
	item, err := services.DecideAccessReviewItem(
		h.DB, c, c.Param("id"), c.Param("itemId"),
		req.Decision, req.Note,
		c.GetString("user_id"), c.GetString("user_email"),
	)
	if err != nil {
		status, code := http.StatusBadRequest, "INVALID_DECISION"
		switch err {
		case services.ErrReviewClosed:
			code = "REVIEW_CLOSED"
		case services.ErrItemDecided:
			code = "ITEM_LOCKED"
		case gorm.ErrRecordNotFound:
			status, code = http.StatusNotFound, "NOT_FOUND"
		}
		c.JSON(status, gin.H{"error": gin.H{"code": code, "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item, "message": "Decision recorded"})
}

// Complete signs off a campaign once every item is decided.
func (h *AccessReviewHandler) Complete(c *gin.Context) {
	review, err := services.CompleteAccessReview(h.DB, c.Param("id"), c.GetString("user_id"), c.GetString("user_email"))
	if err != nil {
		status, code := http.StatusBadRequest, "CANNOT_COMPLETE"
		switch err {
		case services.ErrReviewIncomplete:
			code = "REVIEW_INCOMPLETE"
		case services.ErrReviewClosed:
			code = "REVIEW_CLOSED"
		case gorm.ErrRecordNotFound:
			status, code = http.StatusNotFound, "NOT_FOUND"
		}
		c.JSON(status, gin.H{"error": gin.H{"code": code, "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": review, "message": "Access review completed"})
}
