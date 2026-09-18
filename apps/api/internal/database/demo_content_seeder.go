package database

import (
	"log"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	"megagig-software-solution/apps/api/internal/models"
)

// SeedDemoContent creates CaseStudy, Product, and Testimonial rows for
// local development. Real, verified client testimonials are still Phase 5
// work — see build-plan.md — but the CaseStudy entries below are Megagig's
// actual shipped products (real live URLs, confirmed by the founder), not
// placeholders; only their marketing copy is drafted, not fabricated.
// Image fields are left blank (no Upload records exist yet in a fresh dev
// database) — apps/web falls back to a matching local /public screenshot
// by slug (see lib/product-screenshots.ts) until Phase 5 attaches real
// Upload-backed hero images via the admin UI.
//
// Seeding is idempotent per-slug (FirstOrCreate) rather than "skip
// everything if any row exists" — that blanket guard meant a fresh
// project couldn't ever pick up newly-added seed entries without wiping
// the table first. Existing rows are never touched.
func SeedDemoContent(db *gorm.DB) error {
	caseStudies := []models.CaseStudy{
		{
			Slug:         "pharmacycopilot",
			ClientName:   "PharmacyCopilot",
			Tagline:      "Cross-platform pharmacy management, built offline-first",
			CategoryTags: datatypes.NewJSONSlice([]string{"Healthcare", "Retail"}),
			StatusBadge:  "Live in production",
			Problem:      "Pharmacy owners were stuck between generic global SaaS that didn't fit local workflows and fragile spreadsheet-based inventory tracking.",
			WhatWeBuilt:  "A cross-platform pharmacy management suite — web, desktop, and mobile apps sharing one offline-first sync engine, so pharmacists keep working through unreliable connectivity without losing a single transaction. Built on the Grit framework, it covers inventory, prescriptions, sales, and patient records in one unified system, replacing the spreadsheets and disconnected tools most independent pharmacies were stuck with.",
			Result:       "Now running in production as Megagig's flagship vertical product at pharmacycopilot.com.ng.",
			TechStack:    datatypes.NewJSONSlice([]string{"Go", "Next.js", "Electron", "Expo", "PostgreSQL"}),
			LiveURL:      "https://pharmacycopilot.com.ng",
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
			WhatWeBuilt:  "A single unified platform bringing POS, inventory, accounting, CRM, and HR together for SMEs, engineered on the Grit framework. Instead of stitching together separate tools that don't talk to each other, one dashboard now handles daily sales, stock levels, staff records, and financial reporting — with real-time BI dashboards surfacing the numbers that matter, built specifically for how Nigerian businesses actually operate.",
			Result:       "Running in production at businesscopilot.com.ng, positioned as a QuickBooks/UltimatePOS-class alternative built for local workflows.",
			TechStack:    datatypes.NewJSONSlice([]string{"Go", "Next.js", "PostgreSQL", "Redis"}),
			LiveURL:      "https://businesscopilot.com.ng",
			Published:    true,
			SortOrder:    2,
		},
		{
			Slug:         "acpn-ota-zone",
			ClientName:   "ACPN Ota Zone",
			Tagline:      "Digital membership portal for the Association of Community Pharmacists, Ota Zone",
			CategoryTags: datatypes.NewJSONSlice([]string{"Healthcare", "Association"}),
			StatusBadge:  "Live in production",
			Problem:      "The Ota Zone chapter of the Association of Community Pharmacists of Nigeria had no digital home — membership, events, and governance ran entirely offline.",
			WhatWeBuilt:  "A full membership and community portal for the Ota Zone chapter — online registration and renewal, a searchable leadership directory, event galleries from past chapter activities, and a resource library for members. What used to run entirely offline, through paper registers and word of mouth, now lives in one platform every member can reach from their phone.",
			Result:       "Running in production at acpnotazone.com, serving pharmacy professionals across the Ota Zone chapter.",
			TechStack:    datatypes.NewJSONSlice([]string{"Next.js", "Node.js", "PostgreSQL"}),
			LiveURL:      "https://acpnotazone.com",
			Published:    true,
			SortOrder:    3,
		},
		{
			Slug:         "ccrn-oau-alumni",
			ClientName:   "CCRN OAU Alumni",
			Tagline:      "Community platform for a university fellowship alumni network",
			CategoryTags: datatypes.NewJSONSlice([]string{"Community", "Education"}),
			StatusBadge:  "Live in production",
			Problem:      "CCRN OAU alumni had no central platform to stay connected, share updates, or coordinate reunions and events.",
			WhatWeBuilt:  "An alumni community site built around three things members actually use: a blog for updates and announcements, an events calendar for reunions and webinars, and a searchable member directory to reconnect with old classmates. It gives a fellowship that used to rely on scattered group chats and word-of-mouth a proper digital home, one alumni can return to long after graduation.",
			Result:       "Live at ccrnoaualumni.com.ng, connecting alumni for reunions, webinars, and ongoing fellowship.",
			TechStack:    datatypes.NewJSONSlice([]string{"Next.js", "Node.js", "PostgreSQL"}),
			LiveURL:      "https://ccrnoaualumni.com.ng",
			Published:    true,
			SortOrder:    4,
		},
		{
			Slug:         "megapro-erp",
			ClientName:   "MegaPro ERP",
			Tagline:      "All-in-one POS, inventory, HR, and repair management ERP",
			CategoryTags: datatypes.NewJSONSlice([]string{"Retail", "ERP"}),
			StatusBadge:  "Live in production",
			Problem:      "Businesses running sales, stock, staff, and repairs across separate, disconnected tools had no single source of truth.",
			WhatWeBuilt:  "A unified ERP bringing POS, inventory, accounting, HR, and repair-job management into one real-time system. Sales staff, stock controllers, technicians, and finance all work from the same live data instead of separate spreadsheets and disconnected apps, so a sale, a repair ticket, and a stock adjustment all update the same source of truth the moment they happen.",
			Result:       "Live in production, helping teams run sales, stock, staff, and repairs from one system.",
			TechStack:    datatypes.NewJSONSlice([]string{"Next.js", "Node.js", "PostgreSQL"}),
			Published:    true,
			SortOrder:    5,
		},
		{
			Slug:         "yazzyos",
			ClientName:   "YazzyOS",
			Tagline:      "Full accounting operating system — general ledger, tax, and reconciliation",
			CategoryTags: datatypes.NewJSONSlice([]string{"Fintech", "Accounting"}),
			StatusBadge:  "Live in production",
			Problem:      "Growing businesses needed proper double-entry accounting with fiscal-period controls, not spreadsheets.",
			WhatWeBuilt:  "A full accounting operating system — general ledger, receivables and payables, inventory valuation, and configurable tax codes, all wrapped around fiscal-period controls that keep the books properly closed month over month. Automated reconciliation health checks flag mismatches before they become a mess, giving growing businesses the kind of financial discipline spreadsheets were never built to enforce.",
			Result:       "Live in production at yazzyplace.com.ng.",
			TechStack:    datatypes.NewJSONSlice([]string{"Next.js", "Node.js", "PostgreSQL"}),
			LiveURL:      "https://yazzyplace.com.ng",
			Published:    true,
			SortOrder:    6,
		},
		{
			Slug:         "societyledger",
			ClientName:   "SocietyLedger",
			Tagline:      "SaaS platform for managing associations, clubs, and cooperative societies",
			CategoryTags: datatypes.NewJSONSlice([]string{"Community", "Fintech"}),
			StatusBadge:  "Live in production",
			Problem:      "Nigerian associations and cooperative societies were managing membership, dues, and finances through manual, disconnected processes.",
			WhatWeBuilt:  "A modern SaaS platform built to digitize how Nigerian associations, clubs, and cooperative societies actually run — member management, dues and finance tracking, and tools for growing an engaged community, all in one place. It replaces the manual registers and informal record-keeping most societies have relied on for years with something members and leadership can both trust.",
			Result:       "Live in production at societyledger.com.ng, trusted by associations across Nigeria.",
			TechStack:    datatypes.NewJSONSlice([]string{"Next.js", "Node.js", "PostgreSQL"}),
			LiveURL:      "https://www.societyledger.com.ng",
			Published:    true,
			SortOrder:    7,
		},
		{
			Slug:         "kaneopromovers",
			ClientName:   "Kaneo Pro Movers",
			Tagline:      "Marketing website for a professional moving & logistics company serving Alberta, Canada",
			CategoryTags: datatypes.NewJSONSlice([]string{"Logistics", "Web Design"}),
			StatusBadge:  "Live in production",
			Problem:      "Kaneo Pro Movers needed a professional web presence that could turn visitors into quote requests, not just describe the business.",
			WhatWeBuilt:  "A marketing website for a professional moving and logistics company serving Alberta, Canada — a bold hero section paired with a persistent 'Free Quote' call-to-action, service and coverage-area pages, and direct phone/email contact always one click away in the header. Built around the one thing a moving customer actually wants: a fast, frictionless way to request a quote the moment they land on the page.",
			Result:       "Live in production at kaneopromovers.com, serving customers across Alberta.",
			LiveURL:      "https://www.kaneopromovers.com",
			Published:    true,
			SortOrder:    8,
		},
	}
	for i := range caseStudies {
		var existing models.CaseStudy
		result := db.Where("slug = ?", caseStudies[i].Slug).Attrs(caseStudies[i]).FirstOrCreate(&existing)
		if result.Error != nil {
			log.Printf("Warning: failed to create case study %q: %v", caseStudies[i].ClientName, result.Error)
			continue
		}
		if result.RowsAffected > 0 {
			log.Printf("Created case study: %q", caseStudies[i].ClientName)
		}
		caseStudies[i] = existing
	}

	products := []models.Product{
		{
			Slug:           "pharmacycopilot",
			Name:           "PharmacyCopilot",
			Tagline:        "Cross-platform pharmacy management SaaS",
			Description:    "Built for independent and chain pharmacies that need inventory, sales, and compliance to keep working even when the internet doesn't — offline-first across web, desktop, and mobile, all syncing back to one source of truth.",
			FeatureBullets: datatypes.NewJSONSlice([]string{"Offline-first sync", "Inventory & expiry tracking", "Sales & POS", "Multi-branch support"}),
			Platforms:      datatypes.NewJSONSlice([]string{"Web", "Desktop", "Mobile"}),
			LiveURL:        "https://pharmacycopilot.com.ng",
			Published:      true,
			SortOrder:      1,
		},
		{
			Slug:           "businesscopilot",
			Name:           "BusinessCopilot",
			Tagline:        "Unified ops platform for SMEs",
			Description:    "Built for Nigerian SMEs juggling POS, inventory, accounting, CRM, and HR across disconnected tools — one platform, with real-time BI dashboards, so every part of the business finally speaks to every other part.",
			FeatureBullets: datatypes.NewJSONSlice([]string{"Unified POS & inventory", "Accounting & invoicing", "CRM & HR", "Business intelligence dashboards"}),
			Platforms:      datatypes.NewJSONSlice([]string{"Web", "Mobile"}),
			LiveURL:        "https://businesscopilot.com.ng",
			Published:      true,
			SortOrder:      2,
		},
		{
			Slug:           "societyledger",
			Name:           "SocietyLedger",
			Tagline:        "SaaS platform for associations, clubs, and cooperative societies",
			Description:    "Built for Nigerian associations, clubs, and cooperative societies still running membership and dues through manual registers — member management, finance tracking, and community tools in one platform leadership and members can both trust.",
			FeatureBullets: datatypes.NewJSONSlice([]string{"Member management", "Dues & finance tracking", "Community growth tools", "Association-wide reporting"}),
			Platforms:      datatypes.NewJSONSlice([]string{"Web"}),
			LiveURL:        "https://www.societyledger.com.ng",
			Published:      true,
			SortOrder:      3,
		},
		{
			Slug:           "medsafe",
			Name:           "MedSafe",
			Tagline:        "Nigeria's most comprehensive drug information platform",
			Description:    "Built for Nigerian healthcare professionals, pharmacists, and pharmacy students who need fast, NAFDAC-verified drug information — monographs, interaction checking, and clinical safety tools in one place.",
			FeatureBullets: datatypes.NewJSONSlice([]string{"5,000+ drug monographs", "Multi-drug interaction checker", "NAFDAC recall & authenticity checks", "16+ clinical calculators"}),
			Platforms:      datatypes.NewJSONSlice([]string{"Web"}),
			LiveURL:        "https://medsafe.com.ng",
			Published:      true,
			SortOrder:      4,
		},
	}
	for i := range products {
		var existing models.Product
		result := db.Where("slug = ?", products[i].Slug).Attrs(products[i]).FirstOrCreate(&existing)
		if result.Error != nil {
			log.Printf("Warning: failed to create product %q: %v", products[i].Name, result.Error)
			continue
		}
		if result.RowsAffected > 0 {
			log.Printf("Created product: %q", products[i].Name)
		}
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
		var existing models.Testimonial
		result := db.Where("company_name = ?", testimonials[i].CompanyName).Attrs(testimonials[i]).FirstOrCreate(&existing)
		if result.Error != nil {
			log.Printf("Warning: failed to create testimonial for %q: %v", testimonials[i].CompanyName, result.Error)
			continue
		}
		if result.RowsAffected > 0 {
			log.Printf("Created testimonial from: %q", testimonials[i].CompanyName)
		}

		// CaseStudy <-> Testimonial is a genuine two-way belongs_to (each
		// side has its own FK column) — Testimonial.CaseStudyID was set
		// above, but the reverse CaseStudy.TestimonialID was never
		// backfilled, so CaseStudy's own Preload("Testimonial") always
		// came back empty. Keep both sides in sync every run, not just on
		// create, so this can't silently drift again.
		if existing.CaseStudyID != "" {
			db.Model(&models.CaseStudy{}).
				Where("id = ?", existing.CaseStudyID).
				Update("testimonial_id", existing.ID)
		}
	}

	return nil
}
