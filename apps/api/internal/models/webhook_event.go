package models

import (
	"time"

	"gorm.io/datatypes"
	"gorm.io/gorm"
	"megagig-software-solution/apps/api/internal/ids"
)

// WebhookEvent persists every webhook the API receives. ExternalID is
// the provider's own event ID — we use it as the idempotency key, so
// duplicate deliveries (Stripe retries, partner pings) become no-ops.
//
// Status lifecycle:
//
//	pending   — received + verified, handler not yet run
//	processed — handler returned nil
//	failed    — handler returned an error; HandlerError holds the message
//	skipped   — duplicate ExternalID — handler was bypassed
type WebhookEvent struct {
	ID           string         `gorm:"primarykey;size:36" json:"id"`
	Provider     string         `gorm:"size:50;index;not null" json:"provider"`
	EventType    string         `gorm:"size:100;index" json:"event_type"`
	ExternalID   string         `gorm:"size:255;index" json:"external_id"` // provider's event id
	Payload      datatypes.JSON `gorm:"type:jsonb" json:"payload"`
	Status       string         `gorm:"size:20;index;not null;default:pending" json:"status"`
	HandlerError string         `gorm:"type:text" json:"handler_error,omitempty"`
	RetryCount   int            `gorm:"not null;default:0" json:"retry_count"`
	ProcessedAt  *time.Time     `json:"processed_at,omitempty"`
	CreatedAt    time.Time      `gorm:"index" json:"created_at"`
}

func (w *WebhookEvent) BeforeCreate(tx *gorm.DB) error {
	if w.ID == "" {
		w.ID = ids.New()
	}
	return nil
}

// Composite unique index on (provider, external_id) gives us
// idempotent receipt: a duplicate delivery from the same provider
// with the same event id fails the INSERT, which we treat as
// "already processed".
func (WebhookEvent) Indexes() string {
	return "CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_provider_external_id ON webhook_events(provider, external_id) WHERE external_id <> ''"
}
