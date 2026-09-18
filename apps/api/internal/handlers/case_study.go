package handlers

import (
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/export"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/paginate"
	"megagig-software-solution/apps/api/internal/pdf"
	"megagig-software-solution/apps/api/internal/services"
)

// CaseStudyHandler handles casestudy endpoints.
type CaseStudyHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of case_studies.
func (h *CaseStudyHandler) List(c *gin.Context) {
	query := h.DB.Model(&models.CaseStudy{}).Preload("HeroImage").Preload("Testimonial")

	params := paginate.Bind(c).With("hero_image_id", c.Query("hero_image_id"))
	if pub := c.Query("published"); pub != "" {
		params = params.With("published", pub == "true")
	}

	res, err := paginate.List[models.CaseStudy](
		query,
		params,
		paginate.Config{
			Searchable: []string{"slug", "client_name", "tagline", "status_badge", "problem", "what_we_built", "result"},
			Sortable:   map[string]bool{"id": true, "created_at": true, "slug": true, "client_name": true, "tagline": true, "status_badge": true, "problem": true, "what_we_built": true, "result": true, "sort_order": true},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch case_studies",
			},
		})
		return
	}

	c.JSON(http.StatusOK, res)
}

// ListPublished returns a paginated list of published case studies
// (public, unauthenticated) — apps/web's case-study grid and Home's
// preview/selected-work sections. Unlike List, "published" is not a
// client-controlled filter here: it's always true, never client-set,
// per architecture.md rule #10.
func (h *CaseStudyHandler) ListPublished(c *gin.Context) {
	query := h.DB.Model(&models.CaseStudy{}).Preload("HeroImage").Preload("Testimonial").Where("published = ?", true)

	res, err := paginate.List[models.CaseStudy](
		query,
		paginate.Bind(c),
		paginate.Config{
			Searchable:   []string{"slug", "client_name", "tagline"},
			Sortable:     map[string]bool{"sort_order": true, "created_at": true},
			DefaultSort:  "sort_order",
			DefaultOrder: "asc",
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch case studies",
			},
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=60")
	c.JSON(http.StatusOK, res)
}

// GetBySlug returns a single published case study by slug (public,
// unauthenticated) — apps/web's /case-study/[slug] detail page.
func (h *CaseStudyHandler) GetBySlug(c *gin.Context) {
	slug := c.Param("slug")

	var item models.CaseStudy
	if err := h.DB.Preload("HeroImage").Preload("Testimonial").
		Where("slug = ? AND published = ?", slug, true).
		First(&item).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "CaseStudy not found",
			},
		})
		return
	}

	c.Header("Cache-Control", "public, max-age=60")
	c.JSON(http.StatusOK, gin.H{"data": item})
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
//	GET /api/case_studies/export?format=csv
//	GET /api/case_studies/export?format=xlsx&search=foo
func (h *CaseStudyHandler) Export(c *gin.Context) {
	const exportBatchSize = 1000

	format := c.DefaultQuery("format", "csv")
	search := c.Query("search")

	query := h.DB.Model(&models.CaseStudy{}).Preload("HeroImage").Order("created_at desc")
	if search != "" && len([]string{"slug", "client_name", "tagline", "status_badge", "problem", "what_we_built", "result"}) > 0 {
		// Reuse the same searchable columns as List.
		searchable := []string{"slug", "client_name", "tagline", "status_badge", "problem", "what_we_built", "result"}
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
		Sheet: "CaseStudies",
		Columns: []export.Column{
			{Header: "ID", Field: "ID"},
			{Header: "Slug", Field: "Slug"},
			{Header: "ClientName", Field: "ClientName"},
			{Header: "Tagline", Field: "Tagline"},
			{Header: "CategoryTags", Field: "CategoryTags"},
			{Header: "StatusBadge", Field: "StatusBadge"},
			{Header: "Problem", Field: "Problem"},
			{Header: "WhatWeBuilt", Field: "WhatWeBuilt"},
			{Header: "Result", Field: "Result"},
			{Header: "TechStack", Field: "TechStack"},
			{Header: "LiveURL", Field: "LiveURL"},
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
		c.Header("Content-Disposition", `attachment; filename="case_studies.xlsx"`)
		var all []models.CaseStudy
		if err := query.FindInBatches(&[]models.CaseStudy{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
			var rows []models.CaseStudy
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
	c.Header("Content-Disposition", `attachment; filename="case_studies.csv"`)

	headerWritten := false
	if err := query.FindInBatches(&[]models.CaseStudy{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
		var rows []models.CaseStudy
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

// GetByID returns a single casestudy by ID.
func (h *CaseStudyHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.CaseStudy
	if err := h.DB.Preload("HeroImage").Preload("Testimonial").First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "CaseStudy not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// PDF streams this casestudy as a print-ready PDF — a repeating header and
// footer with page numbers, the record's fields as a detail grid, and any
// line items as a table. Edit the pdf.Record below to restyle it; the
// renderer itself lives in internal/pdf/record.go.
func (h *CaseStudyHandler) PDF(c *gin.Context) {
	id := c.Param("id")

	var item models.CaseStudy
	if err := h.DB.Preload("HeroImage").First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "CaseStudy not found",
			},
		})
		return
	}

	appName := os.Getenv("APP_NAME")
	if appName == "" {
		appName = "CaseStudy"
	}

	rec := pdf.Record{
		Title:      "CASE STUDY",
		Subtitle:   pdf.Value(item.Slug),
		Brand:      appName,
		FooterNote: appName + " · generated " + time.Now().Format("2 Jan 2006 15:04"),
		Fields: []pdf.Field{
			{Label: "Slug", Value: pdf.Value(item.Slug)},
			{Label: "Client Name", Value: pdf.Value(item.ClientName)},
			{Label: "Tagline", Value: pdf.Value(item.Tagline)},
			{Label: "Status Badge", Value: pdf.Value(item.StatusBadge)},
			{Label: "Hero Image I D", Value: pdf.Display(item.HeroImage)},
			{Label: "Problem", Value: pdf.Value(item.Problem)},
			{Label: "What We Built", Value: pdf.Value(item.WhatWeBuilt)},
			{Label: "Result", Value: pdf.Value(item.Result)},
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

	filename := "case-study-" + id + ".pdf"
	c.Header("Content-Disposition", "inline; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", out)
}

// Create adds a new casestudy.
func (h *CaseStudyHandler) Create(c *gin.Context) {
	var req struct {
		Slug          string                      `json:"slug" binding:"required"`
		ClientName    string                      `json:"client_name" binding:"required"`
		Tagline       string                      `json:"tagline" binding:"required"`
		CategoryTags  datatypes.JSONSlice[string] `json:"category_tags"`
		StatusBadge   string                      `json:"status_badge" binding:"required"`
		HeroImageID   string                      `json:"hero_image_id" binding:"required"`
		Problem       string                      `json:"problem"`
		WhatWeBuilt   string                      `json:"what_we_built"`
		Result        string                      `json:"result"`
		TechStack     datatypes.JSONSlice[string] `json:"tech_stack"`
		LiveURL       string                      `json:"live_url"`
		TestimonialID string                      `json:"testimonial_id"`
		Published     bool                        `json:"published"`
		SortOrder     int                         `json:"sort_order"`
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

	item := models.CaseStudy{
		Slug:          req.Slug,
		ClientName:    req.ClientName,
		Tagline:       req.Tagline,
		CategoryTags:  req.CategoryTags,
		StatusBadge:   req.StatusBadge,
		HeroImageID:   req.HeroImageID,
		Problem:       req.Problem,
		WhatWeBuilt:   req.WhatWeBuilt,
		Result:        req.Result,
		TechStack:     req.TechStack,
		LiveURL:       req.LiveURL,
		TestimonialID: req.TestimonialID,
		Published:     req.Published,
		SortOrder:     req.SortOrder,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create casestudy",
			},
		})
		return
	}

	h.DB.Preload("HeroImage").Preload("Testimonial").First(&item, "id = ?", item.ID)

	services.LogCreate(h.DB, c, "CaseStudy", item.Slug, item.ID, "")

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "CaseStudy created successfully",
	})
}

// Update modifies an existing casestudy.
func (h *CaseStudyHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.CaseStudy
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "CaseStudy not found",
			},
		})
		return
	}

	var req struct {
		Slug          string                       `json:"slug"`
		ClientName    string                       `json:"client_name"`
		Tagline       string                       `json:"tagline"`
		CategoryTags  *datatypes.JSONSlice[string] `json:"category_tags"`
		StatusBadge   string                       `json:"status_badge"`
		HeroImageID   *string                      `json:"hero_image_id"`
		Problem       string                       `json:"problem"`
		WhatWeBuilt   string                       `json:"what_we_built"`
		Result        string                       `json:"result"`
		TechStack     *datatypes.JSONSlice[string] `json:"tech_stack"`
		LiveURL       string                       `json:"live_url"`
		TestimonialID *string                      `json:"testimonial_id"`
		Published     *bool                        `json:"published"`
		SortOrder     *int                         `json:"sort_order"`
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
	if req.Slug != "" {
		updates["slug"] = req.Slug
	}
	if req.ClientName != "" {
		updates["client_name"] = req.ClientName
	}
	if req.Tagline != "" {
		updates["tagline"] = req.Tagline
	}
	if req.CategoryTags != nil {
		updates["category_tags"] = *req.CategoryTags
	}
	if req.StatusBadge != "" {
		updates["status_badge"] = req.StatusBadge
	}
	if req.HeroImageID != nil {
		updates["hero_image_id"] = *req.HeroImageID
	}
	if req.Problem != "" {
		updates["problem"] = req.Problem
	}
	if req.WhatWeBuilt != "" {
		updates["what_we_built"] = req.WhatWeBuilt
	}
	if req.Result != "" {
		updates["result"] = req.Result
	}
	if req.TechStack != nil {
		updates["tech_stack"] = *req.TechStack
	}
	if req.LiveURL != "" {
		updates["live_url"] = req.LiveURL
	}
	if req.TestimonialID != nil {
		updates["testimonial_id"] = *req.TestimonialID
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
				"message": "Failed to update casestudy",
			},
		})
		return
	}

	h.DB.Preload("HeroImage").Preload("Testimonial").First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "CaseStudy", item.Slug, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "CaseStudy updated successfully",
	})
}

