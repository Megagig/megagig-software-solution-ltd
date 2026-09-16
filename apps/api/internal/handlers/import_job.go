package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// ImportJobHandler serves the progress/result of background CSV imports.
type ImportJobHandler struct {
	DB *gorm.DB
}

// GetByID returns a single import job. Poll this while Status is "processing"
// to drive a progress bar (processed/total), then read created/skipped/failed
// and the per-row errors once Status is "completed".
func (h *ImportJobHandler) GetByID(c *gin.Context) {
	var job models.ImportJob
	if err := h.DB.First(&job, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Import job not found"},
		})
		return
	}

	rowErrors := []map[string]interface{}{}
	if job.Errors != "" {
		_ = json.Unmarshal([]byte(job.Errors), &rowErrors)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"id":        job.ID,
			"resource":  job.Resource,
			"status":    job.Status,
			"total":     job.Total,
			"processed": job.Processed,
			"created":   job.Created,
			"skipped":   job.Skipped,
			"failed":    job.Failed,
			"errors":    rowErrors,
			"message":   job.Message,
		},
	})
}
