package middleware

import (
	"bytes"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"megagig-software-solution/apps/api/internal/cache"
)

// IdempotencyTTL is how long a stored idempotent response is replayed.
// 24h matches Stripe's published behavior and is plenty long for client
// retries while keeping Redis pressure bounded.
const IdempotencyTTL = 24 * time.Hour

// IdempotencyHeader is the header clients set to opt into idempotent retries.
const IdempotencyHeader = "Idempotency-Key"

// Idempotency is a middleware that gives clients safe retry semantics for
// unsafe methods (POST/PUT/PATCH/DELETE). When a request carries an
// Idempotency-Key header, the first successful response (any 2xx) is cached
// and any subsequent request with the same key replays the cached response
// instead of re-executing the handler.
//
// Skipped when:
//   - cacheService is nil (Redis unavailable)
//   - request method is GET/HEAD/OPTIONS (already idempotent)
//   - Idempotency-Key header is missing or empty
//
// Cache key is namespaced per HTTP method + path so the same key reused across
// different endpoints does not collide. The cached payload includes status +
// content type + body, so replay returns a byte-for-byte identical response.
//
// Errors (5xx) are intentionally NOT cached so transient failures can be
// retried with the same key; only 2xx responses are stored.
func Idempotency(cacheService *cache.Cache) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cacheService == nil {
			c.Next()
			return
		}

		switch c.Request.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			c.Next()
			return
		}

		key := c.GetHeader(IdempotencyHeader)
		if key == "" {
			c.Next()
			return
		}

		cacheKey := "idem:" + c.Request.Method + ":" + c.FullPath() + ":" + key

		// Replay if we've seen this key before.
		var cached idempotentResponse
		found, err := cacheService.Get(c.Request.Context(), cacheKey, &cached)
		if err == nil && found {
			c.Header("Idempotent-Replayed", "true")
			c.Data(cached.Status, cached.ContentType, cached.Body)
			c.Abort()
			return
		}

		// Capture the live response so we can store it after the handler runs.
		writer := &idempotencyCapture{ResponseWriter: c.Writer, buf: bytes.NewBuffer(nil)}
		c.Writer = writer

		c.Next()

		// Only cache 2xx — let clients retry on 4xx/5xx with the same key.
		if writer.status >= 200 && writer.status < 300 {
			resp := idempotentResponse{
				Status:      writer.status,
				ContentType: writer.Header().Get("Content-Type"),
				Body:        writer.buf.Bytes(),
			}
			_ = cacheService.Set(c.Request.Context(), cacheKey, resp, IdempotencyTTL)
		}
	}
}

type idempotentResponse struct {
	Status      int    `json:"status"`
	ContentType string `json:"content_type"`
	Body        []byte `json:"body"`
}

type idempotencyCapture struct {
	gin.ResponseWriter
	buf    *bytes.Buffer
	status int
}

func (w *idempotencyCapture) Write(b []byte) (int, error) {
	w.buf.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *idempotencyCapture) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}
