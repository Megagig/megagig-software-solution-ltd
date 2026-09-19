package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/services"
)

// SiteSettingsHandler exposes the singleton SiteSettings row.
type SiteSettingsHandler struct {
	DB      *gorm.DB
	Service *services.SiteSettingsService
}

// NewSiteSettingsHandler creates a new SiteSettingsHandler instance.
func NewSiteSettingsHandler(db *gorm.DB) *SiteSettingsHandler {
	return &SiteSettingsHandler{DB: db, Service: &services.SiteSettingsService{DB: db}}
}

// Get returns the site settings singleton (public — read by apps/web for
// contact info, hero copy, and pricing blurbs).
func (h *SiteSettingsHandler) Get(c *gin.Context) {
	settings, err := h.Service.Get()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to fetch site settings"},
		})
		return
	}
	c.Header("Cache-Control", "public, max-age=60")
	c.JSON(http.StatusOK, gin.H{"data": settings})
}

// Update modifies the site settings singleton (admin-only).
func (h *SiteSettingsHandler) Update(c *gin.Context) {
	var req struct {
		ContactEmail   *string        `json:"contact_email"`
		ContactPhone   *string        `json:"contact_phone"`
		WhatsAppNumber *string        `json:"whatsapp_number"`
		Address        *string        `json:"address"`
		SocialLinks    datatypes.JSON `json:"social_links"`
		HeroHeadline   *string        `json:"hero_headline"`
		HeroSubhead    *string        `json:"hero_subhead"`
		PricingBlurbs  datatypes.JSON `json:"pricing_blurbs"`

		MissionStatement   *string `json:"mission_statement"`
		FoundedYear        *int    `json:"founded_year"`
		FoundingStory      *string `json:"founding_story"`
		FounderName        *string `json:"founder_name"`
		FounderRole        *string `json:"founder_role"`
		FounderQuote       *string `json:"founder_quote"`
		FounderBio         *string `json:"founder_bio"`
		FounderPhotoURL    *string `json:"founder_photo_url"`
		FounderGithubURL   *string `json:"founder_github_url"`
		FounderLinkedinURL *string `json:"founder_linkedin_url"`
		FounderTwitterURL  *string `json:"founder_twitter_url"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	updates := map[string]interface{}{}
	if req.ContactEmail != nil {
		updates["contact_email"] = *req.ContactEmail
	}
	if req.ContactPhone != nil {
		updates["contact_phone"] = *req.ContactPhone
	}
	if req.WhatsAppNumber != nil {
		updates["whatsapp_number"] = *req.WhatsAppNumber
	}
	if req.Address != nil {
		updates["address"] = *req.Address
	}
	if req.SocialLinks != nil {
		updates["social_links"] = req.SocialLinks
	}
	if req.HeroHeadline != nil {
		updates["hero_headline"] = *req.HeroHeadline
	}
	if req.HeroSubhead != nil {
		updates["hero_subhead"] = *req.HeroSubhead
	}
	if req.PricingBlurbs != nil {
		updates["pricing_blurbs"] = req.PricingBlurbs
	}

	// About & founder fields — pointers so an admin can clear a field.
	textUpdates := map[string]*string{
		"mission_statement":    req.MissionStatement,
		"founding_story":       req.FoundingStory,
		"founder_name":         req.FounderName,
		"founder_role":         req.FounderRole,
		"founder_quote":        req.FounderQuote,
		"founder_bio":          req.FounderBio,
		"founder_photo_url":    req.FounderPhotoURL,
		"founder_github_url":   req.FounderGithubURL,
		"founder_linkedin_url": req.FounderLinkedinURL,
		"founder_twitter_url":  req.FounderTwitterURL,
	}
	for column, value := range textUpdates {
		if value != nil {
			updates[column] = *value
		}
	}
	if req.FoundedYear != nil {
		updates["founded_year"] = *req.FoundedYear
	}

	settings, err := h.Service.Update(updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "INTERNAL_ERROR", "message": "Failed to update site settings"},
		})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": settings, "message": "Site settings updated successfully"})
}
