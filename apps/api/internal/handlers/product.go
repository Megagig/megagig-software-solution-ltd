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

// ProductHandler handles product endpoints.
type ProductHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of products.
func (h *ProductHandler) List(c *gin.Context) {
	query := h.DB.Model(&models.Product{}).Preload("Screenshots")

	params := paginate.Bind(c)
	if pub := c.Query("published"); pub != "" {
		params = params.With("published", pub == "true")
	}

	res, err := paginate.List[models.Product](
		query,
		params,
		paginate.Config{
			Searchable: []string{"slug", "name", "tagline", "description", "live_url", "docs_url"},
			Sortable:   map[string]bool{"id": true, "created_at": true, "slug": true, "name": true, "tagline": true, "description": true, "live_url": true, "docs_url": true, "sort_order": true},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch products",
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
//	GET /api/products/export?format=csv
//	GET /api/products/export?format=xlsx&search=foo
func (h *ProductHandler) Export(c *gin.Context) {
	const exportBatchSize = 1000

	format := c.DefaultQuery("format", "csv")
	search := c.Query("search")

	query := h.DB.Model(&models.Product{}).Preload("Screenshots").Order("created_at desc")
	if search != "" && len([]string{"slug", "name", "tagline", "description", "live_url", "docs_url"}) > 0 {
		// Reuse the same searchable columns as List.
		searchable := []string{"slug", "name", "tagline", "description", "live_url", "docs_url"}
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
		Sheet: "Products",
		Columns: []export.Column{
			{Header: "ID", Field: "ID"},
			{Header: "Slug", Field: "Slug"},
			{Header: "Name", Field: "Name"},
			{Header: "Tagline", Field: "Tagline"},
			{Header: "Description", Field: "Description"},
			{Header: "FeatureBullets", Field: "FeatureBullets"},
			{Header: "LiveURL", Field: "LiveURL"},
			{Header: "DocsURL", Field: "DocsURL"},
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
		c.Header("Content-Disposition", `attachment; filename="products.xlsx"`)
		var all []models.Product
		if err := query.FindInBatches(&[]models.Product{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
			var rows []models.Product
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
	c.Header("Content-Disposition", `attachment; filename="products.csv"`)

	headerWritten := false
	if err := query.FindInBatches(&[]models.Product{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
		var rows []models.Product
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

// GetByID returns a single product by ID.
func (h *ProductHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.Product
	if err := h.DB.Preload("Screenshots").First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Product not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// PDF streams this product as a print-ready PDF — a repeating header and
// footer with page numbers, the record's fields as a detail grid, and any
// line items as a table. Edit the pdf.Record below to restyle it; the
// renderer itself lives in internal/pdf/record.go.
func (h *ProductHandler) PDF(c *gin.Context) {
	id := c.Param("id")

	var item models.Product
	if err := h.DB.Preload("Screenshots").First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Product not found",
			},
		})
		return
	}

	appName := os.Getenv("APP_NAME")
	if appName == "" {
		appName = "Product"
	}

	rec := pdf.Record{
		Title:      "PRODUCT",
		Subtitle:   pdf.Value(item.Name),
		Brand:      appName,
		FooterNote: appName + " · generated " + time.Now().Format("2 Jan 2006 15:04"),
		Fields: []pdf.Field{
			{Label: "Slug", Value: pdf.Value(item.Slug)},
			{Label: "Name", Value: pdf.Value(item.Name)},
			{Label: "Tagline", Value: pdf.Value(item.Tagline)},
			{Label: "Description", Value: pdf.Value(item.Description)},
			{Label: "Live U R L", Value: pdf.Value(item.LiveURL)},
			{Label: "Docs U R L", Value: pdf.Value(item.DocsURL)},
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

	filename := "product-" + id + ".pdf"
	c.Header("Content-Disposition", "inline; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", out)
}

// Create adds a new product.
func (h *ProductHandler) Create(c *gin.Context) {
	var req struct {
		Slug           string                      `json:"slug" binding:"required"`
		Name           string                      `json:"name" binding:"required"`
		Tagline        string                      `json:"tagline" binding:"required"`
		Description    string                      `json:"description"`
		FeatureBullets datatypes.JSONSlice[string] `json:"feature_bullets"`
		LiveURL        string                      `json:"live_url" binding:"required"`
		DocsURL        string                      `json:"docs_url" binding:"required"`
		ScreenshotsIDs []string                    `json:"screenshot_ids"`
		Published      bool                        `json:"published"`
		SortOrder      int                         `json:"sort_order"`
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

	item := models.Product{
		Slug:           req.Slug,
		Name:           req.Name,
		Tagline:        req.Tagline,
		Description:    req.Description,
		FeatureBullets: req.FeatureBullets,
		LiveURL:        req.LiveURL,
		DocsURL:        req.DocsURL,
		Published:      req.Published,
		SortOrder:      req.SortOrder,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create product",
			},
		})
		return
	}

	if len(req.ScreenshotsIDs) > 0 {
		var screenshots []models.Upload
		h.DB.Find(&screenshots, req.ScreenshotsIDs)
		h.DB.Model(&item).Association("Screenshots").Replace(screenshots)
	}

	h.DB.Preload("Screenshots").First(&item, "id = ?", item.ID)

	services.LogCreate(h.DB, c, "Product", item.Name, item.ID, "")

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "Product created successfully",
	})
}

// Update modifies an existing product.
func (h *ProductHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.Product
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Product not found",
			},
		})
		return
	}

	var req struct {
		Slug           string                       `json:"slug"`
		Name           string                       `json:"name"`
		Tagline        string                       `json:"tagline"`
		Description    string                       `json:"description"`
		FeatureBullets *datatypes.JSONSlice[string] `json:"feature_bullets"`
		LiveURL        string                       `json:"live_url"`
		DocsURL        string                       `json:"docs_url"`
		ScreenshotsIDs *[]string                    `json:"screenshot_ids"`
		Published      *bool                        `json:"published"`
		SortOrder      *int                         `json:"sort_order"`
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
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.Tagline != "" {
		updates["tagline"] = req.Tagline
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.FeatureBullets != nil {
		updates["feature_bullets"] = *req.FeatureBullets
	}
	if req.LiveURL != "" {
		updates["live_url"] = req.LiveURL
	}
	if req.DocsURL != "" {
		updates["docs_url"] = req.DocsURL
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
				"message": "Failed to update product",
			},
		})
		return
	}

	if req.ScreenshotsIDs != nil {
		var screenshots []models.Upload
		if len(*req.ScreenshotsIDs) > 0 {
			h.DB.Find(&screenshots, *req.ScreenshotsIDs)
		}
		h.DB.Model(&item).Association("Screenshots").Replace(screenshots)
	}

	h.DB.Preload("Screenshots").First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "Product", item.Name, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Product updated successfully",
	})
}

// Patch applies a partial update to a product. Used by the admin's
// grouped update view — each form group's Save button calls PATCH with
// only the fields it owns, so editing "Address" doesn't rewrite
// "Pricing". Refuses any key that isn't a writable model column.
func (h *ProductHandler) Patch(c *gin.Context) {
	id := c.Param("id")

	var item models.Product
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Product not found",
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
		"slug":            true,
		"name":            true,
		"tagline":         true,
		"description":     true,
		"feature_bullets": true,
		"live_url":        true,
		"docs_url":        true,
		"published":       true,
		"sort_order":      true,
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
				"message": "Failed to patch product",
			},
		})
		return
	}
	h.DB.Preload("Screenshots").First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "Product", item.Name, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Product updated successfully",
	})
}

// Delete soft-deletes a product.
func (h *ProductHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.Product
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Product not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete product",
			},
		})
		return
	}

	services.LogDelete(h.DB, c, "Product", item.Name, item.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Product deleted successfully",
	})
}