// Patch applies a partial update to a casestudy. Used by the admin's
// grouped update view — each form group's Save button calls PATCH with
// only the fields it owns, so editing "Address" doesn't rewrite
// "Pricing". Refuses any key that isn't a writable model column.
func (h *CaseStudyHandler) Patch(c *gin.Context) {
	id := c.Param("id")

	var item models.CaseStudy
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "CaseStudy not found",
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
		"slug":           true,
		"client_name":    true,
		"tagline":        true,
		"category_tags":  true,
		"status_badge":   true,
		"hero_image_id":  true,
		"problem":        true,
		"what_we_built":  true,
		"result":         true,
		"tech_stack":     true,
		"live_url":       true,
		"testimonial_id": true,
		"published":      true,
		"sort_order":     true,
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
				"message": "Failed to patch casestudy",
			},
		})
		return
	}
	h.DB.Preload("HeroImage").Preload("Testimonial").First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "CaseStudy", item.Slug, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "CaseStudy updated successfully",
	})
}

// Delete soft-deletes a casestudy.
func (h *CaseStudyHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.CaseStudy
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "CaseStudy not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete casestudy",
			},
		})
		return
	}

	services.LogDelete(h.DB, c, "CaseStudy", item.Slug, item.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "CaseStudy deleted successfully",
	})
}
