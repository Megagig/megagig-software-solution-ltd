package handlers

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm/clause"

	"megagig-software-solution/apps/api/internal/models"
)

// Import kicks off a BACKGROUND CSV import of job_openings. It streams the upload
// to a temp file (so a large file never sits in memory), creates an ImportJob,
// then processes rows in a goroutine and returns 202 immediately. Poll
// GET /imports/:id for progress and the result.
func (h *JobOpeningHandler) Import(c *gin.Context) {
	file, _, err := c.Request.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "INVALID_FILE", "message": "No CSV file provided"},
		})
		return
	}
	defer file.Close()

	// Stream the upload to a temp file — never ReadAll a large CSV into memory.
	tmp, err := os.CreateTemp("", "grit-import-*.csv")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TEMP_ERROR", "message": "Could not buffer the upload"},
		})
		return
	}
	tmpPath := tmp.Name()
	if _, err := io.Copy(tmp, file); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "INVALID_CSV", "message": "Could not read the upload"},
		})
		return
	}
	tmp.Close()

	// Count data rows up front (streaming) so the client's progress bar has a
	// denominator without holding the file in memory.
	total, err := countCSVRowsJobOpening(tmpPath)
	if err != nil || total < 0 {
		os.Remove(tmpPath)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "INVALID_CSV", "message": "Could not read the CSV file"},
		})
		return
	}

	job := models.ImportJob{Resource: "job_openings", Status: "processing", Total: total}
	if err := h.DB.Create(&job).Error; err != nil {
		os.Remove(tmpPath)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "JOB_ERROR", "message": "Could not start import"},
		})
		return
	}

	// Process in the background so a large file never blocks the request.
	go h.runImportJobOpening(job.ID, tmpPath)

	c.JSON(http.StatusAccepted, gin.H{
		"data":    gin.H{"job_id": job.ID, "total": total},
		"message": "Import started",
	})
}

// countCSVRowsJobOpening counts data rows (excluding the header) without holding
// the file in memory.
func countCSVRowsJobOpening(path string) (int, error) {
	f, err := os.Open(path)
	if err != nil {
		return -1, err
	}
	defer f.Close()
	reader := csv.NewReader(f)
	reader.FieldsPerRecord = -1
	reader.ReuseRecord = true
	n := 0
	for i := 0; ; i++ {
		_, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return -1, err
		}
		if i == 0 {
			continue // header row
		}
		n++
	}
	return n, nil
}

