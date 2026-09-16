package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/services"
)

// v3.31.47 -- ChartHandler exposes the Preset Chart builder
// endpoint. One endpoint per resource; the preset is a query param
// and the service-side dispatcher decides which aggregation to run.
//
// Mounted at GET /api/admin/dashboard/chart/:resource.
type ChartHandler struct {
	DB *gorm.DB
}

func (h *ChartHandler) Get(c *gin.Context) {
	resource := c.Param("resource")
	if resource == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "resource is required"},
		})
		return
	}

	preset := c.Query("preset")
	if preset == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": "preset is required"},
		})
		return
	}

	limit := 10
	if raw := c.Query("limit"); raw != "" {
		if v, err := strconv.Atoi(raw); err == nil && v > 0 && v <= 100 {
			limit = v
		}
	}

	params := services.ChartParams{
		Preset: preset,
		Field:  c.Query("field"),
		Limit:  limit,
		Grain:  c.Query("grain"),
	}

	result, err := services.ComputeChart(h.DB, resource, params)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{"code": "CHART_FAILED", "message": err.Error()},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}
