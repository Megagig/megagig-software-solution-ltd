package database

import (
	"log"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// SeedTeam seeds the /team page's starting members. Only runs while the
// table is empty, so admin edits and deletions are never overwritten.
//
//   - CONFIRMED by the founder: the four names, the photos (files in
//     apps/web/public) and the three GitHub URLs; the founder's own links
//     are the ones already on his Site Settings profile.
//   - PLACEHOLDERS the founder asked for, to be replaced in admin: every
//     job title for the three teammates, and their LinkedIn / X links
//     (generic site homepages, deliberately not a made-up profile).
func SeedTeam(db *gorm.DB) error {
	var count int64
	db.Model(&models.TeamMember{}).Count(&count)
	if count > 0 {
		log.Println("Team members already seeded, skipping...")
		return nil
	}

	const (
		linkedinPlaceholder = "https://www.linkedin.com/"
		xPlaceholder        = "https://x.com/"
	)

	members := []models.TeamMember{
		{
			Name:        "Obi Anthony Uchenna",
			Role:        "Founder & Lead Developer",
			PhotoURL:    "/founderProfile.jfif",
			LinkedinURL: "https://www.linkedin.com/in/obi-anthony/",
			GithubURL:   "https://github.com/Megagig",
			TwitterURL:  "https://x.com/megagigsolution",
			SortOrder:   1,
		},
		{
			Name:        "Obi Emmanuel",
			Role:        "Full-Stack Developer",
			PhotoURL:    "/Obi%20Emmanuel.png",
			LinkedinURL: linkedinPlaceholder,
			GithubURL:   "https://github.com/Gmanlove",
			TwitterURL:  xPlaceholder,
			SortOrder:   2,
		},
		{
			Name:        "Tunde Abina",
			Role:        "Backend Engineer",
			PhotoURL:    "/Abina%20Tunde.jfif",
			LinkedinURL: linkedinPlaceholder,
			GithubURL:   "https://github.com/tunde2023",
			TwitterURL:  xPlaceholder,
			SortOrder:   3,
		},
		{
			Name:        "Opeyemi Akanni",
			Role:        "Frontend Engineer",
			PhotoURL:    "/opeyemi%20Akanni.jfif",
			LinkedinURL: linkedinPlaceholder,
			GithubURL:   "https://github.com/Aoamos",
			TwitterURL:  xPlaceholder,
			SortOrder:   4,
		},
	}
	for i := range members {
		members[i].Published = true
	}

	if err := db.Create(&members).Error; err != nil {
		return err
	}
	log.Printf("Created %d team members", len(members))
	return nil
}
