package models

import (
	"time"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// FAQ represents a faq in the system.
type FAQ struct {
	ID        string         `gorm:"primarykey;size:36" json:"id"`
	Question  string         `gorm:"size:255" json:"question" binding:"required"`
	Answer    string         `gorm:"type:text" json:"answer"`
	Published bool           `json:"published"`
	SortOrder int            `json:"sort_order"`
	Version   int            `gorm:"not null;default:1" json:"version"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *FAQ) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = ids.New()
	}
	return nil
}

// BeforeUpdate increments Version so offline clients can detect server-side updates.
func (m *FAQ) BeforeUpdate(tx *gorm.DB) error {
	tx.Statement.SetColumn("version", gorm.Expr("version + 1"))
	return nil
}
