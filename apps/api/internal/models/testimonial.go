package models

import (
	"time"

	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// Testimonial represents a testimonial in the system.
type Testimonial struct {
	ID          string         `gorm:"primarykey;size:36" json:"id"`
	QuoteText   string         `gorm:"type:text" json:"quote_text"`
	AuthorName  string         `gorm:"size:255" json:"author_name" binding:"required"`
	AuthorRole  string         `gorm:"size:255" json:"author_role" binding:"required"`
	CompanyName string         `gorm:"size:255" json:"company_name" binding:"required"`
	CompanyURL  string         `gorm:"size:500" json:"company_url" binding:"required"`
	AvatarID    string         `gorm:"size:36;index" json:"avatar_id" binding:"required"`
	Avatar      Upload         `gorm:"foreignKey:AvatarID" json:"avatar"`
	CaseStudyID string         `gorm:"size:36;index" json:"case_study_id"`
	CaseStudy   *CaseStudy     `gorm:"foreignKey:CaseStudyID" json:"case_study,omitempty"`
	Published   bool           `json:"published"`
	SortOrder   int            `json:"sort_order"`
	Version     int            `gorm:"not null;default:1" json:"version"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *Testimonial) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = ids.New()
	}
	return nil
}

// BeforeUpdate increments Version so offline clients can detect server-side updates.
func (m *Testimonial) BeforeUpdate(tx *gorm.DB) error {
	tx.Statement.SetColumn("version", gorm.Expr("version + 1"))
	return nil
}
