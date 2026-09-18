package database

import (
	"encoding/json"
	"log"

	"gorm.io/gorm"
	"megagig-software-solution/apps/api/internal/models"
)

// SeedSiteSettings creates the singleton SiteSettings row with placeholder
// contact info for local development. Real values are filled in during
// Phase 5 (see build-plan.md) — this only guarantees the row exists so
// apps/web never hits a missing-settings error.
func SeedSiteSettings(db *gorm.DB) error {
	var count int64
	db.Model(&models.SiteSettings{}).Count(&count)
	if count > 0 {
		log.Println("Site settings already seeded, skipping...")
		return nil
	}

	socialLinks, _ := json.Marshal(map[string]string{
		"linkedin": "",
		"github":   "https://github.com/megagig-software-solution",
		"youtube":  "",
		"facebook": "",
		"twitter":  "",
	})
	pricingBlurbs, _ := json.Marshal(map[string]string{
		"web-design-development":         "Custom quote",
		"custom-software-saas-platforms": "Custom quote",
		"mobile-app-development":         "Custom quote",
		"desktop-pos-apps":               "Custom quote",
		"ai-automation":                  "Custom quote",
		"ui-ux-design":                   "Custom quote",
		"tech-consultation":              "Custom quote",
		"it-training-internships":       "Custom quote",
	})

	settings := models.SiteSettings{
		ContactEmail:   "admin@megagigsoftwaresolution.com.ng",
		ContactPhone:   "+2348060374755",
		WhatsAppNumber: "2348060374755",
		Address:        "Lagos, Nigeria",
		SocialLinks:    socialLinks,
		HeroHeadline:   "We build software your team actually adopts",
		HeroSubhead:    "Engineering-led product studio — custom software, priced and built for how your business runs locally.",
		PricingBlurbs:  pricingBlurbs,
	}

	if err := db.Create(&settings).Error; err != nil {
		return err
	}
	log.Println("Created site settings (placeholder values)")
	return nil
}
