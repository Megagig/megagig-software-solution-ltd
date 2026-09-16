package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"megagig-software-solution/apps/api/internal/mail"
	"megagig-software-solution/apps/api/internal/models"
)

// SendTicketCreatedEmail forwards a freshly-opened ticket to the support
// inbox configured via SUPPORT_EMAIL in .env. Silently no-ops (with a
// log line) when SUPPORT_EMAIL or Resend keys are missing — keeps the
// dev experience flowing without forcing email setup.
//
// The body intentionally stays plain-text + minimal HTML so any inbox
// renders it. The "Reply in dashboard" link points at the admin panel.
func SendTicketCreatedEmail(m *mail.Mailer, t *models.Ticket, creator *models.User) error {
	to := os.Getenv("SUPPORT_EMAIL")
	if to == "" {
		log.Printf("ticket-mail: SUPPORT_EMAIL not set, skipping email for ticket %s", t.ID)
		return nil
	}

	creatorLine := "unknown"
	if creator != nil {
		creatorLine = fmt.Sprintf("%s %s <%s>", creator.FirstName, creator.LastName, creator.Email)
	}

	subject := fmt.Sprintf("[Ticket #%s] %s", short(t.ID), t.Subject)
	dashURL := os.Getenv("ADMIN_URL")
	if dashURL == "" {
		dashURL = "http://localhost:3001"
	}

	html := fmt.Sprintf(`<!doctype html>
<html><body style="font-family: -apple-system, sans-serif; line-height: 1.55; color: #111;">
  <h2 style="margin: 0 0 12px 0;">New support ticket</h2>
  <p style="margin: 0 0 12px 0;"><strong>Subject:</strong> %s</p>
  <p style="margin: 0 0 12px 0;"><strong>Priority:</strong> %s &nbsp;|&nbsp; <strong>Labels:</strong> %s</p>
  <p style="margin: 0 0 12px 0;"><strong>From:</strong> %s</p>
  <hr style="border:none; border-top:1px solid #eee; margin: 16px 0;" />
  <pre style="white-space: pre-wrap; font-family: inherit; margin: 0 0 16px 0;">%s</pre>
  <p style="margin: 0;">
    <a href="%s/system/support/%s" style="display:inline-block; padding:10px 16px; background:#2563eb; color:white; text-decoration:none; border-radius:8px;">
      Reply in dashboard
    </a>
  </p>
</body></html>`,
		t.Subject, t.Priority, defaultIfEmpty(t.Labels, "—"),
		creatorLine, t.Description, dashURL, t.ID,
	)

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	return m.SendRaw(ctx, to, subject, html)
}

func short(id string) string {
	if len(id) >= 8 {
		return id[:8]
	}
	return id
}

func defaultIfEmpty(s, fallback string) string {
	if s == "" {
		return fallback
	}
	return s
}
