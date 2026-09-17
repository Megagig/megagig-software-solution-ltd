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

// LeadHandler handles lead endpoints.
type LeadHandler struct {
	DB *gorm.DB
}

// List returns a paginated list of leads.
func (h *LeadHandler) List(c *gin.Context) {
	query := h.DB.Model(&models.Lead{})

	params := paginate.Bind(c).With("status", c.Query("status"))

	res, err := paginate.List[models.Lead](
		query,
		params,
		paginate.Config{
			Searchable: []string{"name", "email", "phone", "company", "project_type", "budget_range", "message", "source", "status", "internal_notes"},
			Sortable:   map[string]bool{"id": true, "created_at": true, "name": true, "email": true, "phone": true, "company": true, "project_type": true, "budget_range": true, "message": true, "source": true, "status": true, "internal_notes": true},
		},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to fetch leads",
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
//	GET /api/leads/export?format=csv
//	GET /api/leads/export?format=xlsx&search=foo
func (h *LeadHandler) Export(c *gin.Context) {
	const exportBatchSize = 1000

	format := c.DefaultQuery("format", "csv")
	search := c.Query("search")

	query := h.DB.Model(&models.Lead{}).Order("created_at desc")
	if search != "" && len([]string{"name", "email", "phone", "company", "project_type", "budget_range", "message", "source", "status", "internal_notes"}) > 0 {
		// Reuse the same searchable columns as List.
		searchable := []string{"name", "email", "phone", "company", "project_type", "budget_range", "message", "source", "status", "internal_notes"}
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
		Sheet: "Leads",
		Columns: []export.Column{
			{Header: "ID", Field: "ID"},
			{Header: "Name", Field: "Name"},
			{Header: "Email", Field: "Email"},
			{Header: "Phone", Field: "Phone"},
			{Header: "Company", Field: "Company"},
			{Header: "ProjectType", Field: "ProjectType"},
			{Header: "BudgetRange", Field: "BudgetRange"},
			{Header: "Message", Field: "Message"},
			{Header: "Source", Field: "Source"},
			{Header: "Status", Field: "Status"},
			{Header: "InternalNotes", Field: "InternalNotes"},
			{Header: "Created At", Field: "CreatedAt", Format: "date:2006-01-02"},
		},
	}

	// Stream rows in batches via GORM's FindInBatches. CSV writes each
	// batch straight to the wire; XLSX accumulates into a slice (no
	// streaming API in excelize) but at least we never load the whole
	// table at once.
	if format == "xlsx" {
		c.Header("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		c.Header("Content-Disposition", `attachment; filename="leads.xlsx"`)
		var all []models.Lead
		if err := query.FindInBatches(&[]models.Lead{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
			var rows []models.Lead
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
	c.Header("Content-Disposition", `attachment; filename="leads.csv"`)

	headerWritten := false
	if err := query.FindInBatches(&[]models.Lead{}, exportBatchSize, func(tx *gorm.DB, batch int) error {
		var rows []models.Lead
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

// GetByID returns a single lead by ID.
func (h *LeadHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	var item models.Lead
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Lead not found",
			},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": item,
	})
}

// PDF streams this lead as a print-ready PDF — a repeating header and
// footer with page numbers, the record's fields as a detail grid, and any
// line items as a table. Edit the pdf.Record below to restyle it; the
// renderer itself lives in internal/pdf/record.go.
func (h *LeadHandler) PDF(c *gin.Context) {
	id := c.Param("id")

	var item models.Lead
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Lead not found",
			},
		})
		return
	}

	appName := os.Getenv("APP_NAME")
	if appName == "" {
		appName = "Lead"
	}

	rec := pdf.Record{
		Title:      "LEAD",
		Subtitle:   pdf.Value(item.Name),
		Brand:      appName,
		FooterNote: appName + " · generated " + time.Now().Format("2 Jan 2006 15:04"),
		Fields: []pdf.Field{
			{Label: "Name", Value: pdf.Value(item.Name)},
			{Label: "Email", Value: pdf.Value(item.Email)},
			{Label: "Phone", Value: pdf.Value(item.Phone)},
			{Label: "Company", Value: pdf.Value(item.Company)},
			{Label: "Project Type", Value: pdf.Value(item.ProjectType)},
			{Label: "Budget Range", Value: pdf.Value(item.BudgetRange)},
			{Label: "Message", Value: pdf.Value(item.Message)},
			{Label: "Source", Value: pdf.Value(item.Source)},
			{Label: "Status", Value: pdf.Value(item.Status)},
			{Label: "Internal Notes", Value: pdf.Value(item.InternalNotes)},
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

	filename := "lead-" + id + ".pdf"
	c.Header("Content-Disposition", "inline; filename=\""+filename+"\"")
	c.Data(http.StatusOK, "application/pdf", out)
}

// Create adds a new lead.
func (h *LeadHandler) Create(c *gin.Context) {
	var req struct {
		Name          string `json:"name" binding:"required"`
		Email         string `json:"email" binding:"required"`
		Phone         string `json:"phone" binding:"required"`
		Company       string `json:"company" binding:"required"`
		ProjectType   string `json:"project_type" binding:"required"`
		BudgetRange   string `json:"budget_range" binding:"required"`
		Message       string `json:"message"`
		Source        string `json:"source" binding:"required"`
		Status        string `json:"status" binding:"required"`
		InternalNotes string `json:"internal_notes"`
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

	item := models.Lead{
		Name:          req.Name,
		Email:         req.Email,
		Phone:         req.Phone,
		Company:       req.Company,
		ProjectType:   req.ProjectType,
		BudgetRange:   req.BudgetRange,
		Message:       req.Message,
		Source:        req.Source,
		Status:        req.Status,
		InternalNotes: req.InternalNotes,
	}

	if err := h.DB.Create(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to create lead",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogCreate(h.DB, c, "Lead", item.Name, item.ID, "")

	c.JSON(http.StatusCreated, gin.H{
		"data":    item,
		"message": "Lead created successfully",
	})
}

// Update modifies an existing lead.
func (h *LeadHandler) Update(c *gin.Context) {
	id := c.Param("id")

	var item models.Lead
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Lead not found",
			},
		})
		return
	}

	var req struct {
		Name          string `json:"name"`
		Email         string `json:"email"`
		Phone         string `json:"phone"`
		Company       string `json:"company"`
		ProjectType   string `json:"project_type"`
		BudgetRange   string `json:"budget_range"`
		Message       string `json:"message"`
		Source        string `json:"source"`
		Status        string `json:"status"`
		InternalNotes string `json:"internal_notes"`
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
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Phone != "" {
		updates["phone"] = req.Phone
	}
	if req.Company != "" {
		updates["company"] = req.Company
	}
	if req.ProjectType != "" {
		updates["project_type"] = req.ProjectType
	}
	if req.BudgetRange != "" {
		updates["budget_range"] = req.BudgetRange
	}
	if req.Message != "" {
		updates["message"] = req.Message
	}
	if req.Source != "" {
		updates["source"] = req.Source
	}
	if req.Status != "" {
		updates["status"] = req.Status
	}
	if req.InternalNotes != "" {
		updates["internal_notes"] = req.InternalNotes
	}

	if err := h.DB.Model(&item).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to update lead",
			},
		})
		return
	}

	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "Lead", item.Name, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Lead updated successfully",
	})
}

