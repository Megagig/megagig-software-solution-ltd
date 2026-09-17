package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// SiteSettings is a singleton — exactly one row ever exists. Contact
// details, hero copy, and pricing blurbs live here so they can change
// without a redeploy (see architecture.md rule #5).
type SiteSettings struct {
	ID             string         `gorm:"primarykey;size:36" json:"id"`
	ContactEmail   string         `gorm:"size:255" json:"contact_email"`
	ContactPhone   string         `gorm:"size:50" json:"contact_phone"`
	WhatsAppNumber string         `gorm:"size:50" json:"whatsapp_number"`
	Address        string         `gorm:"size:500" json:"address"`
	SocialLinks    datatypes.JSON `gorm:"type:jsonb" json:"social_links"`
	HeroHeadline   string         `gorm:"size:255" json:"hero_headline"`
	HeroSubhead    string         `gorm:"size:500" json:"hero_subhead"`
	PricingBlurbs  datatypes.JSON `gorm:"type:jsonb" json:"pricing_blurbs"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
}

// BeforeCreate generates a UUID before inserting.
func (s *SiteSettings) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = ids.New()
	}
	return nil
}
