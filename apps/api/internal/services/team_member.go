package services

import (
	"fmt"
	"math"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// TeamMemberService handles business logic for team_members.
type TeamMemberService struct {
	DB *gorm.DB
}

// TeamMemberListParams holds pagination and filter parameters.
type TeamMemberListParams struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
}

// List returns a paginated list of team_members.
func (s *TeamMemberService) List(params TeamMemberListParams) ([]models.TeamMember, int64, int, error) {
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
	sortableTeamMember := map[string]bool{"id": true, "created_at": true, "updated_at": true, "name": true, "role": true, "photo_url": true, "linkedin_url": true, "github_url": true, "twitter_url": true, "published": true, "sort_order": true}
	if !sortableTeamMember[params.SortBy] {
		params.SortBy = "created_at"
	}

	query := s.DB.Model(&models.TeamMember{})

	if params.Search != "" {
		query = query.Where("name ILIKE ? OR role ILIKE ?", "%"+params.Search+"%", "%"+params.Search+"%")
	}

	var total int64
	query.Count(&total)

	var items []models.TeamMember
	offset := (params.Page - 1) * params.PageSize
	if err := query.Order(params.SortBy + " " + params.SortOrder).Offset(offset).Limit(params.PageSize).Find(&items).Error; err != nil {
		return nil, 0, 0, fmt.Errorf("fetching team_members: %w", err)
	}

	pages := int(math.Ceil(float64(total) / float64(params.PageSize)))
	return items, total, pages, nil
}

// GetByID returns a single teammember by ID.
func (s *TeamMemberService) GetByID(id string) (*models.TeamMember, error) {
	var item models.TeamMember
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("teammember not found: %w", err)
	}
	return &item, nil
}

// Create creates a new teammember.
func (s *TeamMemberService) Create(item *models.TeamMember) error {
	if err := s.DB.Create(item).Error; err != nil {
		return fmt.Errorf("creating teammember: %w", err)
	}
	return nil
}

// Update modifies an existing teammember. Two queries: First() loads
// the row + verifies existence; Updates() persists the diff. The
// loaded struct is mutated by Updates() so we can return it directly
// without a third refetch.
func (s *TeamMemberService) Update(id string, updates map[string]interface{}) (*models.TeamMember, error) {
	var item models.TeamMember
	if err := s.DB.First(&item, "id = ?", id).Error; err != nil {
		return nil, fmt.Errorf("teammember not found: %w", err)
	}

	if err := s.DB.Model(&item).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating teammember: %w", err)
	}

	return &item, nil
}

// Delete soft-deletes a teammember. One query — we don't need to load
// the row first; GORM's Delete is atomic and rows-affected tells us
// whether it existed.
func (s *TeamMemberService) Delete(id string) error {
	res := s.DB.Where("id = ?", id).Delete(&models.TeamMember{})
	if res.Error != nil {
		return fmt.Errorf("deleting teammember: %w", res.Error)
	}
	if res.RowsAffected == 0 {
		return fmt.Errorf("teammember not found")
	}
	return nil
}
