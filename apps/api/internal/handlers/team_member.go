package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/export"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/paginate"
	"megagig-software-solution/apps/api/internal/pdf"
	"megagig-software-solution/apps/api/internal/services"
)

// TeamMemberHandler handles teammember endpoints.
type TeamMemberHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of team_members.
func (h *TeamMemberHandler) List(c *gin.Context) {
	query := h.DB.Model(&models.TeamMember{})

	res, err := paginate.List[models.TeamMember](
		query,
		paginate.Bind(c),
		paginate.Config{
			Searchable: []string{"name", "role"},
			Sortable:   map[string]bool{"id": true, "created_at": true, "name": true, "role": true, "sort_order": true},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch team_members",
			},
		})
		return
	}

	c.JSON(http.StatusOK, res)
}

// ListPublished returns published team members in curated order (public,
// unauthenticated) — apps/web's /team page.
func (h *TeamMemberHandler) ListPublished(c *gin.Context) {
	query := h.DB.Model(&models.TeamMember{}).Where("published = ?", true)

	res, err := paginate.List[models.TeamMember](
		query,
		paginate.Bind(c),
		paginate.Config{
			Searchable:   []string{"name", "role"},
			Sortable:     map[string]bool{"sort_order": true, "created_at": true},
			DefaultSort:  "sort_order",
			DefaultOrder: "asc",
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch team members",
			},
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=60")
	c.JSON(http.StatusOK, res)
}

// Export streams the full filtered list as CSV (default) or XLSX.
// Honours the same search/filter query params as List but skips
// pagination — you get every matching row in one file.
//
// Memory-bounded: reads in chunks of exportBatchSize so a million-row
// export doesn't OOM the process. CSV streams directly to the response
// writer; XLSX has to buffer (excelize requires the full sheet in
// memory before Write), so we still chunk the SCAN to avoid loading
// every row at once.
//
//	GET /api/team_members/export?format=csv
//	GET /api/team_members/export?format=xlsx&search=foo
func (h *TeamMemberHandler) Export(c *gin.Context) {
	const exportBatchSize = 1000

	format := c.DefaultQuery("format", "csv")
	search := c.Query("search")

	query := h.DB.Model(&models.TeamMember{}).Order("created_at desc")
	if search != "" && len([]string{"name", "role"}) > 0 {
		// Reuse the same searchable columns as List.
		searchable := []string{"name", "role"}
		clause := ""
		args := []any{}
		wild := "%" + search + "%"
		for i, col := range searchable {
			if i > 0 {
				clause += " OR "
			}
			clause += col + " ILIKE ?"
			args = append(args, wild)
		}
		query = query.Where(clause, args...)
	}

	opts := export.Options{
		Sheet: "TeamMembers",
		Columns: []export.Column{
			{Header: "ID", Field: "ID"},
			{Header: "Name", Field: "Name"},
			{Header: "Role", Field: "Role"},
			{Header: "PhotoURL", Field: "PhotoURL"},
			{Header: "LinkedinURL", Field: "LinkedinURL"},
			{Header: "GithubURL", Field: "GithubURL"},
			{Header: "TwitterURL", Field: "TwitterURL"},
			{Header: "Published", Field: "Published", Format: "bool"},
			{Header: "SortOrder", Field: "SortOrder"},
			{Header: "Created At", Field: "CreatedAt", Format: "date:2006-01-02"},
		},
	}

	// Stream rows in batches via GORM's FindInBatches. CSV writes each
	// batch straight to the wire; XLSX accumulates into a slice (no
	// streaming API in excelize) but at least we never load the whole
	// table at once.
	if format == "xlsx" {
		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Header("Content-Disposition", `attachment; filename="team_members.xlsx"`)
		var all []models.TeamMember
		if err := query.FindInBatches(&[]models.TeamMember{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
			var rows []models.TeamMember
			if err := tx.Scan(&rows).Error; err != nil {
				return err
			}
			all = append(all, rows...)
			return nil
		}).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "EXPORT_FAILED", "message": err.Error()},
			})
			return
		}
		if err := export.XLSX(c.Writer, all, opts); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": gin.H{"code": "EXPORT_FAILED", "message": err.Error()},
			})
		}
		return
	}

	// CSV path — true streaming. Write headers once, then each batch
	// flushes its rows directly to the response writer.
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", `attachment; filename="team_members.csv"`)

	headerWritten := false
	if err := query.FindInBatches(&[]models.TeamMember{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
		var rows []models.TeamMember
		if err := tx.Scan(&rows).Error; err != nil {
			return err
		}
		if !headerWritten {
			if err := export.CSV(c.Writer, rows, opts); err != nil {
				return err
			}
			headerWritten = true
		} else {
			// Subsequent batches: write rows only, no header.
			if err := export.CSVRows(c.Writer, rows, opts); err != nil {
				return err
			}
		}
		return nil
	}).Error; err != nil {
		// Headers already sent — best we can do is log + truncate.
		// The client will see a malformed CSV; ops should re-run.
		// (We don't write a JSON error body once streaming has begun.)
		_ = err
	}
}

