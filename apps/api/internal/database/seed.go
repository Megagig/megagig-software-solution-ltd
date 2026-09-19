package database

import (
	"fmt"

	"gorm.io/gorm"
)

// Seed runs every seeder. Seeders live in their own <name>_seeder.go files in
// this package — edit those to change the seed data, or run
// "grit generate seeder <Resource>" to add a new one.
func Seed(db *gorm.DB) error {
	if err := SeedUsers(db); err != nil {
		return fmt.Errorf("seeding users: %w", err)
	}

	if err := SeedBlogs(db); err != nil {
		return fmt.Errorf("seeding blogs: %w", err)
	}

	if err := SeedSiteSettings(db); err != nil {
		return fmt.Errorf("seeding site settings: %w", err)
	}

	if err := SeedAbout(db); err != nil {
		return fmt.Errorf("seeding about content: %w", err)
	}

	if err := SeedTeam(db); err != nil {
		return fmt.Errorf("seeding team: %w", err)
	}

	if err := SeedCareers(db); err != nil {
		return fmt.Errorf("seeding careers: %w", err)
	}

	if err := SeedDemoContent(db); err != nil {
		return fmt.Errorf("seeding demo content: %w", err)
	}

	// grit:seeders

	return nil
}
