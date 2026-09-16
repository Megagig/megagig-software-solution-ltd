package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/backup"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/storage"
)

const (
	// manualBackupWindow rate-limits on-demand backups. The weekly cron bypasses it.
	manualBackupWindow = 24 * time.Hour
	// downloadURLTTL: long enough for a slow phone, short enough that a leaked
	// link stops working before anyone can use it.
	downloadURLTTL = 15 * time.Minute
	// backupTimeout bounds a single run so a hung upload can't wedge the worker.
	backupTimeout = 30 * time.Minute
)

// BackupHandler serves the full-database backup index.
type BackupHandler struct {
	DB      *gorm.DB
	Storage *storage.Storage
}

func (h *BackupHandler) svc() *backup.Service {
	return &backup.Service{DB: h.DB, Storage: h.Storage}
}

// List returns backups newest-first. Poll it while one is RUNNING.
func (h *BackupHandler) List(c *gin.Context) {
	var items []models.Backup
	if err := h.DB.Order("created_at desc").Limit(50).Find(&items).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to list backups"},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

// Generate starts a manual backup in the background and returns the RUNNING row
// immediately — a full dump can take a while. Poll List until it flips to READY.
func (h *BackupHandler) Generate(c *gin.Context) {
	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{"code": "STORAGE_UNAVAILABLE", "message": "Object storage is not configured"},
		})
		return
	}

	limited, err := h.svc().ManualRateLimited(manualBackupWindow)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to check rate limit"},
		})
		return
	}
	if limited {
		c.JSON(http.StatusTooManyRequests, gin.H{
			"error": gin.H{"code": "RATE_LIMITED", "message": "A manual backup was already taken in the last 24 hours"},
		})
		return
	}

	rec, err := h.svc().Start("MANUAL")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to start backup"},
		})
		return
	}

	go func(r models.Backup) {
		ctx, cancel := context.WithTimeout(context.Background(), backupTimeout)
		defer cancel()
		_ = h.svc().Run(ctx, &r)
	}(*rec)

	c.JSON(http.StatusAccepted, gin.H{"data": rec, "message": "Backup started"})
}

// Download mints a short-lived pre-signed URL so the client pulls the archive
// straight from object storage — no proxying a multi-hundred-MB file through the API.
func (h *BackupHandler) Download(c *gin.Context) {
	if h.Storage == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{"code": "STORAGE_UNAVAILABLE", "message": "Object storage is not configured"},
		})
		return
	}

	var b models.Backup
	if err := h.DB.First(&b, "id = ?", c.Param("id")).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "Backup not found"},
		})
		return
	}
	if b.Status != "READY" || b.StorageKey == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "NOT_AVAILABLE", "message": "This backup is not available for download"},
		})
		return
	}

	url, err := h.Storage.GetSignedURL(c.Request.Context(), b.StorageKey, downloadURLTTL)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to sign download URL"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{"url": url, "expires_in": int(downloadURLTTL.Seconds())},
	})
}

// GetSettings returns the automatic-backup schedule (frequency, time, enabled).
func (h *BackupHandler) GetSettings(c *gin.Context) {
	sc, err := h.svc().GetSchedule()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to load backup schedule"},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": sc})
}

// UpdateSettings changes the automatic-backup schedule. The scheduler picks up
// the new period on its next tick — no restart needed.
func (h *BackupHandler) UpdateSettings(c *gin.Context) {
	var req struct {
		Frequency string `json:"frequency"`
		Time      string `json:"time"`
		Enabled   bool   `json:"enabled"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_BODY", "message": err.Error()}})
		return
	}
	sc, err := h.svc().SaveSchedule(req.Frequency, req.Time, req.Enabled)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": gin.H{"code": "INVALID_SCHEDULE", "message": err.Error()}})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": sc, "message": "Backup schedule updated"})
}
