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

// FAQHandler handles faq endpoints.
type FAQHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of faqs.
func (h *FAQHandler) List(c *gin.Context) {
	query := h.DB.Model(&models.FAQ{})

	res, err := paginate.List[models.FAQ](
		query,
		paginate.Bind(c),
		paginate.Config{
			Searchable: []string{"question", "answer"},
			Sortable:   map[string]bool{"id": true, "created_at": true, "question": true, "answer": true, "sort_order": true},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch faqs",
			},
		})
		return
	}

	c.JSON(http.StatusOK, res)
}

// ListPublished returns a paginated list of published FAQs (public,
// unauthenticated) — apps/web's FAQ accordion on Home. No GetBySlug:
// FAQ has no slug field and no detail page.
func (h *FAQHandler) ListPublished(c *gin.Context) {
	query := h.DB.Model(&models.FAQ{}).Where("published = ?", true)

	res, err := paginate.List[models.FAQ](
		query,
		paginate.Bind(c),
		paginate.Config{
			Searchable:   []string{"question", "answer"},
			Sortable:     map[string]bool{"sort_order": true, "created_at": true},
			DefaultSort:  "sort_order",
			DefaultOrder: "asc",
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch faqs",
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
//	GET /api/faqs/export?format=csv
//	GET /api/faqs/export?format=xlsx&search=foo
func (h *FAQHandler) Export(c *gin.Context) {
	const exportBatchSize = 1000

	format := c.DefaultQuery("format", "csv")
	search := c.Query("search")

	query := h.DB.Model(&models.FAQ{}).Order("created_at desc")
	if search != "" && len([]string{"question", "answer"}) > 0 {
		// Reuse the same searchable columns as List.
		searchable := []string{"question", "answer"}
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
		Sheet: "Faqs",
		Columns: []export.Column{
			{Header: "ID", Field: "ID"},
			{Header: "Question", Field: "Question"},
			{Header: "Answer", Field: "Answer"},
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
		c.Header("Content-Disposition", `attachment; filename="faqs.xlsx"`)
		var all []models.FAQ
		if err := query.FindInBatches(&[]models.FAQ{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
			var rows []models.FAQ
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
	c.Header("Content-Disposition", `attachment; filename="faqs.csv"`)

	headerWritten := false
	if err := query.FindInBatches(&[]models.FAQ{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
		var rows []models.FAQ
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

// GetByID returns a single faq by ID.
func (h *FAQHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.FAQ
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "FAQ not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// PDF streams this faq as a print-ready PDF — a repeating header and
// footer with page numbers, the record's fields as a detail grid, and any
// line items as a table. Edit the pdf.Record below to restyle it; the
// renderer itself lives in internal/pdf/record.go.
func (h *FAQHandler) PDF(c *gin.Context) {
	id := c.Param("id")

	var item models.FAQ
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "FAQ not found",
			},
		})
		return
	}

	appName := os.Getenv("APP_NAME")
	if appName == "" {
		appName = "FAQ"
	}

	rec := pdf.Record{
		Title:      "F A Q",
		Subtitle:   pdf.Value(item.ID),
		Brand:      appName,
		FooterNote: appName + " · generated " + time.Now().Format("2 Jan 2006 15:04"),
		Fields: []pdf.Field{
			{Label: "Question", Value: pdf.Value(item.Question)},
			{Label: "Answer", Value: pdf.Value(item.Answer)},
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

	filename := "faq-" + id + ".pdf"
	c.Header("Content-Disposition", "inline; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", out)
}

// Create adds a new faq.
func (h *FAQHandler) Create(c *gin.Context) {
	var req struct {
		Question  string `json:"question" binding:"required"`
		Answer    string `json:"answer"`
		Published bool   `json:"published"`
		SortOrder int    `json:"sort_order"`
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

	item := models.FAQ{
		Question:  req.Question,
		Answer:    req.Answer,
		Published: req.Published,
		SortOrder: req.SortOrder,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create faq",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogCreate(h.DB, c, "FAQ", item.ID, item.ID, "")

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "FAQ created successfully",
	})
}

// Update modifies an existing faq.
func (h *FAQHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.FAQ
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "FAQ not found",
			},
		})
		return
	}

	var req struct {
		Question  string `json:"question"`
		Answer    string `json:"answer"`
		Published *bool  `json:"published"`
		SortOrder *int   `json:"sort_order"`
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
	if req.Question != "" {
		updates["question"] = req.Question
	}
	if req.Answer != "" {
		updates["answer"] = req.Answer
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
				"message": "Failed to update faq",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "FAQ", item.ID, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "FAQ updated successfully",
	})
}

// Patch applies a partial update to a faq. Used by the admin's
// grouped update view — each form group's Save button calls PATCH with
// only the fields it owns, so editing "Address" doesn't rewrite
// "Pricing". Refuses any key that isn't a writable model column.
func (h *FAQHandler) Patch(c *gin.Context) {
	id := c.Param("id")

	var item models.FAQ
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "FAQ not found",
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
		"question":   true,
		"answer":     true,
		"published":  true,
		"sort_order": true,
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
				"message": "Failed to patch faq",
			},
		})
		return
	}
	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "FAQ", item.ID, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "FAQ updated successfully",
	})
}

// Delete soft-deletes a faq.
func (h *FAQHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.FAQ
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "FAQ not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete faq",
			},
		})
		return
	}

	services.LogDelete(h.DB, c, "FAQ", item.ID, item.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "FAQ deleted successfully",
	})
}
