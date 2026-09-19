package database

import (
	"log"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// SeedCareers seeds ONE sample job opening so the /careers list can be seen
// on day one. Only runs while the table is empty.
//
// It is a DRAFT the founder asked for — not a confirmed vacancy. A job
// opening is a public statement that Megagig is hiring, so it must be
// reviewed, edited or closed (is_open = false) in admin before launch; the
// progress tracker carries a checklist item for exactly that. The
// description sticks to what the site already states (the real tech stack
// and product work) and makes no promises about pay, benefits or process.
// apply_url is blank on purpose: the public page then falls back to the
// contact email from Site Settings.
func SeedCareers(db *gorm.DB) error {
	var count int64
	db.Model(&models.JobOpening{}).Count(&count)
	if count > 0 {
		log.Println("Job openings already seeded, skipping...")
		return nil
	}

	role := models.JobOpening{
		Title:          "Full-Stack Developer",
		Department:     "Engineering",
		Location:       "Lagos, Nigeria",
		EmploymentType: "Full-time",
		Description: "Help us build and run production software for Nigerian businesses — from the database and API " +
			"through the web, desktop and mobile clients that ship to real users.\n\n" +
			"You'll work across our stack (Next.js and React on the front end, Go and PostgreSQL on the back end) " +
			"on products we operate ourselves, such as PharmacyCopilot and BusinessCopilot, as well as custom client projects.\n\n" +
			"Send us your CV and a few lines about something you've built. We'd like to see how you work.",
		IsOpen: true,
	}
	if err := db.Create(&role).Error; err != nil {
		return err
	}
	log.Println("Created 1 sample job opening (review or close it before launch)")
	return nil
}
