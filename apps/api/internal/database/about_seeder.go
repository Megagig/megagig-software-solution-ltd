package database

import (
	"log"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// SeedAbout seeds the admin-managed About/founder content: the SiteSettings
// About fields, the Stat list, and the AboutItem list (values, milestones,
// process steps).
//
// Two kinds of content are seeded here, and the difference matters:
//   - CONFIRMED by the founder: mission line, founding year, the 4 stats and
//     the founder's name/role/quote/bio/links — migrated word for word from
//     the components and lib/trust-stats.ts that used to hard-code them.
//   - DRAFTED (aboutItems below): values, milestones and process steps.
//     They are grounded in facts the founder has stated but the wording is a
//     first draft, meant to be edited in admin. Milestone labels avoid
//     specific years beyond the confirmed founding year on purpose.
//
// Never overwrites admin edits: SiteSettings fields are only filled while
// empty, and each list is only seeded while it has no rows.
func SeedAbout(db *gorm.DB) error {
	if err := seedAboutSettings(db); err != nil {
		return err
	}
	if err := seedStats(db); err != nil {
		return err
	}
	return seedAboutItems(db)
}

func seedAboutSettings(db *gorm.DB) error {
	var settings models.SiteSettings
	if err := db.First(&settings).Error; err != nil {
		return err
	}

	defaults := map[string]interface{}{
		"mission_statement": "We build production software that Nigerian businesses actually trust and use — engineered for how they run, not adapted from how someone else's market runs.",
		"founded_year":      2023,
		"founder_name":      "Obi Anthony Uchenna",
		"founder_role":      "Founder & Lead Developer, Megagig Software Solution Ltd",
		"founder_quote":     "Build software teams actually adopt, not software that looks good in a pitch deck.",
		"founder_bio": "I started Megagig Software Solution Ltd to close a gap I kept running into as a developer: " +
			"most Nigerian businesses were being sold software built for someone else's market — global SaaS that " +
			"ignores mobile money, offline-first retail, and how local teams actually work. I wanted to build the alternative.\n\n" +
			"Since 2023, I've built and shipped several production platforms end-to-end — including PharmacyCopilot, " +
			"a cross-platform pharmacy management SaaS running across web, desktop, and mobile for pharmacists across " +
			"Nigeria, and BusinessCopilot, a unified POS, inventory, accounting, CRM, and HR platform built to match and " +
			"exceed tools like QuickBooks and FreshBooks for the local market. I work the full stack — from the database " +
			"and API up through the desktop, web, and mobile clients that ship to real users.\n\n" +
			"My focus with Megagig is simple: build software teams actually adopt, not software that looks good in a pitch deck.",
		"founder_photo_url":    "/founderProfile.jfif",
		"founder_github_url":   "https://github.com/Megagig",
		"founder_linkedin_url": "https://www.linkedin.com/in/obi-anthony/",
		"founder_twitter_url":  "https://x.com/megagigsolution",
	}

	// Only fill what is still empty so admin edits always win. founding_story
	// is deliberately not seeded — the founder bio already tells the origin
	// and the public page hides the story section until one is written.
	current := map[string]bool{
		"mission_statement":    settings.MissionStatement == "",
		"founded_year":         settings.FoundedYear == 0,
		"founder_name":         settings.FounderName == "",
		"founder_role":         settings.FounderRole == "",
		"founder_quote":        settings.FounderQuote == "",
		"founder_bio":          settings.FounderBio == "",
		"founder_photo_url":    settings.FounderPhotoURL == "",
		"founder_github_url":   settings.FounderGithubURL == "",
		"founder_linkedin_url": settings.FounderLinkedinURL == "",
		"founder_twitter_url":  settings.FounderTwitterURL == "",
	}
	updates := map[string]interface{}{}
	for column, value := range defaults {
		if current[column] {
			updates[column] = value
		}
	}
	if len(updates) == 0 {
		return nil
	}
	if err := db.Model(&settings).Updates(updates).Error; err != nil {
		return err
	}
	log.Printf("Filled %d empty About/founder site-settings field(s)", len(updates))
	return nil
}

func seedStats(db *gorm.DB) error {
	var count int64
	db.Model(&models.Stat{}).Count(&count)
	if count > 0 {
		log.Println("Stats already seeded, skipping...")
		return nil
	}

	// Real figures confirmed by the founder (previously lib/trust-stats.ts).
	stats := []models.Stat{
		{Value: "3+", Label: "Years engineering production software", Published: true, SortOrder: 1},
		{Value: "10+", Label: "Products in production", Published: true, SortOrder: 2},
		{Value: "99.9%", Label: "Uptime", Published: true, SortOrder: 3},
		{Value: "200+", Label: "Pharmacies & businesses served", Published: true, SortOrder: 4},
	}
	if err := db.Create(&stats).Error; err != nil {
		return err
	}
	log.Printf("Created %d stats", len(stats))
	return nil
}

func seedAboutItems(db *gorm.DB) error {
	// DRAFT copy — see SeedAbout's doc comment. Edit freely in admin.
	aboutItems := []models.AboutItem{
		// Values
		{Kind: "value", Title: "Built for how Nigerian businesses work", Description: "Mobile money, offline-first retail and local team workflows shape our designs from day one, not as an afterthought.", SortOrder: 1},
		{Kind: "value", Title: "Adoption over demos", Description: "We measure success by whether your team actually uses the software every day, not by how it looks in a pitch deck.", SortOrder: 2},
		{Kind: "value", Title: "End-to-end ownership", Description: "One team across the database, API, web, desktop and mobile — so nothing falls between the cracks when something needs to ship or be fixed.", SortOrder: 3},
		{Kind: "value", Title: "Honest scoping", Description: "Every project is scoped and quoted individually, with no fixed packages and no surprise line items.", SortOrder: 4},

		// Milestones — only the founding year is a confirmed date.
		{Kind: "milestone", Label: "2023", Title: "Megagig Software Solution Ltd founded", Description: "Started to build the alternative to global software that ignores how Nigerian businesses actually operate.", SortOrder: 1},
		{Kind: "milestone", Label: "Since then", Title: "First production platforms shipped", Description: "PharmacyCopilot, a cross-platform pharmacy management SaaS, and BusinessCopilot, a unified POS, inventory, accounting, CRM and HR platform, went into production for real users.", SortOrder: 2},
		{Kind: "milestone", Label: "Today", Title: "A growing portfolio in production", Description: "Products we build and operate ourselves, plus custom software for pharmacies and businesses across Nigeria.", SortOrder: 3},

		// How we work
		{Kind: "step", Title: "Discovery", Description: "We learn how your business actually runs — workflows, users and constraints — before proposing anything.", SortOrder: 1},
		{Kind: "step", Title: "Scope & quote", Description: "You get a clear, individually scoped custom quote with defined deliverables.", SortOrder: 2},
		{Kind: "step", Title: "Design & build", Description: "We design and build in the open, shipping working increments you can review along the way.", SortOrder: 3},
		{Kind: "step", Title: "Launch", Description: "We deploy to production, migrate your data and get your team up to speed.", SortOrder: 4},
		{Kind: "step", Title: "Support & iterate", Description: "We stay involved after launch, improving the software as your business grows.", SortOrder: 5},
	}

	for _, kind := range []string{"value", "milestone", "step"} {
		var count int64
		db.Model(&models.AboutItem{}).Where("kind = ?", kind).Count(&count)
		if count > 0 {
			log.Printf("About items of kind %q already seeded, skipping...", kind)
			continue
		}
		var batch []models.AboutItem
		for _, item := range aboutItems {
			if item.Kind == kind {
				item.Published = true
				batch = append(batch, item)
			}
		}
		if err := db.Create(&batch).Error; err != nil {
			return err
		}
		log.Printf("Created %d %q about items", len(batch), kind)
	}
	return nil
}
