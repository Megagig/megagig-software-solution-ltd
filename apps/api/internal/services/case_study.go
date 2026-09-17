package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// CaseStudyService handles business logic for case_studies.
type CaseStudyService struct {
	DB *gorm.DB
}

// CaseStudyListParams holds pagination and filter parameters.
type CaseStudyListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of case_studies.
func (s *CaseStudyService) List(params CaseStudyListParams) ([]models.CaseStudy, int64, int, error) {
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
	sortableCaseStudy := map[string]bool{"id": true, "created_at": true, "updated_at": true, "slug": true, "client_name": true, "tagline": true, "status_badge": true, "hero_image_id": true, "problem": true, "what_we_built": true, "result": true, "published": true, "sort_order": true}
	if !sortableCaseStudy[params.SortBy] {
		params.SortBy = "created_at"
	}

	query := s.DB.Model(&models.CaseStudy{})

	if params.Search != "" {
		query = query.Where("slug ILIKE ? OR client_name ILIKE ? OR tagline ILIKE ? OR status_badge ILIKE ? OR hero_image_id ILIKE ? OR problem ILIKE ? OR what_we_built ILIKE ? OR result ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.CaseStudy
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching case_studies: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single casestudy by ID.
func (s *CaseStudyService) GetByID(id string) (*models.CaseStudy, error) {
	var item models.CaseStudy
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("casestudy not found: %w", err)
	}
	return &item, nil
}

// Create creates a new casestudy.
func (s *CaseStudyService) Create(item *models.CaseStudy) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating casestudy: %w", err)
	}
	return nil
}

// Update modifies an existing casestudy. Two queries: First() loads
// the row + verifies existence; Updates() persists the diff. The
// loaded struct is mutated by Updates() so we can return it directly
// without a third refetch.
func (s *CaseStudyService) Update(id string, updates map[string]interface{}) (*models.CaseStudy, error) {
	var item models.CaseStudy
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("casestudy not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating casestudy: %w", err)
	}

	return &item, nil
}

// Delete soft-deletes a casestudy. One query — we don't need to load
// the row first; GORM's Delete is atomic and rows-affected tells us
// whether it existed.
func (s *CaseStudyService) Delete(id string) error {
	res := s.DB.Where("id = ?", id).Delete(&models.CaseStudy{})
	if res.Error != nil {
		return fmt.Errorf("deleting casestudy: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("casestudy not found")
	}
	return nil
}
