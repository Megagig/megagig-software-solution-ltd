package handlers

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/services"
)

// BlogHandler handles blog endpoints.
type BlogHandler struct {
	DB      *gorm.DB
	Service *services.BlogService
}

// NewBlogHandler creates a new BlogHandler instance.
func NewBlogHandler(db *gorm.DB) *BlogHandler {
	return &BlogHandler{
		DB:      db,
		Service: services.NewBlogService(db),
	}
}

// List returns a paginated list of all blogs (admin).
func (h *BlogHandler) List(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))
	search := c.Query("search")
	sortBy := c.DefaultQuery("sort_by", "created_at")
	sortOrder := c.DefaultQuery("sort_order", "desc")

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = "desc"
	}

	allowedSorts := map[string]bool{
		"id": true, "title": true, "slug": true, "published": true, "published_at": true, "created_at": true,
	}
	if !allowedSorts[sortBy] {
		sortBy = "created_at"
	}

	blogs, total, pages, err := h.Service.List(page, pageSize, search, sortBy, sortOrder)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch blogs",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": blogs,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     pages,
		},
	})
}

// ListPublished returns a paginated list of published blogs (public).
func (h *BlogHandler) ListPublished(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "20"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 20
	}

	blogs, total, pages, err := h.Service.ListPublished(page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch blogs",
			},
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=300")
	c.JSON(http.StatusOK, gin.H{
		"data": blogs,
		"meta": gin.H{
			"total":     total,
			"page":      page,
			"page_size": pageSize,
			"pages":     pages,
		},
	})
}

// GetBySlug returns a single published blog by slug (public).
func (h *BlogHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")

	blog, err := h.Service.GetBySlug(slug)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Blog not found",
			},
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=3600")
	c.JSON(http.StatusOK, gin.H{
		"data": blog,
	})
}

// GetByID powers the admin blog detail page. Skips the
// Cache-Control public hint that GetBySlug sets because admin views
// expect fresh data after each save.
func (h *BlogHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	blog, err := h.Service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Blog not found",
			},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": blog})
}

// Create adds a new blog (admin).
func (h *BlogHandler) Create(c *gin.Context) {
	var req struct {
		Title     string `json:"title" binding:"required"`
		Content   string `json:"content"`
		Image     string `json:"image"`
		Excerpt   string `json:"excerpt"`
		Published *bool  `json:"published"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	blog := models.Blog{
		Title:   req.Title,
		Content: req.Content,
		Image:   req.Image,
		Excerpt: req.Excerpt,
	}

	if req.Published != nil && *req.Published {
		blog.Published = true
		now := time.Now()
		blog.PublishedAt = &now
	}

	if err := h.Service.Create(&blog); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create blog",
			},
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"data":    blog,
		"message": "Blog created successfully",
	})
}

// Update modifies an existing blog (admin).
func (h *BlogHandler) Update(c *gin.Context) {
	id := c.Param("id")

	// Fetch existing blog to check published state
	existing, err := h.Service.GetByID(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Blog not found",
			},
		})
		return
	}

	var req struct {
		Title     string `json:"title"`
		Content   string `json:"content"`
		Image     string `json:"image"`
		Excerpt   string `json:"excerpt"`
		Published *bool  `json:"published"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Content != "" {
		updates["content"] = req.Content
	}
	if req.Image != "" {
		updates["image"] = req.Image
	}
	if req.Excerpt != "" {
		updates["excerpt"] = req.Excerpt
	}
	if req.Published != nil {
		updates["published"] = *req.Published
		if *req.Published && !existing.Published {
			// Toggling published to true — set PublishedAt
			now := time.Now()
			updates["published_at"] = &now
		} else if !*req.Published && existing.Published {
			// Toggling published to false — clear PublishedAt
			updates["published_at"] = nil
		}
	}

	blog, err := h.Service.Update(id, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update blog",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":    blog,
		"message": "Blog updated successfully",
	})
}

// Delete soft-deletes a blog (admin).
func (h *BlogHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	if err := h.Service.Delete(id); err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Blog not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Blog deleted successfully",
	})
}
