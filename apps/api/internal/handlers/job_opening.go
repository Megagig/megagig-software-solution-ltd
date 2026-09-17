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

// JobOpeningHandler handles jobopening endpoints.
type JobOpeningHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of job_openings.
func (h *JobOpeningHandler) List(c *gin.Context) {
	query := h.DB.Model(&models.JobOpening{})

	res, err := paginate.List[models.JobOpening](
		query,
		paginate.Bind(c),
		paginate.Config{
			Searchable: []string{"title", "department", "location", "employment_type", "description", "apply_url"},
			Sortable:   map[string]bool{"id": true, "created_at": true, "title": true, "department": true, "location": true, "employment_type": true, "description": true, "apply_url": true},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch job_openings",
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
//	GET /api/job_openings/export?format=csv
//	GET /api/job_openings/export?format=xlsx&search=foo
func (h *JobOpeningHandler) Export(c *gin.Context) {
	const exportBatchSize = 1000

	format := c.DefaultQuery("format", "csv")
	search := c.Query("search")

	query := h.DB.Model(&models.JobOpening{}).Order("created_at desc")
	if search != "" && len([]string{"title", "department", "location", "employment_type", "description", "apply_url"}) > 0 {
		// Reuse the same searchable columns as List.
		searchable := []string{"title", "department", "location", "employment_type", "description", "apply_url"}
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
		Sheet: "JobOpenings",
		Columns: []export.Column{
			{Header: "ID", Field: "ID"},
			{Header: "Title", Field: "Title"},
			{Header: "Department", Field: "Department"},
			{Header: "Location", Field: "Location"},
			{Header: "EmploymentType", Field: "EmploymentType"},
			{Header: "Description", Field: "Description"},
			{Header: "ApplyURL", Field: "ApplyURL"},
			{Header: "IsOpen", Field: "IsOpen", Format: "bool"},
			{Header: "Created At", Field: "CreatedAt", Format: "date:2006-01-02"},
		},
	}

	// Stream rows in batches via GORM's FindInBatches. CSV writes each
	// batch straight to the wire; XLSX accumulates into a slice (no
	// streaming API in excelize) but at least we never load the whole
	// table at once.
	if format == "xlsx" {
		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Header("Content-Disposition", `attachment; filename="job_openings.xlsx"`)
		var all []models.JobOpening
		if err := query.FindInBatches(&[]models.JobOpening{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
			var rows []models.JobOpening
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
	c.Header("Content-Disposition", `attachment; filename="job_openings.csv"`)

	headerWritten := false
	if err := query.FindInBatches(&[]models.JobOpening{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
		var rows []models.JobOpening
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

// GetByID returns a single jobopening by ID.
func (h *JobOpeningHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.JobOpening
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "JobOpening not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// PDF streams this jobopening as a print-ready PDF — a repeating header and
// footer with page numbers, the record's fields as a detail grid, and any
// line items as a table. Edit the pdf.Record below to restyle it; the
// renderer itself lives in internal/pdf/record.go.
func (h *JobOpeningHandler) PDF(c *gin.Context) {
	id := c.Param("id")

	var item models.JobOpening
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "JobOpening not found",
			},
		})
		return
	}

	appName := os.Getenv("APP_NAME")
	if appName == "" {
		appName = "JobOpening"
	}

	rec := pdf.Record{
		Title:      "JOB OPENING",
		Subtitle:   pdf.Value(item.Title),
		Brand:      appName,
		FooterNote: appName + " · generated " + time.Now().Format("2 Jan 2006 15:04"),
		Fields: []pdf.Field{
			{Label: "Title", Value: pdf.Value(item.Title)},
			{Label: "Department", Value: pdf.Value(item.Department)},
			{Label: "Location", Value: pdf.Value(item.Location)},
			{Label: "Employment Type", Value: pdf.Value(item.EmploymentType)},
			{Label: "Description", Value: pdf.Value(item.Description)},
			{Label: "Apply U R L", Value: pdf.Value(item.ApplyURL)},
			{Label: "Is Open", Value: pdf.Value(item.IsOpen)},
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

	filename := "job-opening-" + id + ".pdf"
	c.Header("Content-Disposition", "inline; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", out)
}

// Create adds a new jobopening.
func (h *JobOpeningHandler) Create(c *gin.Context) {
	var req struct {
		Title          string `json:"title" binding:"required"`
		Department     string `json:"department" binding:"required"`
		Location       string `json:"location" binding:"required"`
		EmploymentType string `json:"employment_type" binding:"required"`
		Description    string `json:"description"`
		ApplyURL       string `json:"apply_url" binding:"required"`
		IsOpen         bool   `json:"is_open"`
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

	item := models.JobOpening{
		Title:          req.Title,
		Department:     req.Department,
		Location:       req.Location,
		EmploymentType: req.EmploymentType,
		Description:    req.Description,
		ApplyURL:       req.ApplyURL,
		IsOpen:         req.IsOpen,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create jobopening",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogCreate(h.DB, c, "JobOpening", item.Title, item.ID, "")

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "JobOpening created successfully",
	})
}

// Update modifies an existing jobopening.
func (h *JobOpeningHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.JobOpening
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "JobOpening not found",
			},
		})
		return
	}

	var req struct {
		Title          string `json:"title"`
		Department     string `json:"department"`
		Location       string `json:"location"`
		EmploymentType string `json:"employment_type"`
		Description    string `json:"description"`
		ApplyURL       string `json:"apply_url"`
		IsOpen         *bool  `json:"is_open"`
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
	if req.Department != "" {
		updates["department"] = req.Department
	}
	if req.Location != "" {
		updates["location"] = req.Location
	}
	if req.EmploymentType != "" {
		updates["employment_type"] = req.EmploymentType
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.ApplyURL != "" {
		updates["apply_url"] = req.ApplyURL
	}
	if req.IsOpen != nil {
		updates["is_open"] = *req.IsOpen
	}

	if err := h.DB.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update jobopening",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "JobOpening", item.Title, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "JobOpening updated successfully",
	})
}

// Patch applies a partial update to a jobopening. Used by the admin's
// grouped update view — each form group's Save button calls PATCH with
// only the fields it owns, so editing "Address" doesn't rewrite
// "Pricing". Refuses any key that isn't a writable model column.
func (h *JobOpeningHandler) Patch(c *gin.Context) {
	id := c.Param("id")

	var item models.JobOpening
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "JobOpening not found",
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
		"title":           true,
		"department":      true,
		"location":        true,
		"employment_type": true,
		"description":     true,
		"apply_url":       true,
		"is_open":         true,
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
				"message": "Failed to patch jobopening",
			},
		})
		return
	}
	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "JobOpening", item.Title, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "JobOpening updated successfully",
	})
}

// Delete soft-deletes a jobopening.
func (h *JobOpeningHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.JobOpening
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "JobOpening not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete jobopening",
			},
		})
		return
	}

	services.LogDelete(h.DB, c, "JobOpening", item.Title, item.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "JobOpening deleted successfully",
	})
}
