package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// Product represents a product in the system.
type Product struct {
	ID             string                      `gorm:"primarykey;size:36" json:"id"`
	Slug           string                      `gorm:"size:255" json:"slug" binding:"required"`
	Name           string                      `gorm:"size:255" json:"name" binding:"required"`
	Tagline        string                      `gorm:"size:255" json:"tagline" binding:"required"`
	Description    string                      `gorm:"type:text" json:"description"`
	FeatureBullets datatypes.JSONSlice[string] `gorm:"type:json" json:"feature_bullets"`
	LiveURL        string                      `gorm:"size:500" json:"live_url" binding:"required"`
	DocsURL        string                      `gorm:"size:500" json:"docs_url" binding:"required"`
	Screenshots    []Upload                    `gorm:"many2many:product_screenshots" json:"screenshots"`
	Published      bool                        `json:"published"`
	SortOrder      int                         `json:"sort_order"`
	Version        int                         `gorm:"not null;default:1" json:"version"`
	CreatedAt      time.Time                   `json:"created_at"`
	UpdatedAt      time.Time                   `json:"updated_at"`
	DeletedAt      gorm.DeletedAt              `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *Product) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = ids.New()
	}
	return nil
}

// BeforeUpdate increments Version so offline clients can detect server-side updates.
func (m *Product) BeforeUpdate(tx *gorm.DB) error {
	tx.Statement.SetColumn("version", gorm.Expr("version + 1"))
	return nil
}
