package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/paginate"
)

type UserActivityHandler struct {
	DB *gorm.DB
}

// List returns paginated activity events. Filters: user_id, action,
// severity, resource_type, q (substring against summary). Default sort
// is newest first.
//
//	GET /api/user-activity?severity=critical&page=1&page_size=25
//	GET /api/user-activity?q=login&user_id=...
func (h *UserActivityHandler) List(c *gin.Context) {
	q := h.DB.Model(&models.UserActivity{}).Order("created_at desc")

	params := paginate.Bind(c).
		With("user_id", c.Query("user_id")).
		With("action", c.Query("action")).
		With("severity", c.Query("severity")).
		With("resource_type", c.Query("resource_type"))

	if needle := c.Query("q"); needle != "" {
		q = q.Where("summary LIKE ?", "%"+needle+"%")
	}

	res, err := paginate.List[models.UserActivity](q, params, paginate.Config{
		Sortable: map[string]bool{
			"created_at": true,
			"severity":   true,
			"action":     true,
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

// Stats returns severity bucket counts for the last 24h. Powers the
// header chips on the activity dashboard.
//
//	GET /api/user-activity/stats
//	→ { "data": { "info": 142, "warn": 8, "critical": 1, "total": 151 } }
func (h *UserActivityHandler) Stats(c *gin.Context) {
	type bucket struct {
		Severity string `json:"severity"`
		Count    int64  `json:"count"`
	}
	var rows []bucket
	// Bind a Go-computed cutoff rather than NOW() - INTERVAL '24 hours':
	// that syntax is Postgres-only and errors on SQLite, which is a supported
	// target here, so this panel returned zeros on every SQLite project.
	since := time.Now().Add(-24 * time.Hour)
	h.DB.Model(&models.UserActivity{}).
		Select("severity, COUNT(*) AS count").
		Where("created_at > ?", since).
		Group("severity").
		Scan(&rows)

	out := map[string]int64{"info": 0, "warn": 0, "critical": 0, "total": 0}
	for _, r := range rows {
		out[r.Severity] = r.Count
		out["total"] += r.Count
	}
	c.JSON(http.StatusOK, gin.H{"data": out})
}
