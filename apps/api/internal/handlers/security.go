package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"megagig-software-solution/apps/api/internal/services"
)

type SecurityHandler struct {
	Bridge *services.SecObsBridge
}

// Summary returns the flat security envelope the React dashboard reads.
// On a fresh app with no traffic, expect zeros and empty arrays — that's
// the truth, not a bug.
func (h *SecurityHandler) Summary(c *gin.Context) {
	if h.Bridge == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": gin.H{"code": "SENTINEL_OFF", "message": "Sentinel is not enabled"},
		})
		return
	}

	ctx := c.Request.Context()

	// /sentinel/api/ip/blocked returns {data: BlockedIP[]} — currently
	// banned IPs with reason and optional expiry.
	var blockedResp struct {
		Data []struct {
			IP        string     `json:"ip"`
			Reason    string     `json:"reason"`
			BlockedAt time.Time  `json:"blocked_at"`
			ExpiresAt *time.Time `json:"expires_at"`
		} `json:"data"`
	}
	_ = h.Bridge.SentinelGet(ctx, "/sentinel/api/ip/blocked", &blockedResp)

	// /sentinel/api/analytics/summary?window=24h returns ThreatStats:
	// total_threats, blocked_count, etc. blocked_count over the 24h
	// window is the closest analogue to "auto-bans in the last 24h".
	var statsResp struct {
		Data struct {
			TotalThreats int64 `json:"total_threats"`
			BlockedCount int64 `json:"blocked_count"`
		} `json:"data"`
	}
	_ = h.Bridge.SentinelGet(ctx, "/sentinel/api/analytics/summary?window=24h", &statsResp)

	// /sentinel/api/threats?limit=10 returns ThreatEvent[]. Each event
	// carries the threat types as a string slice plus the offender IP.
	var threatsResp struct {
		Data []struct {
			ID          string    `json:"id"`
			IP          string    `json:"ip"`
			Path        string    `json:"path"`
			ThreatTypes []string  `json:"threat_types"`
			Severity    string    `json:"severity"`
			Timestamp   time.Time `json:"timestamp"`
		} `json:"data"`
	}
	_ = h.Bridge.SentinelGet(ctx, "/sentinel/api/threats?limit=10", &threatsResp)

	activeBans := make([]gin.H, 0, len(blockedResp.Data))
	for _, b := range blockedResp.Data {
		var expires string
		if b.ExpiresAt != nil {
			expires = b.ExpiresAt.Format(time.RFC3339)
		}
		activeBans = append(activeBans, gin.H{
			"ip":         b.IP,
			"reason":     b.Reason,
			"expires_at": expires,
			"level":      1, // Sentinel's BlockedIP doesn't carry an escalation level
		})
	}

	recentThreats := make([]gin.H, 0, len(threatsResp.Data))
	for _, t := range threatsResp.Data {
		threatType := ""
		if len(t.ThreatTypes) > 0 {
			threatType = t.ThreatTypes[0]
		}
		recentThreats = append(recentThreats, gin.H{
			"id":          t.ID,
			"type":        threatType,
			"ip":          t.IP,
			"description": t.Path,
			"created_at":  t.Timestamp.Format(time.RFC3339),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"banned_ips_now":         len(blockedResp.Data),
		"auto_bans_24h":          statsResp.Data.BlockedCount,
		"rate_limited_last_hour": 0, // Not directly exposed by Sentinel; populated by rate-limit logs in a future release
		"active_bans":            activeBans,
		"rate_limit_hits_5min":   []gin.H{},
		"recent_threats":         recentThreats,
	})
}
