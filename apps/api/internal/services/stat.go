package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// StatService handles business logic for stats.
type StatService struct {
	DB *gorm.DB
}

// StatListParams holds pagination and filter parameters.
type StatListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of stats.
func (s *StatService) List(params StatListParams) ([]models.Stat, int64, int, error) {
	if params.Page < 1 {
		params.Page = 1
	}
	if params.PageSize < 1 || params.PageSize > 100 {
		params.PageSize = 20
	}
	if params.SortOrder != "asc" && params.SortOrder != "desc" {
		params.SortOrder = "desc"
	}
	// SortBy is interpolated into ORDER BY below, so it MUST be whitelisted
	// against real columns — never trust a client-supplied sort column.
	sortableStat := map[string]bool{"id": true, "created_at": true, "updated_at": true, "value": true, "label": true, "published": true, "sort_order": true}
	if !sortableStat[params.SortBy] {
		params.SortBy = "created_at"
	}

	query := s.DB.Model(&models.Stat{})

	if params.Search != "" {
		query = query.Where("value ILIKE ? OR label ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.Stat
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching stats: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single stat by ID.
func (s *StatService) GetByID(id string) (*models.Stat, error) {
	var item models.Stat
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("stat not found: %w", err)
	}
	return &item, nil
}

// Create creates a new stat.
func (s *StatService) Create(item *models.Stat) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating stat: %w", err)
	}
	return nil
}

// Update modifies an existing stat. Two queries: First() loads
// the row + verifies existence; Updates() persists the diff. The
// loaded struct is mutated by Updates() so we can return it directly
// without a third refetch.
func (s *StatService) Update(id string, updates map[string]interface{}) (*models.Stat, error) {
	var item models.Stat
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("stat not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating stat: %w", err)
	}

	return &item, nil
}

// Delete soft-deletes a stat. One query — we don't need to load
// the row first; GORM's Delete is atomic and rows-affected tells us
// whether it existed.
func (s *StatService) Delete(id string) error {
	res := s.DB.Where("id = ?", id).Delete(&models.Stat{})
	if res.Error != nil {
		return fmt.Errorf("deleting stat: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("stat not found")
	}
	return nil
}
