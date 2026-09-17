package models

import (
	"time"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// TeamMember represents a teammember in the system.
type TeamMember struct {
	ID          string         `gorm:"primarykey;size:36" json:"id"`
	Name        string         `gorm:"size:255" json:"name" binding:"required"`
	Role        string         `gorm:"size:255" json:"role" binding:"required"`
	PhotoID     string         `gorm:"size:36;index" json:"photo_id" binding:"required"`
	Photo       Upload         `gorm:"foreignKey:PhotoID" json:"photo"`
	LinkedinURL string         `gorm:"size:500" json:"linkedin_url" binding:"required"`
	GithubURL   string         `gorm:"size:500" json:"github_url" binding:"required"`
	Published   bool           `json:"published"`
	SortOrder   int            `json:"sort_order"`
	Version     int            `gorm:"not null;default:1" json:"version"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *TeamMember) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = ids.New()
	}
	return nil
}

// BeforeUpdate increments Version so offline clients can detect server-side updates.
func (m *TeamMember) BeforeUpdate(tx *gorm.DB) error {
	tx.Statement.SetColumn("version", gorm.Expr("version + 1"))
	return nil
}
