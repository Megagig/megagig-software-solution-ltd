package main

import (
	"context"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"megagig-software-solution/apps/api/internal/backup"
	"megagig-software-solution/apps/api/internal/config"
	"megagig-software-solution/apps/api/internal/database"
	"megagig-software-solution/apps/api/internal/storage"
)

// Backs up every registered model to a ZIP (CSV per table + dump.sql +
// metadata.json). By default it uploads to object storage and records the row;
// --output writes a local file instead and touches nothing else.
func main() {
	out := flag.String("output", "", "Write the archive to this local path instead of uploading")
	flag.Parse()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}
	db, err := database.Connect(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	svc := &backup.Service{DB: db}
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()

	if *out != "" {
		f, err := os.Create(*out)
		if err != nil {
			log.Fatalf("Failed to create %s: %v", *out, err)
		}
		man, err := svc.ArchiveTo(ctx, f)
		if err != nil {
			f.Close()
			log.Fatalf("Backup failed: %v", err)
		}
		if err := f.Close(); err != nil {
			log.Fatalf("Failed to write %s: %v", *out, err)
		}
		var sizeKB float64
		if fi, err := os.Stat(*out); err == nil {
			sizeKB = float64(fi.Size()) / 1024
		}
		fmt.Printf("Backup written to %s — %d tables, %d rows, %.1f KB\n",
			*out, len(man.Tables), man.TotalRows, sizeKB)
		return
	}

	st, err := storage.New(cfg.Storage)
	if err != nil {
		log.Fatalf("Object storage is not configured: %v\n(use --output <file> to write a local archive)", err)
	}
	svc.Storage = st

	rec, err := svc.Generate(ctx, "CLI")
	if err != nil {
		log.Fatalf("Backup failed: %v", err)
	}
	fmt.Printf("Backup %s uploaded — %d tables, %d rows, %.1f KB\n",
		rec.ID, rec.TableCount, rec.RowCount, float64(rec.SizeBytes)/1024)
}
