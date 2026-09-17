package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// FAQService handles business logic for faqs.
type FAQService struct {
	DB *gorm.DB
}

// FAQListParams holds pagination and filter parameters.
type FAQListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of faqs.
func (s *FAQService) List(params FAQListParams) ([]models.FAQ, int64, int, error) {
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
	sortableFAQ := map[string]bool{"id": true, "created_at": true, "updated_at": true, "question": true, "answer": true, "published": true, "sort_order": true}
	if !sortableFAQ[params.SortBy] {
		params.SortBy = "created_at"
	}

	query := s.DB.Model(&models.FAQ{})

	if params.Search != "" {
		query = query.Where("question ILIKE ? OR answer ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.FAQ
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching faqs: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single faq by ID.
func (s *FAQService) GetByID(id string) (*models.FAQ, error) {
	var item models.FAQ
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("faq not found: %w", err)
	}
	return &item, nil
}

// Create creates a new faq.
func (s *FAQService) Create(item *models.FAQ) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating faq: %w", err)
	}
	return nil
}

// Update modifies an existing faq. Two queries: First() loads
// the row + verifies existence; Updates() persists the diff. The
// loaded struct is mutated by Updates() so we can return it directly
// without a third refetch.
func (s *FAQService) Update(id string, updates map[string]interface{}) (*models.FAQ, error) {
	var item models.FAQ
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("faq not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating faq: %w", err)
	}

	return &item, nil
}

// Delete soft-deletes a faq. One query — we don't need to load
// the row first; GORM's Delete is atomic and rows-affected tells us
// whether it existed.
func (s *FAQService) Delete(id string) error {
	res := s.DB.Where("id = ?", id).Delete(&models.FAQ{})
	if res.Error != nil {
		return fmt.Errorf("deleting faq: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("faq not found")
	}
	return nil
}
