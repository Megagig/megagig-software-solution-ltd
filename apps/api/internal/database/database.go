package database

import (
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/glebarez/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// Connect establishes a database connection using the provided DSN.
//
// Driver is chosen by DSN shape:
//   - "sqlite://path" or "sqlite:path"  → SQLite (file or :memory:)
//   - anything else                     → Postgres
//
// Examples:
//
//	DATABASE_URL=sqlite:./bench.db
//	DATABASE_URL=sqlite::memory:
//	DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=disable
func Connect(dsn string) (*gorm.DB, error) {
	logLevel := logger.Warn
	if os.Getenv("DB_LOG_LEVEL") == "info" {
		logLevel = logger.Info
	} else if os.Getenv("DB_LOG_LEVEL") == "silent" {
		logLevel = logger.Silent
	}
	// DisableForeignKeyConstraintWhenMigrating: CaseStudy <-> Testimonial is a
	// genuine two-way belongs_to (each optionally points at the other, see
	// architecture.md's CaseStudy.TestimonialID / Testimonial.CaseStudyID).
	// GORM's schema parser can't resolve DB-level FK constraints for that
	// cycle during AutoMigrate ("relation does not exist" — whichever table
	// migrates first references a table that doesn't exist yet). Referential
	// integrity for every model is already enforced at the service layer
	// (existence checks before create/update), so DB-level FK constraints
	// were never load-bearing — this just stops AutoMigrate from trying.
	gormCfg := &gorm.Config{Logger: logger.Default.LogMode(logLevel), DisableForeignKeyConstraintWhenMigrating: true}

	var (
		db  *gorm.DB
		err error
	)

	switch {
	case strings.HasPrefix(dsn, "sqlite://"):
		db, err = gorm.Open(sqlite.Open(strings.TrimPrefix(dsn, "sqlite://")), gormCfg)
	case strings.HasPrefix(dsn, "sqlite:"):
		db, err = gorm.Open(sqlite.Open(strings.TrimPrefix(dsn, "sqlite:")), gormCfg)
	default:
		db, err = gorm.Open(postgres.New(postgres.Config{
			DSN:                  dsn,
			PreferSimpleProtocol: true,
		}), gormCfg)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	// Connection pool settings. SQLite ignores most of these — single-writer
	// semantics mean MaxOpenConns above 1 only helps concurrent reads, and
	// SQLite serialises writes internally. Postgres uses every knob.
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(10 * time.Minute)

	log.Println("Database connected successfully")
	return db, nil
}
