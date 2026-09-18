package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/ids"
)

// CaseStudy represents a casestudy in the system.
type CaseStudy struct {
	ID            string                      `gorm:"primarykey;size:36" json:"id"`
	Slug          string                      `gorm:"size:255" json:"slug" binding:"required"`
	ClientName    string                      `gorm:"size:255" json:"client_name" binding:"required"`
	Tagline       string                      `gorm:"size:255" json:"tagline" binding:"required"`
	CategoryTags  datatypes.JSONSlice[string] `gorm:"type:json" json:"category_tags"`
	StatusBadge   string                      `gorm:"size:255" json:"status_badge" binding:"required"`
	HeroImageID   string                      `gorm:"size:36;index" json:"hero_image_id" binding:"required"`
	HeroImage     Upload                      `gorm:"foreignKey:HeroImageID" json:"hero_image"`
	Problem       string                      `gorm:"type:text" json:"problem"`
	WhatWeBuilt   string                      `gorm:"type:text" json:"what_we_built"`
	Result        string                      `gorm:"type:text" json:"result"`
	TechStack     datatypes.JSONSlice[string] `gorm:"type:json" json:"tech_stack"`
	LiveURL       string                      `gorm:"size:500" json:"live_url"`
	TestimonialID string                      `gorm:"size:36;index" json:"testimonial_id"`
	Testimonial   *Testimonial                `gorm:"foreignKey:TestimonialID" json:"testimonial,omitempty"`
	Published     bool                        `json:"published"`
	SortOrder     int                         `json:"sort_order"`
	Version       int                         `gorm:"not null;default:1" json:"version"`
	CreatedAt     time.Time                   `json:"created_at"`
	UpdatedAt     time.Time                   `json:"updated_at"`
	DeletedAt     gorm.DeletedAt              `gorm:"index" json:"-"`
}

// BeforeCreate generates a UUID before inserting.
func (m *CaseStudy) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = ids.New()
	}
	return nil
}

// BeforeUpdate increments Version so offline clients can detect server-side updates.
func (m *CaseStudy) BeforeUpdate(tx *gorm.DB) error {
	tx.Statement.SetColumn("version", gorm.Expr("version + 1"))
	return nil
}
