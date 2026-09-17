package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// LeadService handles business logic for leads.
type LeadService struct {
	DB *gorm.DB
}

// LeadListParams holds pagination and filter parameters.
type LeadListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of leads.
func (s *LeadService) List(params LeadListParams) ([]models.Lead, int64, int, error) {
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
	sortableLead := map[string]bool{"id": true, "created_at": true, "updated_at": true, "name": true, "email": true, "phone": true, "company": true, "project_type": true, "budget_range": true, "message": true, "source": true, "status": true, "internal_notes": true}
	if !sortableLead[params.SortBy] {
		params.SortBy = "created_at"
	}

	query := s.DB.Model(&models.Lead{})

	if params.Search != "" {
		query = query.Where("name ILIKE ? OR email ILIKE ? OR phone ILIKE ? OR company ILIKE ? OR project_type ILIKE ? OR budget_range ILIKE ? OR message ILIKE ? OR source ILIKE ? OR status ILIKE ? OR internal_notes ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.Lead
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching leads: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single lead by ID.
func (s *LeadService) GetByID(id string) (*models.Lead, error) {
	var item models.Lead
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("lead not found: %w", err)
	}
	return &item, nil
}

// Create creates a new lead.
func (s *LeadService) Create(item *models.Lead) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating lead: %w", err)
	}
	return nil
}

// Update modifies an existing lead. Two queries: First() loads
// the row + verifies existence; Updates() persists the diff. The
// loaded struct is mutated by Updates() so we can return it directly
// without a third refetch.
func (s *LeadService) Update(id string, updates map[string]interface{}) (*models.Lead, error) {
	var item models.Lead
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("lead not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating lead: %w", err)
	}

	return &item, nil
}

// Delete soft-deletes a lead. One query — we don't need to load
// the row first; GORM's Delete is atomic and rows-affected tells us
// whether it existed.
func (s *LeadService) Delete(id string) error {
	res := s.DB.Where("id = ?", id).Delete(&models.Lead{})
	if res.Error != nil {
		return fmt.Errorf("deleting lead: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("lead not found")
	}
	return nil
}
