package models

import (
	"time"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// Stat represents a stat in the system.
type Stat struct {
	ID        string         `gorm:"primarykey;size:36" json:"id"`
	Value     string         `gorm:"size:255" json:"value" binding:"required"`
	Label     string         `gorm:"size:255" json:"label" binding:"required"`
	Published bool           `json:"published"`
	SortOrder int            `json:"sort_order"`
	Version   int            `gorm:"not null;default:1" json:"version"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *Stat) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = ids.New()
	}
	return nil
}

// BeforeUpdate increments Version so offline clients can detect server-side updates.
func (m *Stat) BeforeUpdate(tx *gorm.DB) error {
	tx.Statement.SetColumn("version", gorm.Expr("version + 1"))
	return nil
}
