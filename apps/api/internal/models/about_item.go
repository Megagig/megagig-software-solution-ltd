package models

import (
	"time"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// AboutItem is one admin-managed entry on /about-us. Kind selects the
// section it renders in: "value", "milestone" or "step". Label is free-form
// text ("2023", "Since then") used only by milestones, so it is optional.
type AboutItem struct {
	ID          string         `gorm:"primarykey;size:36" json:"id"`
	Kind        string         `gorm:"size:20;index" json:"kind" binding:"required"`
	Title       string         `gorm:"size:255" json:"title" binding:"required"`
	Description string         `gorm:"type:text" json:"description"`
	Label       string         `gorm:"size:255" json:"label"`
	Published   bool           `json:"published"`
	SortOrder   int            `json:"sort_order"`
	Version     int            `gorm:"not null;default:1" json:"version"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *AboutItem) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = ids.New()
	}
	return nil
}

// BeforeUpdate increments Version so offline clients can detect server-side updates.
func (m *AboutItem) BeforeUpdate(tx *gorm.DB) error {
	tx.Statement.SetColumn("version", gorm.Expr("version + 1"))
	return nil
}
