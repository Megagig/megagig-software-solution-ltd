package models

import (
	"time"

	"gorm.io/gorm"
	"megagig-software-solution/apps/api/internal/ids"
)

// Notification is an in-app message surfaced through the admin bell.
// Source distinguishes Sentinel security findings from Pulse perf
// findings from manual operator messages.
type Notification struct {
	ID        string     `gorm:"primarykey;size:36" json:"id"`
	UserID    string     `gorm:"size:36;index" json:"user_id"`  // empty = visible to all admins
	Source    string     `gorm:"size:16;index" json:"source"`   // sentinel | pulse | system
	Severity  string     `gorm:"size:16;index" json:"severity"` // critical | high | medium | low | info
	Title     string     `gorm:"size:200" json:"title"`
	Body      string     `gorm:"type:text" json:"body"`
	Link      string     `gorm:"size:500" json:"link"`          // deep-link into /sentinel/ui or /pulse/ui
	Dedup     string     `gorm:"size:128;uniqueIndex" json:"-"` // collision key — repeat firings update Count, not insert
	Count     int        `gorm:"default:1" json:"count"`
	ReadAt    *time.Time `json:"read_at"`
	CreatedAt time.Time  `gorm:"index" json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (n *Notification) BeforeCreate(tx *gorm.DB) error {
	if n.ID == "" {
		n.ID = ids.New()
	}
	return nil
}
