package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

type NotificationHandler struct {
	DB *gorm.DB
}

// List returns unread + recent notifications for the bell dropdown.
// Visible to any authenticated user; admins see system-wide ones too.
func (h *NotificationHandler) List(c *gin.Context) {
	userID, _ := c.Get("user_id")
	role, _ := c.Get("user_role")

	q := h.DB.Order("created_at DESC").Limit(50)
	if role == "ADMIN" {
		// Admins see broadcast (user_id="") + their own
		q = q.Where("user_id = '' OR user_id = ?", userID)
	} else {
		q = q.Where("user_id = ?", userID)
	}

	var items []models.Notification
	q.Find(&items)

	// Quick unread count for the bell badge
	var unread int64
	cq := h.DB.Model(&models.Notification{}).Where("read_at IS NULL")
	if role == "ADMIN" {
		cq = cq.Where("user_id = '' OR user_id = ?", userID)
	} else {
		cq = cq.Where("user_id = ?", userID)
	}
	cq.Count(&unread)

	c.JSON(http.StatusOK, gin.H{
		"data":   items,
		"unread": unread,
	})
}

// MarkRead marks one notification as read.
func (h *NotificationHandler) MarkRead(c *gin.Context) {
	id := c.Param("id")
	now := time.Now()
	if err := h.DB.Model(&models.Notification{}).
		Where("id = ?", id).
		Update("read_at", now).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "DB_ERROR", "message": err.Error()},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "marked read"})
}

// MarkAllRead clears the bell for the current viewer.
func (h *NotificationHandler) MarkAllRead(c *gin.Context) {
	userID, _ := c.Get("user_id")
	role, _ := c.Get("user_role")
	now := time.Now()
	q := h.DB.Model(&models.Notification{}).Where("read_at IS NULL")
	if role == "ADMIN" {
		q = q.Where("user_id = '' OR user_id = ?", userID)
	} else {
		q = q.Where("user_id = ?", userID)
	}
	q.Update("read_at", now)
	c.JSON(http.StatusOK, gin.H{"message": "all marked read"})
}
