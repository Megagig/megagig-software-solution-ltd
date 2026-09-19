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

// StatHandler handles stat endpoints.
type StatHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of stats.
func (h *StatHandler) List(c *gin.Context) {
	query := h.DB.Model(&models.Stat{})

	res, err := paginate.List[models.Stat](
		query,
		paginate.Bind(c),
		paginate.Config{
			Searchable: []string{"value", "label"},
			Sortable:   map[string]bool{"id": true, "created_at": true, "value": true, "label": true, "sort_order": true},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch stats",
			},
		})
		return
	}

	c.JSON(http.StatusOK, res)
}

// ListPublished returns published stats in curated order (public,
// unauthenticated) — the single source for Home's OurStory/ClosingCta,
// /pricing and /about-us trust numbers.
func (h *StatHandler) ListPublished(c *gin.Context) {
	query := h.DB.Model(&models.Stat{}).Where("published = ?", true)

	res, err := paginate.List[models.Stat](
		query,
		paginate.Bind(c),
		paginate.Config{
			Searchable:   []string{"value", "label"},
			Sortable:     map[string]bool{"sort_order": true, "created_at": true},
			DefaultSort:  "sort_order",
			DefaultOrder: "asc",
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch stats",
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
//	GET /api/stats/export?format=csv
//	GET /api/stats/export?format=xlsx&search=foo
func (h *StatHandler) Export(c *gin.Context) {
	const exportBatchSize = 1000

	format := c.DefaultQuery("format", "csv")
	search := c.Query("search")

	query := h.DB.Model(&models.Stat{}).Order("created_at desc")
	if search != "" && len([]string{"value", "label"}) > 0 {
		// Reuse the same searchable columns as List.
		searchable := []string{"value", "label"}
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
		Sheet: "Stats",
		Columns: []export.Column{
			{Header: "ID", Field: "ID"},
			{Header: "Value", Field: "Value"},
			{Header: "Label", Field: "Label"},
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
		c.Header("Content-Disposition", `attachment; filename="stats.xlsx"`)
		var all []models.Stat
		if err := query.FindInBatches(&[]models.Stat{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
			var rows []models.Stat
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
	c.Header("Content-Disposition", `attachment; filename="stats.csv"`)

	headerWritten := false
	if err := query.FindInBatches(&[]models.Stat{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
		var rows []models.Stat
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

// GetByID returns a single stat by ID.
func (h *StatHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.Stat
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Stat not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// PDF streams this stat as a print-ready PDF — a repeating header and
// footer with page numbers, the record's fields as a detail grid, and any
// line items as a table. Edit the pdf.Record below to restyle it; the
// renderer itself lives in internal/pdf/record.go.
func (h *StatHandler) PDF(c *gin.Context) {
	id := c.Param("id")

	var item models.Stat
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Stat not found",
			},
		})
		return
	}

	appName := os.Getenv("APP_NAME")
	if appName == "" {
		appName = "Stat"
	}

	rec := pdf.Record{
		Title:      "STAT",
		Subtitle:   pdf.Value(item.Label),
		Brand:      appName,
		FooterNote: appName + " · generated " + time.Now().Format("2 Jan 2006 15:04"),
		Fields: []pdf.Field{
			{Label: "Value", Value: pdf.Value(item.Value)},
			{Label: "Label", Value: pdf.Value(item.Label)},
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

	filename := "stat-" + id + ".pdf"
	c.Header("Content-Disposition", "inline; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", out)
}

// Create adds a new stat.
func (h *StatHandler) Create(c *gin.Context) {
	var req struct {
		Value     string `json:"value" binding:"required"`
		Label     string `json:"label" binding:"required"`
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

	item := models.Stat{
		Value:     req.Value,
		Label:     req.Label,
		Published: req.Published,
		SortOrder: req.SortOrder,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create stat",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogCreate(h.DB, c, "Stat", item.Label, item.ID, "")

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "Stat created successfully",
	})
}

// Update modifies an existing stat.
func (h *StatHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.Stat
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Stat not found",
			},
		})
		return
	}

	var req struct {
		Value     string `json:"value"`
		Label     string `json:"label"`
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
	if req.Value != "" {
		updates["value"] = req.Value
	}
	if req.Label != "" {
		updates["label"] = req.Label
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
				"message": "Failed to update stat",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "Stat", item.Label, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Stat updated successfully",
	})
}

// Patch applies a partial update to a stat. Used by the admin's
// grouped update view — each form group's Save button calls PATCH with
// only the fields it owns, so editing "Address" doesn't rewrite
// "Pricing". Refuses any key that isn't a writable model column.
func (h *StatHandler) Patch(c *gin.Context) {
	id := c.Param("id")

	var item models.Stat
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Stat not found",
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
		"value":      true,
		"label":      true,
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
				"message": "Failed to patch stat",
			},
		})
		return
	}
	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "Stat", item.Label, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Stat updated successfully",
	})
}

// Delete soft-deletes a stat.
func (h *StatHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.Stat
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Stat not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete stat",
			},
		})
		return
	}

	services.LogDelete(h.DB, c, "Stat", item.Label, item.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Stat deleted successfully",
	})
}
