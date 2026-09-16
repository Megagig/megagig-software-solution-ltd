package middleware

import (
	"net/http"
	"net/url"

	"github.com/gin-gonic/gin"
)

// isWailsOrigin reports whether the request came from the Wails desktop
// webview, whose origin is not stably enumerable:
//
//	wails dev   (Windows)     http://wails.localhost:34115   <- port from wails.json
//	wails build (Windows)     http://wails.localhost
//	wails build (mac/linux)   wails://wails
//
// The dev-server port is configurable, so pinning exact origins in
// CORS_ORIGINS is fragile: change the port and the desktop login silently
// starts failing with an opaque "Network Error". Match on the host instead.
//
// Safe by construction: "wails.localhost" is a virtual host the webview
// resolves internally, so a page on the public internet cannot be served
// from it and cannot forge this origin. Every other origin still has to be
// in the explicit CORS_ORIGINS allowlist.
func isWailsOrigin(origin string) bool {
	if origin == "wails://wails" {
		return true
	}
	u, err := url.Parse(origin)
	if err != nil {
		return false
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return false
	}
	return u.Hostname() == "wails.localhost"
}

// CORS creates a CORS middleware with the given allowed origins.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	originsMap := make(map[string]bool)
	for _, origin := range allowedOrigins {
		originsMap[origin] = true
	}

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if originsMap[origin] || isWailsOrigin(origin) {
			c.Header("Access-Control-Allow-Origin", origin)
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		// X-CSRF-Token + Idempotency-Key are injected by the web and admin
		// axios clients on every unsafe method. Without them in the allowed
		// list, the browser's preflight strips the headers and the request
		// either fails the AutoCSRF check or replays without an idempotency
		// guarantee. Authorization stays for native bearer clients.
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-CSRF-Token, Idempotency-Key, X-Public-IP-Hint")
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