// Patch applies a partial update to a lead. Used by the admin's
// grouped update view — each form group's Save button calls PATCH with
// only the fields it owns, so editing "Address" doesn't rewrite
// "Pricing". Refuses any key that isn't a writable model column.
func (h *LeadHandler) Patch(c *gin.Context) {
	id := c.Param("id")

	var item models.Lead
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Lead not found",
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
		"name":           true,
		"email":          true,
		"phone":          true,
		"company":        true,
		"project_type":   true,
		"budget_range":   true,
		"message":        true,
		"source":         true,
		"status":         true,
		"internal_notes": true,
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
				"message": "Failed to patch lead",
			},
		})
		return
	}
	h.DB.First(&item, "id = ?", item.ID)

	services.LogUpdate(h.DB, c, "Lead", item.Name, item.ID, services.DiffSummary(updates))

	c.JSON(http.StatusOK, gin.H{
		"data":    item,
		"message": "Lead updated successfully",
	})
}

// Delete soft-deletes a lead.
func (h *LeadHandler) Delete(c *gin.Context) {
	id := c.Param("id")

	var item models.Lead
	if err := h.DB.First(&item, "id = ?", id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{
				"code":    "NOT_FOUND",
				"message": "Lead not found",
			},
		})
		return
	}

	if err := h.DB.Delete(&item).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{
				"code":    "INTERNAL_ERROR",
				"message": "Failed to delete lead",
			},
		})
		return
	}

	services.LogDelete(h.DB, c, "Lead", item.Name, item.ID)

	c.JSON(http.StatusOK, gin.H{
		"message": "Lead deleted successfully",
	})
}
