package services

import (
	"errors"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
)

// Session lifetimes. Overridable per deployment; the defaults are deliberately
// conservative — an unused login dies in a week, and any login dies in 30 days
// no matter how active it is.
var (
	SessionIdleTimeout     = 7 * 24 * time.Hour
	SessionAbsoluteTimeout = 30 * 24 * time.Hour
)

// ErrSessionInvalid is returned when a refresh token has no live session:
// unknown, revoked, idle-expired, absolutely expired, or replayed.
var ErrSessionInvalid = errors.New("session is not valid")

// CreateSession records a newly issued refresh token as a logged-in device.
func CreateSession(db *gorm.DB, c *gin.Context, userID, refreshToken string) (*models.Session, error) {
	now := time.Now()
	s := &models.Session{
		UserID:     userID,
		TokenHash:  models.HashSessionToken(refreshToken),
		UserAgent:  truncateStr(c.Request.UserAgent(), 512),
		IP:         c.ClientIP(),
		LastSeenAt: now,
		ExpiresAt:  now.Add(SessionAbsoluteTimeout),
	}
	if err := db.Create(s).Error; err != nil {
		return nil, err
	}
	return s, nil
}

// RotateSession validates a presented refresh token and swaps it for a new one.
//
// Rotation is what makes a stolen refresh token survivable: the thief and the
// victim cannot both use it, and whoever refreshes second presents an already-
// rotated token — which lands in the PrevTokenHash branch and kills the session
// for both, surfacing the theft instead of silently sharing the account.
func RotateSession(db *gorm.DB, c *gin.Context, oldToken, newToken string) (*models.Session, error) {
	oldHash := models.HashSessionToken(oldToken)

	var s models.Session
	err := db.Where("token_hash = ?", oldHash).First(&s).Error
	if err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		// Not the current token. If it's the PREVIOUS one, this is a replay of a
		// rotated token — treat it as compromise and kill the session.
		var replayed models.Session
		if db.Where("prev_token_hash = ?", oldHash).First(&replayed).Error == nil {
			now := time.Now()
			db.Model(&replayed).Update("revoked_at", &now)
		}
		return nil, ErrSessionInvalid
	}

	if !s.Active(time.Now(), SessionIdleTimeout) {
		return nil, ErrSessionInvalid
	}

	now := time.Now()
	if err := db.Model(&s).Updates(map[string]interface{}{
		"token_hash":      models.HashSessionToken(newToken),
		"prev_token_hash": oldHash,
		"last_seen_at":    now,
		"ip":              c.ClientIP(),
		"user_agent":      truncateStr(c.Request.UserAgent(), 512),
	}).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

// RevokeSessionByToken kills the session a refresh token belongs to (logout).
func RevokeSessionByToken(db *gorm.DB, refreshToken string) error {
	now := time.Now()
	return db.Model(&models.Session{}).
		Where("token_hash = ? AND revoked_at IS NULL", models.HashSessionToken(refreshToken)).
		Update("revoked_at", &now).Error
}

// RevokeSession kills one session by id, scoped to its owner so a user can
// never revoke someone else's device.
func RevokeSession(db *gorm.DB, userID, sessionID string) error {
	now := time.Now()
	res := db.Model(&models.Session{}).
		Where("id = ? AND user_id = ? AND revoked_at IS NULL", sessionID, userID).
		Update("revoked_at", &now)
	if res.Error != nil {
		return res.Error
	}
	if res.RowsAffected == 0 {
		return ErrSessionInvalid
	}
	return nil
}

// RevokeAllUserSessions kills every session for a user. Call it on password
// change, on MFA change, and from "log out everywhere". exceptToken, when
// non-empty, spares the caller's own session.
func RevokeAllUserSessions(db *gorm.DB, userID, exceptToken string) error {
	now := time.Now()
	q := db.Model(&models.Session{}).Where("user_id = ? AND revoked_at IS NULL", userID)
	if exceptToken != "" {
		q = q.Where("token_hash <> ?", models.HashSessionToken(exceptToken))
	}
	return q.Update("revoked_at", &now).Error
}

// ListUserSessions returns a user's live sessions, newest activity first.
func ListUserSessions(db *gorm.DB, userID string) ([]models.Session, error) {
	var out []models.Session
	err := db.Where("user_id = ? AND revoked_at IS NULL AND expires_at > ?", userID, time.Now()).
		Order("last_seen_at desc").Find(&out).Error
	return out, err
}

func truncateStr(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n]
}
