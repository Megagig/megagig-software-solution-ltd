package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/audit"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/paginate"
)

// ActivityHandler exposes the audit log as a paginated, filterable
// list. Mounted under admin/* in routes.go.
type ActivityHandler struct {
	DB *gorm.DB
}

func NewActivityHandler(db *gorm.DB) *ActivityHandler {
	return &ActivityHandler{DB: db}
}

// List returns activity log entries, newest first. Supports filtering
// by user_id, method, and path prefix via query params.
func (h *ActivityHandler) List(c *gin.Context) {
	q := h.DB.Model(&models.ActivityLog{}).Order("created_at desc")
	params := paginate.Bind(c).
		With("user_id", c.Query("user_id")).
		With("method", c.Query("method"))

	if pathPrefix := c.Query("path"); pathPrefix != "" {
		q = q.Where("path LIKE ?", pathPrefix+"%")
	}

	res, err := paginate.List[models.ActivityLog](q, params, paginate.Config{
		Sortable: map[string]bool{
			"created_at": true,
			"status":     true,
			"method":     true,
		},
		DefaultSort:  "created_at",
		DefaultOrder: "desc",
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, res)
}

// VerifyIntegrity walks the entire activity log and verifies every
// row's Hash matches what we'd compute now. A mismatch means a row
// was modified, deleted, or inserted out of order — the response
// pinpoints which row broke the chain.
//
// Bounded by a 60-second deadline so a runaway scan can't hold the
// connection forever — if you have hundreds of millions of rows,
// run this from a cron job instead of an HTTP request.
//
//	GET /api/admin/activity/integrity
//	→ { "valid": true, "total_entries": 12345 }
//	→ { "valid": false, "broken_at": 47, "broken_at_id": "uuid",
//	    "expected": "abc...", "got": "def...",
//	    "message": "hash mismatch — row was modified..." }
func (h *ActivityHandler) VerifyIntegrity(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), 60*time.Second)
	defer cancel()
	status, err := audit.VerifyChain(ctx, h.DB)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, status)
}