// GetByID returns a single teammember by ID.
func (h *TeamMemberHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.TeamMember
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "TeamMember not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// PDF streams this teammember as a print-ready PDF — a repeating header and
// footer with page numbers, the record's fields as a detail grid, and any
// line items as a table. Edit the pdf.Record below to restyle it; the
// renderer itself lives in internal/pdf/record.go.
func (h *TeamMemberHandler) PDF(c *gin.Context) {
	id := c.Param("id")

	var item models.TeamMember
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "TeamMember not found",
			},
		})
		return
	}

	appName := os.Getenv("APP_NAME")
	if appName == "" {
		appName = "TeamMember"
	}

	rec := pdf.Record{
		Title:      "TEAM MEMBER",
		Subtitle:   pdf.Value(item.Name),
		Brand:      appName,
		FooterNote: appName + " · generated " + time.Now().Format("2 Jan 2006 15:04"),
		Fields: []pdf.Field{
			{Label: "Name", Value: pdf.Value(item.Name)},
			{Label: "Role", Value: pdf.Value(item.Role)},
			{Label: "Photo URL", Value: pdf.Value(item.PhotoURL)},
			{Label: "LinkedIn URL", Value: pdf.Value(item.LinkedinURL)},
			{Label: "GitHub URL", Value: pdf.Value(item.GithubURL)},
			{Label: "X URL", Value: pdf.Value(item.TwitterURL)},
			{Label: "Published", Value: pdf.Value(item.Published)},
			{Label: "Sort Order", Value: pdf.Value(item.SortOrder)},
			{Label: "Created", Value: pdf.Value(item.CreatedAt)},
		},
	}

	out, err := pdf.RenderRecord(rec)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "PDF_ERROR",
				"message": "could not render the PDF",
			},
		})
		return
	}

	filename := "team-member-" + id + ".pdf"
	c.Header("Content-Disposition", "inline; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", out)
}

// Create adds a new teammember.
func (h *TeamMemberHandler) Create(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Role        string `json:"role" binding:"required"`
		PhotoURL    string `json:"photo_url"`
		LinkedinURL string `json:"linkedin_url"`
		GithubURL   string `json:"github_url"`
		TwitterURL  string `json:"twitter_url"`
		Published   bool   `json:"published"`
		SortOrder   int    `json:"sort_order"`
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

	item := models.TeamMember{
		Name:        req.Name,
		Role:        req.Role,
		PhotoURL:    req.PhotoURL,
		LinkedinURL: req.LinkedinURL,
		GithubURL:   req.GithubURL,
		TwitterURL:  req.TwitterURL,
		Published:   req.Published,
		SortOrder:   req.SortOrder,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create teammember",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogCreate(h.DB, c, "TeamMember", item.Name, item.ID, "")

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "TeamMember created successfully",
	})
}

// Update modifies an existing teammember.
func (h *TeamMemberHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.TeamMember
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "TeamMember not found",
			},
		})
		return
	}

	var req struct {
		Name        string  `json:"name"`
		Role        string  `json:"role"`
		PhotoURL    *string `json:"photo_url"`
		LinkedinURL *string `json:"linkedin_url"`
		GithubURL   *string `json:"github_url"`
		TwitterURL  *string `json:"twitter_url"`
		Published   *bool   `json:"published"`
		SortOrder   *int    `json:"sort_order"`
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
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Role != "" {
		updates["role"] = req.Role
	}
	// Pointers so an admin can clear a photo or a social link.
	if req.PhotoURL != nil {
		updates["photo_url"] = *req.PhotoURL
	}
	if req.LinkedinURL != nil {
		updates["linkedin_url"] = *req.LinkedinURL
	}
	if req.GithubURL != nil {
		updates["github_url"] = *req.GithubURL
	}
	if req.TwitterURL != nil {
		updates["twitter_url"] = *req.TwitterURL
	}
	if req.Published != nil {
		updates["published"] = *req.Published
	}
	if req.SortOrder != nil {
		updates["sort_order"] = *req.SortOrder
	}

	if err := h.DB.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update teammember",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "TeamMember", item.Name, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "TeamMember updated successfully",
	})
}

// Patch applies a partial update to a teammember. Used by the admin's
// grouped update view — each form group's Save button calls PATCH with
// only the fields it owns, so editing "Address" doesn't rewrite
// "Pricing". Refuses any key that isn't a writable model column.
func (h *TeamMemberHandler) Patch(c *gin.Context) {
	id := c.Param("id")

	var item models.TeamMember
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "TeamMember not found",
			},
		})
		return
	}

	var body map[string]interface{}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": err.Error(),
			},
		})
		return
	}

	// Whitelist: only writable model columns may be patched. id,
	// created_at, updated_at, deleted_at, version are owned by the
	// framework and silently dropped here.
	allowed := map[string]bool{
		"name":         true,
		"role":         true,
		"photo_url":    true,
		"linkedin_url": true,
		"github_url":   true,
		"twitter_url":  true,
		"published":    true,
		"sort_order":   true,
	}
	updates := map[string]interface{}{}
	for k, v := range body {
		if allowed[k] {
			updates[k] = v
		}
	}
	if len(updates) == 0 {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{
				"code":    "VALIDATION_ERROR",
				"message": "No writable fields in request body",
			},
		})
		return
	}

	if err := h.DB.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to patch teammember",
			},
		})
		return
	}
	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "TeamMember", item.Name, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "TeamMember updated successfully",
	})
}

// Delete soft-deletes a teammember.
func (h *TeamMemberHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.TeamMember
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "TeamMember not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete teammember",
			},
		})
		return
	}

	services.LogDelete(h.DB, c, "TeamMember", item.Name, item.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "TeamMember deleted successfully",
	})
}
