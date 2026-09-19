package models

import (
	"time"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// TeamMember is a person shown on /team (and a Blog author). PhotoURL is a
// plain URL/path — an uploaded file or a static asset — rather than an
// Upload relation, so photos can be seeded from apps/web/public and replaced
// through the admin's image upload zone. Every social link is optional; the
// public site renders a button only for the ones that are set.
type TeamMember struct {
	ID          string         `gorm:"primarykey;size:36" json:"id"`
	Name        string         `gorm:"size:255" json:"name" binding:"required"`
	Role        string         `gorm:"size:255" json:"role" binding:"required"`
	PhotoURL    string         `gorm:"size:500" json:"photo_url"`
	LinkedinURL string         `gorm:"size:500" json:"linkedin_url"`
	GithubURL   string         `gorm:"size:500" json:"github_url"`
	TwitterURL  string         `gorm:"size:500" json:"twitter_url"`
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
