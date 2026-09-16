package middleware

import (
	"bytes"
	"hash/fnv"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"megagig-software-solution/apps/api/internal/cache"
)

// CacheResponse caches GET request responses in Redis for the given duration.
// Only caches 200 OK responses. Skips caching if no cache service is available.
func CacheResponse(cacheService *cache.Cache, ttl time.Duration) gin.HandlerFunc {
	return func(c *gin.Context) {
		if cacheService == nil || c.Request.Method != http.MethodGet {
			c.Next()
			return
		}

		// Build cache key from URL + query params. We use FNV-1a (non-
		// cryptographic) instead of SHA-256 because cache keys don't
		// need cryptographic strength and FNV is ~50x faster on the
		// hot path of every cacheable request.
		h := fnv.New64a()
		h.Write([]byte(c.Request.URL.String()))
		key := "http:" + strconv.FormatUint(h.Sum64(), 16)

		// Try to serve from cache
		var cached cachedResponse
		found, err := cacheService.Get(c.Request.Context(), key, &cached)
		if err == nil && found {
			c.Header("X-Cache", "HIT")
			c.Data(cached.Status, cached.ContentType, cached.Body)
			c.Abort()
			return
		}

		// Capture the response. bytes.Buffer grows in chunks (vs []byte
		// append which can reallocate on every Write), so a 100 KB
		// response only takes ~3 allocations instead of one per chunk.
		writer := &responseCapture{ResponseWriter: c.Writer, body: bytes.NewBuffer(nil)}
		c.Writer = writer
		c.Header("X-Cache", "MISS")

		c.Next()

		// Cache successful responses
		if writer.status == http.StatusOK && writer.body.Len() > 0 {
			resp := cachedResponse{
				Status:      writer.status,
				ContentType: writer.Header().Get("Content-Type"),
				Body:        writer.body.Bytes(),
			}
			_ = cacheService.Set(c.Request.Context(), key, resp, ttl)
		}
	}
}

type cachedResponse struct {
	Status      int    `json:"status"`
	ContentType string `json:"content_type"`
	Body        []byte `json:"body"`
}

type responseCapture struct {
	gin.ResponseWriter
	body   *bytes.Buffer
	status int
}

func (w *responseCapture) Write(b []byte) (int, error) {
	w.body.Write(b)
	return w.ResponseWriter.Write(b)
}

func (w *responseCapture) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}
