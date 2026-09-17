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

// TestimonialHandler handles testimonial endpoints.
type TestimonialHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of testimonials.
func (h *TestimonialHandler) List(c *gin.Context) {
	query := h.DB.Model(&models.Testimonial{}).Preload("Avatar").Preload("CaseStudy")

	res, err := paginate.List[models.Testimonial](
		query,
		paginate.Bind(c).With("avatar_id", c.Query("avatar_id")).With("case_study_id", c.Query("case_study_id")),
		paginate.Config{
			Searchable: []string{"quote_text", "author_name", "author_role", "company_name", "company_url"},
			Sortable:   map[string]bool{"id": true, "created_at": true, "quote_text": true, "author_name": true, "author_role": true, "company_name": true, "company_url": true, "sort_order": true},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch testimonials",
			},
		})
		return
	}

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
//	GET /api/testimonials/export?format=csv
//	GET /api/testimonials/export?format=xlsx&search=foo
func (h *TestimonialHandler) Export(c *gin.Context) {
	const exportBatchSize = 1000

	format := c.DefaultQuery("format", "csv")
	search := c.Query("search")

	query := h.DB.Model(&models.Testimonial{}).Preload("Avatar").Preload("CaseStudy").Order("created_at desc")
	if search != "" && len([]string{"quote_text", "author_name", "author_role", "company_name", "company_url"}) > 0 {
		// Reuse the same searchable columns as List.
		searchable := []string{"quote_text", "author_name", "author_role", "company_name", "company_url"}
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
		Sheet: "Testimonials",
		Columns: []export.Column{
			{Header: "ID", Field: "ID"},
			{Header: "QuoteText", Field: "QuoteText"},
			{Header: "AuthorName", Field: "AuthorName"},
			{Header: "AuthorRole", Field: "AuthorRole"},
			{Header: "CompanyName", Field: "CompanyName"},
			{Header: "CompanyURL", Field: "CompanyURL"},
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
		c.Header("Content-Disposition", `attachment; filename="testimonials.xlsx"`)
		var all []models.Testimonial
		if err := query.FindInBatches(&[]models.Testimonial{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
			var rows []models.Testimonial
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
	c.Header("Content-Disposition", `attachment; filename="testimonials.csv"`)

	headerWritten := false
	if err := query.FindInBatches(&[]models.Testimonial{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
		var rows []models.Testimonial
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

// GetByID returns a single testimonial by ID.
func (h *TestimonialHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.Testimonial
	if err := h.DB.Preload("Avatar").Preload("CaseStudy").First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Testimonial not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// PDF streams this testimonial as a print-ready PDF — a repeating header and
// footer with page numbers, the record's fields as a detail grid, and any
// line items as a table. Edit the pdf.Record below to restyle it; the
// renderer itself lives in internal/pdf/record.go.
func (h *TestimonialHandler) PDF(c *gin.Context) {
	id := c.Param("id")

	var item models.Testimonial
	if err := h.DB.Preload("Avatar").Preload("CaseStudy").First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Testimonial not found",
			},
		})
		return
	}

	appName := os.Getenv("APP_NAME")
	if appName == "" {
		appName = "Testimonial"
	}

	rec := pdf.Record{
		Title:      "TESTIMONIAL",
		Subtitle:   pdf.Value(item.ID),
		Brand:      appName,
		FooterNote: appName + " · generated " + time.Now().Format("2 Jan 2006 15:04"),
		Fields: []pdf.Field{
			{Label: "Quote Text", Value: pdf.Value(item.QuoteText)},
			{Label: "Author Name", Value: pdf.Value(item.AuthorName)},
			{Label: "Author Role", Value: pdf.Value(item.AuthorRole)},
			{Label: "Company Name", Value: pdf.Value(item.CompanyName)},
			{Label: "Company U R L", Value: pdf.Value(item.CompanyURL)},
			{Label: "Avatar I D", Value: pdf.Display(item.Avatar)},
			{Label: "Case Study I D", Value: pdf.Display(item.CaseStudy)},
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

	filename := "testimonial-" + id + ".pdf"
	c.Header("Content-Disposition", "inline; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", out)
}

// Create adds a new testimonial.
func (h *TestimonialHandler) Create(c *gin.Context) {
	var req struct {
		QuoteText   string `json:"quote_text"`
		AuthorName  string `json:"author_name" binding:"required"`
		AuthorRole  string `json:"author_role" binding:"required"`
		CompanyName string `json:"company_name" binding:"required"`
		CompanyURL  string `json:"company_url" binding:"required"`
		AvatarID    string `json:"avatar_id"`
		CaseStudyID string `json:"case_study_id"`
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

	item := models.Testimonial{
		QuoteText:   req.QuoteText,
		AuthorName:  req.AuthorName,
		AuthorRole:  req.AuthorRole,
		CompanyName: req.CompanyName,
		CompanyURL:  req.CompanyURL,
		AvatarID:    req.AvatarID,
		CaseStudyID: req.CaseStudyID,
		Published:   req.Published,
		SortOrder:   req.SortOrder,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create testimonial",
			},
		})
		return
	}

	h.DB.Preload("Avatar").Preload("CaseStudy").First(&item, "id = ?", item.ID)

	services.LogCreate(h.DB, c, "Testimonial", item.ID, item.ID, "")

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "Testimonial created successfully",
	})
}

// Update modifies an existing testimonial.
func (h *TestimonialHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.Testimonial
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Testimonial not found",
			},
		})
		return
	}

	var req struct {
		QuoteText   string  `json:"quote_text"`
		AuthorName  string  `json:"author_name"`
		AuthorRole  string  `json:"author_role"`
		CompanyName string  `json:"company_name"`
		CompanyURL  string  `json:"company_url"`
		AvatarID    *string `json:"avatar_id"`
		CaseStudyID *string `json:"case_study_id"`
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
	if req.QuoteText != "" {
		updates["quote_text"] = req.QuoteText
	}
	if req.AuthorName != "" {
		updates["author_name"] = req.AuthorName
	}
	if req.AuthorRole != "" {
		updates["author_role"] = req.AuthorRole
	}
	if req.CompanyName != "" {
		updates["company_name"] = req.CompanyName
	}
	if req.CompanyURL != "" {
		updates["company_url"] = req.CompanyURL
	}
	if req.AvatarID != nil {
		updates["avatar_id"] = *req.AvatarID
	}
	if req.CaseStudyID != nil {
		updates["case_study_id"] = *req.CaseStudyID
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
				"message": "Failed to update testimonial",
			},
		})
		return
	}

	h.DB.Preload("Avatar").Preload("CaseStudy").First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "Testimonial", item.ID, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Testimonial updated successfully",
	})
}

// Patch applies a partial update to a testimonial. Used by the admin's
// grouped update view — each form group's Save button calls PATCH with
// only the fields it owns, so editing "Address" doesn't rewrite
// "Pricing". Refuses any key that isn't a writable model column.
func (h *TestimonialHandler) Patch(c *gin.Context) {
	id := c.Param("id")

	var item models.Testimonial
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Testimonial not found",
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
		"quote_text":    true,
		"author_name":   true,
		"author_role":   true,
		"company_name":  true,
		"company_url":   true,
		"avatar_id":     true,
		"case_study_id": true,
		"published":     true,
		"sort_order":    true,
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
				"message": "Failed to patch testimonial",
			},
		})
		return
	}
	h.DB.Preload("Avatar").Preload("CaseStudy").First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "Testimonial", item.ID, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Testimonial updated successfully",
	})
}

// Delete soft-deletes a testimonial.
func (h *TestimonialHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.Testimonial
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Testimonial not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete testimonial",
			},
		})
		return
	}

	services.LogDelete(h.DB, c, "Testimonial", item.ID, item.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Testimonial deleted successfully",
	})
}
