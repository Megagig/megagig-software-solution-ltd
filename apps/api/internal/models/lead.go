package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// Lead represents a lead in the system.
type Lead struct {
	ID                 string                      `gorm:"primarykey;size:36" json:"id"`
	Name               string                      `gorm:"size:255" json:"name" binding:"required"`
	Email              string                      `gorm:"size:255" json:"email" binding:"required"`
	Phone              string                      `gorm:"size:255" json:"phone" binding:"required"`
	Company            string                      `gorm:"size:255" json:"company" binding:"required"`
	ProjectType        string                      `gorm:"size:255" json:"project_type" binding:"required"`
	BudgetRange        string                      `gorm:"size:255" json:"budget_range" binding:"required"`
	ServicesInterested datatypes.JSONSlice[string] `gorm:"type:json" json:"services_interested"`
	Message            string                      `gorm:"type:text" json:"message"`
	Source             string                      `gorm:"size:255" json:"source" binding:"required"`
	Status             string                      `gorm:"size:255" json:"status" binding:"required"`
	InternalNotes      string                      `gorm:"type:text" json:"internal_notes"`
	Version            int                         `gorm:"not null;default:1" json:"version"`
	CreatedAt          time.Time                   `json:"created_at"`
	UpdatedAt          time.Time                   `json:"updated_at"`
	DeletedAt          gorm.DeletedAt              `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *Lead) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = ids.New()
	}
	return nil
}

// BeforeUpdate increments Version so offline clients can detect server-side updates.
func (m *Lead) BeforeUpdate(tx *gorm.DB) error {
	tx.Statement.SetColumn("version", gorm.Expr("version + 1"))
	return nil
}
