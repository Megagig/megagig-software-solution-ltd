package database

import (
	"log"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	"megagig-software-solution/apps/api/internal/models"
)

// SeedDemoContent creates a handful of placeholder CaseStudy, Product, and
// Testimonial rows for local development only. Real content (PharmacyCopilot,
// BusinessCopilot, and verified client testimonials) is populated in Phase 5
// — see build-plan.md — and should replace this seed data before launch.
// Image fields are left blank (no Upload records exist yet in a fresh dev
// database); the admin UI's relationship pickers can attach real images later.
func SeedDemoContent(db *gorm.DB) error {
	var count int64
	db.Model(&models.CaseStudy{}).Count(&count)
	if count > 0 {
		log.Println("Demo content already seeded, skipping...")
		return nil
	}

	caseStudies := []models.CaseStudy{
		{
			Slug:         "pharmacycopilot",
			ClientName:   "PharmacyCopilot",
			Tagline:      "Cross-platform pharmacy management, built offline-first",
			CategoryTags: datatypes.NewJSONSlice([]string{"Healthcare", "Retail"}),
			StatusBadge:  "Live in production",
			Problem:      "Pharmacy owners were stuck between generic global SaaS that didn't fit local workflows and fragile spreadsheet-based inventory tracking.",
			WhatWeBuilt:  "A cross-platform (web, desktop, mobile) pharmacy management suite with offline-first sync, built on the Grit framework.",
			Result:       "Now running in production as Megagig's flagship vertical product at pharmacycopilot.com.ng.",
			TechStack:    datatypes.NewJSONSlice([]string{"Go", "Next.js", "Electron", "Expo", "PostgreSQL"}),
			Published:    true,
			SortOrder:    1,
		},
		{
			Slug:         "businesscopilot",
			ClientName:   "BusinessCopilot",
			Tagline:      "Unified POS, inventory, accounting, CRM, and HR for SMEs",
			CategoryTags: datatypes.NewJSONSlice([]string{"Retail", "Fintech"}),
			StatusBadge:  "Live in production",
			Problem:      "SMEs were juggling separate, disconnected tools for POS, inventory, accounting, and HR — none of them built for Nigerian business workflows.",
			WhatWeBuilt:  "A single unified platform covering POS, inventory, accounting, CRM, HR, and BI, engineered on the Grit framework.",
			Result:       "Running in production at businesscopilot.com.ng, positioned as a QuickBooks/UltimatePOS-class alternative built for local workflows.",
			TechStack:    datatypes.NewJSONSlice([]string{"Go", "Next.js", "PostgreSQL", "Redis"}),
			Published:    true,
			SortOrder:    2,
		},
	}
	for i := range caseStudies {
		if err := db.Create(&caseStudies[i]).Error; err != nil {
			log.Printf("Warning: failed to create case study %q: %v", caseStudies[i].ClientName, err)
			continue
		}
		log.Printf("Created case study: %q", caseStudies[i].ClientName)
	}

	products := []models.Product{
		{
			Slug:           "pharmacycopilot",
			Name:           "PharmacyCopilot",
			Tagline:        "Cross-platform pharmacy management SaaS",
			Description:    "Offline-first pharmacy management across web, desktop, and mobile — inventory, sales, and compliance in one place.",
			FeatureBullets: datatypes.NewJSONSlice([]string{"Offline-first sync", "Inventory & expiry tracking", "Sales & POS", "Multi-branch support"}),
			LiveURL:        "https://pharmacycopilot.com.ng",
			Published:      true,
			SortOrder:      1,
		},
		{
			Slug:           "businesscopilot",
			Name:           "BusinessCopilot",
			Tagline:        "Unified ops platform for SMEs",
			Description:    "POS, inventory, accounting, CRM, HR, and BI — one platform built for how Nigerian SMEs actually run.",
			FeatureBullets: datatypes.NewJSONSlice([]string{"Unified POS & inventory", "Accounting & invoicing", "CRM & HR", "Business intelligence dashboards"}),
			LiveURL:        "https://businesscopilot.com.ng",
			Published:      true,
			SortOrder:      2,
		},
	}
	for i := range products {
		if err := db.Create(&products[i]).Error; err != nil {
			log.Printf("Warning: failed to create product %q: %v", products[i].Name, err)
			continue
		}
		log.Printf("Created product: %q", products[i].Name)
	}

	testimonials := []models.Testimonial{
		{
			QuoteText:   "Megagig shipped a system our pharmacy staff actually enjoy using — offline-first was the deal-breaker for us.",
			AuthorName:  "Demo Client",
			AuthorRole:  "Pharmacy Owner",
			CompanyName: "PharmacyCopilot",
			CompanyURL:  "https://pharmacycopilot.com.ng",
			CaseStudyID: caseStudies[0].ID,
			Published:   true,
			SortOrder:   1,
		},
	}
	for i := range testimonials {
		if err := db.Create(&testimonials[i]).Error; err != nil {
			log.Printf("Warning: failed to create testimonial for %q: %v", testimonials[i].CompanyName, err)
			continue
		}
		log.Printf("Created testimonial from: %q", testimonials[i].CompanyName)
	}

	return nil
}
