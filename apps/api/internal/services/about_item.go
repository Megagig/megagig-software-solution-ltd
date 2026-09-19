package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// AboutItemService handles business logic for about_items.
type AboutItemService struct {
	DB *gorm.DB
}

// AboutItemListParams holds pagination and filter parameters.
type AboutItemListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of about_items.
func (s *AboutItemService) List(params AboutItemListParams) ([]models.AboutItem, int64, int, error) {
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
	sortableAboutItem := map[string]bool{"id": true, "created_at": true, "updated_at": true, "kind": true, "title": true, "description": true, "label": true, "published": true, "sort_order": true}
	if !sortableAboutItem[params.SortBy] {
		params.SortBy = "created_at"
	}

	query := s.DB.Model(&models.AboutItem{})

	if params.Search != "" {
		query = query.Where("kind ILIKE ? OR title ILIKE ? OR description ILIKE ? OR label ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.AboutItem
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching about_items: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single aboutitem by ID.
func (s *AboutItemService) GetByID(id string) (*models.AboutItem, error) {
	var item models.AboutItem
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("aboutitem not found: %w", err)
	}
	return &item, nil
}

// Create creates a new aboutitem.
func (s *AboutItemService) Create(item *models.AboutItem) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating aboutitem: %w", err)
	}
	return nil
}

// Update modifies an existing aboutitem. Two queries: First() loads
// the row + verifies existence; Updates() persists the diff. The
// loaded struct is mutated by Updates() so we can return it directly
// without a third refetch.
func (s *AboutItemService) Update(id string, updates map[string]interface{}) (*models.AboutItem, error) {
	var item models.AboutItem
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("aboutitem not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating aboutitem: %w", err)
	}

	return &item, nil
}

// Delete soft-deletes a aboutitem. One query — we don't need to load
// the row first; GORM's Delete is atomic and rows-affected tells us
// whether it existed.
func (s *AboutItemService) Delete(id string) error {
	res := s.DB.Where("id = ?", id).Delete(&models.AboutItem{})
	if res.Error != nil {
		return fmt.Errorf("deleting aboutitem: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("aboutitem not found")
	}
	return nil
}
