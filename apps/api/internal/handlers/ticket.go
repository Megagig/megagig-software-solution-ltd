package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/mail"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/paginate"
	"megagig-software-solution/apps/api/internal/services"
)

type TicketHandler struct {
	DB   *gorm.DB
	Mail *mail.Mailer // can be nil — handler logs instead of emailing
}

type createTicketRequest struct {
	Subject     string `json:"subject" binding:"required,min=3,max=200"`
	Description string `json:"description" binding:"required,min=10"`
	Priority    string `json:"priority"`
	Labels      string `json:"labels"`
}

type replyRequest struct {
	Body string `json:"body" binding:"required,min=1"`
}

type assignRequest struct {
	AssigneeID string `json:"assignee_id" binding:"required"`
}

// Create opens a ticket for the authenticated user. Fires an email to
// SUPPORT_EMAIL when Resend is configured + a Notification for every
// ADMIN so the bell lights up.
//
//	POST /api/tickets
func (h *TicketHandler) Create(c *gin.Context) {
	var req createTicketRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	userIDv, _ := c.Get("user_id")
	userID, _ := userIDv.(string)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{"code": "UNAUTHORIZED", "message": "sign in to open a ticket"},
		})
		return
	}

	// Cap labels at 8 — protects against accidental spam pasted into the
	// field. Trim each one so "bug , billing" doesn't store the space.
	labels := normalizeLabels(req.Labels, 8)

	ticket := models.Ticket{
		UserID:      userID,
		Subject:     req.Subject,
		Description: req.Description,
		Priority:    req.Priority,
		Labels:      labels,
	}
	if err := h.DB.Create(&ticket).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "DB_ERROR", "message": err.Error()},
		})
		return
	}

	// Hydrate the user for the email + audit. Best-effort.
	var creator models.User
	h.DB.First(&creator, "id = ?", userID)

	// Fire-and-forget email + admin notifications. We don't fail the
	// request if either side trips — the ticket itself is persisted.
	go h.emitTicketCreated(&ticket, &creator)

	services.LogActivity(h.DB, c, services.ActivityArgs{
		Action:       "ticket.create",
		Severity:     "info",
		Summary:      fmt.Sprintf("Opened ticket %q (priority %s)", ticket.Subject, ticket.Priority),
		ResourceType: "ticket",
		ResourceID:   ticket.ID,
	})

	c.JSON(http.StatusCreated, gin.H{
		"data":    ticket,
		"message": "Ticket opened",
	})
}

// List returns tickets the caller can see. Regular users see their own;
// ADMIN/EDITOR see everything. Supports status (open|closed) + q filters.
//
//	GET /api/tickets?status=open&q=billing
func (h *TicketHandler) List(c *gin.Context) {
	userID, _ := c.Get("user_id")
	role, _ := c.Get("user_role")
	isAdmin := role == "ADMIN" || role == "EDITOR"

	q := h.DB.Model(&models.Ticket{}).
		Preload("User").Preload("Assignee").
		Order("COALESCE(last_reply_at, created_at) DESC")

	if !isAdmin {
		q = q.Where("user_id = ?", userID)
	}
	params := paginate.Bind(c).
		With("status", c.Query("status")).
		With("priority", c.Query("priority")).
		With("assignee_id", c.Query("assignee_id"))
	if needle := c.Query("q"); needle != "" {
		q = q.Where("subject LIKE ? OR description LIKE ?", "%"+needle+"%", "%"+needle+"%")
	}

	res, err := paginate.List[models.Ticket](q, params, paginate.Config{
		Sortable:     map[string]bool{"created_at": true, "priority": true, "status": true},
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

// Get returns one ticket with replies. Same auth rule as List.
//
//	GET /api/tickets/:id
func (h *TicketHandler) Get(c *gin.Context) {
	id := c.Param("id")
	userID, _ := c.Get("user_id")
	role, _ := c.Get("user_role")
	isAdmin := role == "ADMIN" || role == "EDITOR"

	var t models.Ticket
	q := h.DB.Preload("User").Preload("Assignee").
		Preload("Replies", func(db *gorm.DB) *gorm.DB { return db.Order("created_at ASC") }).
		Preload("Replies.User")
	if err := q.First(&t, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "ticket not found"},
		})
		return
	}
	if !isAdmin && t.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{"code": "FORBIDDEN", "message": "not your ticket"},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": t})
}

