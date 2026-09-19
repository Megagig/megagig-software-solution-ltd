package handlers

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/services"
)

var nonSlugChars = regexp.MustCompile(`[^a-z0-9]+`)

// normalizeBlogSlug turns admin input into a URL-safe slug: lowercase
// letters, digits and single hyphens, no leading/trailing hyphen. Unlike the
// model's create-time slugify it adds no random suffix — an admin choosing a
// slug means exactly that slug. Returns "" when nothing usable is left.
func normalizeBlogSlug(s string) string {
	return strings.Trim(nonSlugChars.ReplaceAllString(strings.ToLower(s), "-"), "-")
}

// blogUpdateError writes the standard { error: { code, message } } body.
func blogUpdateError(c *gin.Context, status int, code, message string) {
	c.JSON(status, gin.H{"error": gin.H{"code": code, "message": message}})
}

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
		Title          string   `json:"title" binding:"required"`
		Content        string   `json:"content"`
		Image          string   `json:"image"`
		Excerpt        string   `json:"excerpt"`
		AuthorID       string   `json:"author_id"`
		Tags           []string `json:"tags"`
		SEOTitle       string   `json:"seo_title"`
		SEODescription string   `json:"seo_description"`
		Published      *bool    `json:"published"`
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
		Title:          req.Title,
		Content:        req.Content,
		Image:          req.Image,
		Excerpt:        req.Excerpt,
		AuthorID:       req.AuthorID,
		Tags:           req.Tags,
		SEOTitle:       req.SEOTitle,
		SEODescription: req.SEODescription,
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

	// Pointers distinguish "not sent" (leave alone) from "sent blank" (clear),
	// so an admin can remove a cover image, excerpt, author or SEO text.
	// Title and slug are the exception: they may change but never be blank.
	var req struct {
		Title          *string  `json:"title"`
		Slug           *string  `json:"slug"`
		Content        *string  `json:"content"`
		Image          *string  `json:"image"`
		Excerpt        *string  `json:"excerpt"`
		AuthorID       *string  `json:"author_id"`
		Tags           []string `json:"tags"`
		SEOTitle       *string  `json:"seo_title"`
		SEODescription *string  `json:"seo_description"`
		Published      *bool    `json:"published"`
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
	if req.Title != nil {
		title := strings.TrimSpace(*req.Title)
		if title == "" {
			blogUpdateError(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "Title cannot be empty.")
			return
		}
		updates["title"] = title
	}
	if req.Slug != nil {
		slug := normalizeBlogSlug(*req.Slug)
		if slug == "" {
			blogUpdateError(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR",
				"The URL slug can only use letters, numbers and hyphens, and cannot be empty.")
			return
		}
		if slug != existing.Slug {
			// Unscoped: the unique slug index also covers soft-deleted posts.
			var taken int64
			h.DB.Unscoped().Model(&models.Blog{}).Where("slug = ? AND id <> ?", slug, id).Count(&taken)
			if taken > 0 {
				blogUpdateError(c, http.StatusConflict, "SLUG_TAKEN", "That URL slug is already used by another post.")
				return
			}
			updates["slug"] = slug
		}
	}
	if req.Content != nil {
		updates["content"] = *req.Content
	}
	if req.Image != nil {
		updates["image"] = *req.Image
	}
	if req.Excerpt != nil {
		updates["excerpt"] = *req.Excerpt
	}
	if req.AuthorID != nil {
		authorID := strings.TrimSpace(*req.AuthorID)
		if authorID == "" {
			// Clearing the author must store NULL — "" violates the author FK.
			updates["author_id"] = nil
		} else {
			var found int64
			h.DB.Model(&models.TeamMember{}).Where("id = ?", authorID).Count(&found)
			if found == 0 {
				blogUpdateError(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR", "That author no longer exists.")
				return
			}
			updates["author_id"] = authorID
		}
	}
	if req.Tags != nil {
		updates["tags"] = datatypes.JSONSlice[string](req.Tags)
	}
	if req.SEOTitle != nil {
		updates["seo_title"] = *req.SEOTitle
	}
	if req.SEODescription != nil {
		updates["seo_description"] = *req.SEODescription
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
