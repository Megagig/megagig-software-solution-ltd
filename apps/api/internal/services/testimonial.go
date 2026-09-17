package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// TestimonialService handles business logic for testimonials.
type TestimonialService struct {
	DB *gorm.DB
}

// TestimonialListParams holds pagination and filter parameters.
type TestimonialListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of testimonials.
func (s *TestimonialService) List(params TestimonialListParams) ([]models.Testimonial, int64, int, error) {
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
	sortableTestimonial := map[string]bool{"id": true, "created_at": true, "updated_at": true, "quote_text": true, "author_name": true, "author_role": true, "company_name": true, "company_url": true, "avatar_id": true, "case_study_id": true, "published": true, "sort_order": true}
	if !sortableTestimonial[params.SortBy] {
		params.SortBy = "created_at"
	}

	query := s.DB.Model(&models.Testimonial{})

	if params.Search != "" {
		query = query.Where("quote_text ILIKE ? OR author_name ILIKE ? OR author_role ILIKE ? OR company_name ILIKE ? OR company_url ILIKE ? OR avatar_id ILIKE ? OR case_study_id ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.Testimonial
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching testimonials: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single testimonial by ID.
func (s *TestimonialService) GetByID(id string) (*models.Testimonial, error) {
	var item models.Testimonial
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("testimonial not found: %w", err)
	}
	return &item, nil
}

// Create creates a new testimonial.
func (s *TestimonialService) Create(item *models.Testimonial) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating testimonial: %w", err)
	}
	return nil
}

// Update modifies an existing testimonial. Two queries: First() loads
// the row + verifies existence; Updates() persists the diff. The
// loaded struct is mutated by Updates() so we can return it directly
// without a third refetch.
func (s *TestimonialService) Update(id string, updates map[string]interface{}) (*models.Testimonial, error) {
	var item models.Testimonial
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("testimonial not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating testimonial: %w", err)
	}

	return &item, nil
}

// Delete soft-deletes a testimonial. One query — we don't need to load
// the row first; GORM's Delete is atomic and rows-affected tells us
// whether it existed.
func (s *TestimonialService) Delete(id string) error {
	res := s.DB.Where("id = ?", id).Delete(&models.Testimonial{})
	if res.Error != nil {
		return fmt.Errorf("deleting testimonial: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("testimonial not found")
	}
	return nil
}
