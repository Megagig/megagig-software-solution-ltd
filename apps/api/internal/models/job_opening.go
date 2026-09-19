package models

import (
	"time"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// JobOpening represents a jobopening in the system.
type JobOpening struct {
	ID             string         `gorm:"primarykey;size:36" json:"id"`
	Title          string         `gorm:"size:255" json:"title" binding:"required"`
	Department     string         `gorm:"size:255" json:"department" binding:"required"`
	Location       string         `gorm:"size:255" json:"location" binding:"required"`
	EmploymentType string         `gorm:"size:255" json:"employment_type" binding:"required"`
	Description    string         `gorm:"type:text" json:"description"`
	ApplyURL       string         `gorm:"size:500" json:"apply_url"`
	IsOpen         bool           `json:"is_open"`
	Version        int            `gorm:"not null;default:1" json:"version"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *JobOpening) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = ids.New()
	}
	return nil
}

// BeforeUpdate increments Version so offline clients can detect server-side updates.
func (m *JobOpening) BeforeUpdate(tx *gorm.DB) error {
	tx.Statement.SetColumn("version", gorm.Expr("version + 1"))
	return nil
}