// runImportJobOpening streams the temp CSV, creating job_openings in batches and
// updating the ImportJob as it goes. belongs_to columns are resolved by their
// natural key (or id); unique-conflict rows are skipped; per-row failures are
// recorded. The temp file is removed when done.
func (h *JobOpeningHandler) runImportJobOpening(jobID, tmpPath string) {
	defer os.Remove(tmpPath)
	// This runs in a bare goroutine, so gin.Recovery() does NOT cover it — an
	// unrecovered panic here would crash the whole server. Recover, and mark
	// the job failed so the client's poll terminates instead of hanging.
	defer func() {
		if r := recover(); r != nil {
			h.DB.Model(&models.ImportJob{}).Where("id = ?", jobID).Updates(map[string]interface{}{
				"status":  "failed",
				"message": fmt.Sprintf("import crashed: %v", r),
			})
		}
	}()

	f, err := os.Open(tmpPath)
	if err != nil {
		h.DB.Model(&models.ImportJob{}).Where("id = ?", jobID).Updates(map[string]interface{}{
			"status": "failed", "message": "could not reopen upload",
		})
		return
	}
	defer f.Close()

	reader := csv.NewReader(f)
	reader.FieldsPerRecord = -1

	headers, err := reader.Read()
	if err != nil {
		h.DB.Model(&models.ImportJob{}).Where("id = ?", jobID).Updates(map[string]interface{}{
			"status": "failed", "message": "empty or invalid CSV",
		})
		return
	}
	idx := map[string]int{}
	for i, name := range headers {
		idx[strings.TrimSpace(strings.ToLower(name))] = i
	}
	get := func(rec []string, key string) (string, bool) {
		if i, ok := idx[key]; ok && i < len(rec) {
			return strings.TrimSpace(rec[i]), true
		}
		return "", false
	}

	created, skipped, failed := 0, 0, 0
	rowErrors := []map[string]interface{}{}

	// checkpoint writes current progress so the client's poll sees movement.
	checkpoint := func(status, message string) {
		errsJSON, _ := json.Marshal(rowErrors)
		h.DB.Model(&models.ImportJob{}).Where("id = ?", jobID).Updates(map[string]interface{}{
			"status":    status,
			"processed": created + skipped + failed,
			"created":   created,
			"skipped":   skipped,
			"failed":    failed,
			"errors":    string(errsJSON),
			"message":   message,
		})
	}

	const batchSize = 200
	type pendingRow struct {
		item   models.JobOpening
		rowNum int
	}
	batch := make([]pendingRow, 0, batchSize)

	// flush inserts the accumulated batch. CreateInBatches (with OnConflict
	// DoNothing) amortises the per-row fsync that makes large SQLite imports
	// crawl. If the whole batch errors (a bad row can poison it), we fall back
	// to per-row inserts so created/skipped/failed stay accurate and only the
	// offending row is dropped.
	flush := func() {
		if len(batch) == 0 {
			return
		}
		items := make([]models.JobOpening, len(batch))
		for i := range batch {
			items[i] = batch[i].item
		}
		res := h.DB.Clauses(clause.OnConflict{DoNothing: true}).CreateInBatches(items, len(items))
		if res.Error == nil {
			created += int(res.RowsAffected)
			skipped += len(items) - int(res.RowsAffected)
		} else {
			for i := range batch {
				one := batch[i].item
				r := h.DB.Clauses(clause.OnConflict{DoNothing: true}).Create(&one)
				switch {
				case r.Error != nil:
					failed++
					if len(rowErrors) < 50 {
						rowErrors = append(rowErrors, map[string]interface{}{"row": batch[i].rowNum, "message": r.Error.Error()})
					}
				case r.RowsAffected == 0:
					skipped++
				default:
					created++
				}
			}
		}
		batch = batch[:0]
	}

	rowNum := 1 // header was row 1
	for {
		rec, err := reader.Read()
		if err == io.EOF {
			break
		}
		rowNum++
		if err != nil {
			failed++
			if len(rowErrors) < 50 {
				rowErrors = append(rowErrors, map[string]interface{}{"row": rowNum, "message": err.Error()})
			}
			continue
		}

		item := models.JobOpening{}
		if v, ok := get(rec, "title"); ok {
			item.Title = v
		}
		if v, ok := get(rec, "department"); ok {
			item.Department = v
		}
		if v, ok := get(rec, "location"); ok {
			item.Location = v
		}
		if v, ok := get(rec, "employment_type"); ok {
			item.EmploymentType = v
		}
		if v, ok := get(rec, "description"); ok {
			item.Description = v
		}
		if v, ok := get(rec, "apply_url"); ok {
			item.ApplyURL = v
		}
		if v, ok := get(rec, "is_open"); ok {
			item.IsOpen = v == "true" || v == "1" || v == "yes"
		}
		batch = append(batch, pendingRow{item: item, rowNum: rowNum})

		if len(batch) >= batchSize {
			flush()
			checkpoint("processing", "")
		}
	}
	flush()

	checkpoint("completed", fmt.Sprintf("Imported %d, skipped %d, failed %d", created, skipped, failed))
}

// Template returns a ready-to-fill CSV template (header row) for importing job_openings.
// belongs_to columns use the related record's natural key (e.g. "category"), or
// its id column ("<relation>_id") when the related model has no natural key.
func (h *JobOpeningHandler) Template(c *gin.Context) {
	c.Header("Content-Type", "text/csv")
	c.Header("Content-Disposition", `attachment; filename="job-openings-template.csv"`)
	c.String(http.StatusOK, "title,department,location,employment_type,description,apply_url,is_open\n")
}
