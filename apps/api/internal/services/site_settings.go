package services

import (
	"fmt"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// SiteSettingsService handles the singleton SiteSettings row.
type SiteSettingsService struct {
	DB *gorm.DB
}

// Get returns the singleton row, creating it with zero-value defaults
// on first access so callers never have to handle a "not found" case.
func (s *SiteSettingsService) Get() (*models.SiteSettings, error) {
	var settings models.SiteSettings
	if err := s.DB.First(&settings).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			settings = models.SiteSettings{}
			if err := s.DB.Create(&settings).Error; err != nil {
				return nil, fmt.Errorf("creating default site settings: %w", err)
			}
			return &settings, nil
		}
		return nil, fmt.Errorf("fetching site settings: %w", err)
	}
	return &settings, nil
}

// Update modifies the singleton row, creating it first if it doesn't exist yet.
func (s *SiteSettingsService) Update(updates map[string]interface{}) (*models.SiteSettings, error) {
	settings, err := s.Get()
	if err != nil {
		return nil, err
	}
	if err := s.DB.Model(settings).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("updating site settings: %w", err)
	}
	return settings, nil
}
