package middleware

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"io"
	"log"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/audit"
	"megagig-software-solution/apps/api/internal/models"
)

// ActivityLogger records every successful authenticated mutation
// (POST/PUT/PATCH/DELETE) into models.ActivityLog. Skips:
//   - safe methods (GET/HEAD/OPTIONS)
//   - non-2xx responses (errors aren't audit-relevant)
//   - unauthenticated requests (no user_id ⇒ nothing to attribute)
//
// The payload digest is a SHA-256 hash of the request body — enough to
// prove "this exact payload was sent" without persisting plain-text
// passwords / secrets / PII. Buffered in memory, so MaxBodySize earlier
// in the chain still bounds it.
//
// Insert is fire-and-forget via a bounded channel + single writer
// goroutine. The single-writer design eliminates lock contention on
// the hash chain — only one goroutine ever appends — and the bounded
// channel caps memory + goroutine count under traffic spikes.
func ActivityLogger(db *gorm.DB) gin.HandlerFunc {
	auditOnce.Do(func() { go startAuditWorker(db) })
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			c.Next()
			return
		}

		// Capture the body so we can hash it after the handler runs.
		// gin reads from c.Request.Body, so we tee it through a
		// bytes.Buffer and put a fresh ReadCloser back.
		//
		// Skip multipart/form-data (file uploads): buffering the whole file
		// into memory is pointless for an audit digest, and re-reading it here
		// can leave the handler's ParseMultipartForm with nothing to parse
		// ("No file provided"). Uploads are logged by path/actor, not payload.
		var bodyBytes []byte
		if c.Request.Body != nil &&
			!strings.HasPrefix(c.GetHeader("Content-Type"), "multipart/form-data") {
			bodyBytes, _ = io.ReadAll(c.Request.Body)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
		}

		started := time.Now()
		c.Next()

		// Only log successful mutations — failed ones can be diagnosed
		// from request logs without polluting the audit trail.
		if c.Writer.Status() < 200 || c.Writer.Status() >= 300 {
			return
		}

		userID, _ := c.Get("user_id")
		uid, _ := userID.(string)
		if uid == "" {
			return // unauthenticated — nothing to audit
		}

		entry := models.ActivityLog{
			UserID:        uid,
			Method:        c.Request.Method,
			Path:          c.FullPath(),
			Status:        c.Writer.Status(),
			PayloadDigest: digestBody(bodyBytes),
			IPAddress:     resolveClientIP(c),
			UserAgent:     c.Request.UserAgent(),
			DurationMS:    time.Since(started).Milliseconds(),
			CreatedAt:     time.Now(), // explicit — Canonical hashes this field
		}
		// Non-blocking enqueue. Channel is bounded so a runaway request
		// rate can't spawn unbounded goroutines or exhaust the DB pool.
		// On overflow we drop — better to lose an audit row than to
		// stall the request path or OOM the process.
		select {
		case auditChan <- entry:
		default:
			auditDropped.Add(1)
		}
	}
}

// v3.31.49 -- mirror of services.ResolveClientIP. Inlined here
// (rather than imported) because middleware is a leaf dep that the
// services package itself relies on through the request chain;
// duplicating ten lines avoids the cycle and keeps the audit path
// allocation-free.
func resolveClientIP(c *gin.Context) string {
	ip := c.ClientIP()
	if ip == "::1" || ip == "127.0.0.1" || ip == "0.0.0.0" {
		if hint := strings.TrimSpace(c.GetHeader("X-Public-IP-Hint")); hint != "" {
			if len(hint) > 64 {
				hint = hint[:64]
			}
			return hint
		}
	}
	return ip
}

// auditChan is the bounded backlog for the single audit writer. 4096
// is enough to absorb a few-second burst (10k req/s for 0.4s) without
// blocking. The single-worker design also removes the need for a
// row-level FOR UPDATE lock on every write — chain integrity comes
// for free from sequential writes.
var (
	auditChan    = make(chan models.ActivityLog, 4096)
	auditOnce    sync.Once
	auditDropped atomicCounter
)

// auditDropped is exported via the integrity endpoint so ops can
// monitor when the audit channel saturates (signal to scale or
// reduce log noise).
type atomicCounter struct {
	mu sync.Mutex
	n  uint64
}

func (c *atomicCounter) Add(n uint64) {
	c.mu.Lock()
	c.n += n
	c.mu.Unlock()
}

// AuditDroppedCount returns the number of audit entries dropped due
// to channel saturation. Read this from a /healthz or admin endpoint
// to detect sustained back-pressure.
func AuditDroppedCount() uint64 {
	auditDropped.mu.Lock()
	defer auditDropped.mu.Unlock()
	return auditDropped.n
}

// startAuditWorker drains auditChan and writes each entry to the
// database with the hash chain attached. Single goroutine — no lock
// contention, no goroutine explosion, deterministic ordering.
//
// On boot the worker reads the latest persisted hash so the chain
// continues across restarts.
func startAuditWorker(db *gorm.DB) {
	var prev models.ActivityLog
	prevHash := ""
	if err := db.Order("created_at desc, id desc").Limit(1).First(&prev).Error; err == nil {
		prevHash = prev.Hash
	}

	for entry := range auditChan {
		canonical, err := audit.Canonical(&entry)
		if err != nil {
			log.Printf("[audit] canonicalize failed: %v", err)
			continue
		}
		entry.PrevHash = prevHash
		entry.Hash = audit.ComputeHash(prevHash, canonical)
		if err := db.Create(&entry).Error; err != nil {
			log.Printf("[audit] insert failed: %v", err)
			// Don't advance prevHash on failure — the next successful
			// write should chain off the last persisted row.
			continue
		}
		prevHash = entry.Hash
	}
}

func digestBody(b []byte) string {
	if len(b) == 0 {
		return ""
	}
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:])
}