// Reply adds a message to the thread. Sets is_admin_reply when the
// caller is ADMIN/EDITOR so the UI can style staff replies.
//
//	POST /api/tickets/:id/reply
func (h *TicketHandler) Reply(c *gin.Context) {
	id := c.Param("id")
	var req replyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	userIDv, _ := c.Get("user_id")
	userID, _ := userIDv.(string)
	role, _ := c.Get("user_role")
	isAdmin := role == "ADMIN" || role == "EDITOR"

	var t models.Ticket
	if err := h.DB.First(&t, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "ticket not found"},
		})
		return
	}
	if !isAdmin && t.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{"code": "FORBIDDEN", "message": "not your ticket"},
		})
		return
	}

	reply := models.TicketReply{
		TicketID:     t.ID,
		UserID:       userID,
		Body:         req.Body,
		IsAdminReply: isAdmin,
	}
	now := time.Now()
	if err := h.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&reply).Error; err != nil {
			return err
		}
		return tx.Model(&t).Update("last_reply_at", now).Error
	}); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "DB_ERROR", "message": err.Error()},
		})
		return
	}

	services.LogActivity(h.DB, c, services.ActivityArgs{
		Action:       "ticket.reply",
		Severity:     "info",
		Summary:      fmt.Sprintf("Replied on ticket %q", t.Subject),
		ResourceType: "ticket",
		ResourceID:   t.ID,
	})

	c.JSON(http.StatusCreated, gin.H{"data": reply, "message": "Reply added"})
}

// Close stamps ClosedAt + status. Only the owner or an admin can close.
//
//	PATCH /api/tickets/:id/close
func (h *TicketHandler) Close(c *gin.Context) {
	h.transitionStatus(c, "closed")
}

// Reopen flips status back to open + clears ClosedAt.
//
//	PATCH /api/tickets/:id/reopen
func (h *TicketHandler) Reopen(c *gin.Context) {
	h.transitionStatus(c, "open")
}

// Assign points the ticket at an admin. Admins only.
//
//	PATCH /api/tickets/:id/assign
func (h *TicketHandler) Assign(c *gin.Context) {
	role, _ := c.Get("user_role")
	if role != "ADMIN" && role != "EDITOR" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{"code": "FORBIDDEN", "message": "admins only"},
		})
		return
	}
	var req assignRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	id := c.Param("id")
	var t models.Ticket
	if err := h.DB.First(&t, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "ticket not found"},
		})
		return
	}
	if err := h.DB.Model(&t).Update("assignee_id", req.AssigneeID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "DB_ERROR", "message": err.Error()},
		})
		return
	}

	services.LogActivity(h.DB, c, services.ActivityArgs{
		Action:       "ticket.assign",
		Severity:     "info",
		Summary:      fmt.Sprintf("Assigned ticket %q", t.Subject),
		ResourceType: "ticket",
		ResourceID:   t.ID,
	})
	c.JSON(http.StatusOK, gin.H{"message": "Assignee updated"})
}

func (h *TicketHandler) transitionStatus(c *gin.Context, status string) {
	id := c.Param("id")
	userID, _ := c.Get("user_id")
	role, _ := c.Get("user_role")
	isAdmin := role == "ADMIN" || role == "EDITOR"

	var t models.Ticket
	if err := h.DB.First(&t, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "ticket not found"},
		})
		return
	}
	if !isAdmin && t.UserID != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": gin.H{"code": "FORBIDDEN", "message": "not your ticket"},
		})
		return
	}

	updates := map[string]interface{}{"status": status}
	if status == "closed" {
		now := time.Now()
		updates["closed_at"] = &now
	} else {
		updates["closed_at"] = nil
	}
	if err := h.DB.Model(&t).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "DB_ERROR", "message": err.Error()},
		})
		return
	}

	services.LogActivity(h.DB, c, services.ActivityArgs{
		Action:       "ticket." + status,
		Severity:     "info",
		Summary:      fmt.Sprintf("Marked ticket %q as %s", t.Subject, status),
		ResourceType: "ticket",
		ResourceID:   t.ID,
	})
	c.JSON(http.StatusOK, gin.H{"message": "Status updated"})
}

// emitTicketCreated is the fire-and-forget side-effect of opening a
// ticket: email SUPPORT_EMAIL via Resend (if configured), and create
// an in-app Notification for every ADMIN.
func (h *TicketHandler) emitTicketCreated(t *models.Ticket, creator *models.User) {
	// Email to SUPPORT_EMAIL — best-effort, never blocks the request.
	if h.Mail != nil {
		_ = services.SendTicketCreatedEmail(h.Mail, t, creator)
	}

	// Fan-out an admin notification per ADMIN — bell lights up.
	var admins []models.User
	h.DB.Where("role = ? AND active = ?", "ADMIN", true).Find(&admins)
	for _, a := range admins {
		n := models.Notification{
			UserID:   a.ID,
			Source:   "system",
			Severity: ticketSeverity(t.Priority),
			Title:    "New ticket: " + t.Subject,
			Body:     "Opened by " + creator.Email + ".",
			Link:     "/system/support/" + t.ID,
			Dedup:    "ticket-created:" + t.ID + ":" + a.ID,
		}
		// Ignore unique-index collisions — duplicate fires are no-ops.
		h.DB.FirstOrCreate(&n, models.Notification{Dedup: n.Dedup})
	}
}

func ticketSeverity(priority string) string {
	switch priority {
	case "critical":
		return "critical"
	case "high":
		return "high"
	case "low":
		return "low"
	default:
		return "medium"
	}
}

func normalizeLabels(raw string, cap int) string {
	if raw == "" {
		return ""
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		out = append(out, p)
		if len(out) >= cap {
			break
		}
	}
	return strings.Join(out, ",")
}
