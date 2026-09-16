package main

import (
	"flag"
	"fmt"
	"log"
	"os"

	"megagig-software-solution/apps/api/internal/config"
	"megagig-software-solution/apps/api/internal/database"
	"megagig-software-solution/apps/api/internal/models"
)

func main() {
	fresh := flag.Bool("fresh", false, "Drop all tables before migrating")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	if *fresh {
		fmt.Println("Dropping all tables...")
		if err := database.DropAll(db); err != nil {
			log.Fatalf("Failed to drop tables: %v", err)
		}
		fmt.Println("All tables dropped.")
	}

	fmt.Println("Running migrations...")
	if err := models.Migrate(db); err != nil {
		log.Fatalf("Migration failed: %v", err)
	}

	fmt.Println("Migrations completed successfully.")
	os.Exit(0)
}
