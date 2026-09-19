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

	// About & founder copy — read by Home's OurStory/FounderSpotlight and
	// the /about-us page. FounderBio paragraphs are separated by a blank
	// line; empty fields simply hide their section on the public site.
	MissionStatement   string `gorm:"size:500" json:"mission_statement"`
	FoundedYear        int    `json:"founded_year"`
	FoundingStory      string `gorm:"type:text" json:"founding_story"`
	FounderName        string `gorm:"size:255" json:"founder_name"`
	FounderRole        string `gorm:"size:255" json:"founder_role"`
	FounderQuote       string `gorm:"size:500" json:"founder_quote"`
	FounderBio         string `gorm:"type:text" json:"founder_bio"`
	FounderPhotoURL    string `gorm:"size:500" json:"founder_photo_url"`
	FounderGithubURL   string `gorm:"size:500" json:"founder_github_url"`
	FounderLinkedinURL string `gorm:"size:500" json:"founder_linkedin_url"`
	FounderTwitterURL  string `gorm:"size:500" json:"founder_twitter_url"`

	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// BeforeCreate generates a UUID before inserting.
func (s *SiteSettings) BeforeCreate(tx *gorm.DB) error {
	if s.ID == "" {
		s.ID = ids.New()
	}
	return nil
}
