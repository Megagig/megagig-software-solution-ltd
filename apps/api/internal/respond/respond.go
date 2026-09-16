// Package respond is the standard error/response envelope for handlers.
// Use these instead of writing c.JSON(500, gin.H{"error": err.Error()})
// inline so error shapes stay consistent and the frontend's
// apiErrorMessage() helper has a single shape to walk.
package respond

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Error is the wire shape of every error envelope.
type Error struct {
	Code    string            `json:"code"`
	Message string            `json:"message"`
	Details map[string]string `json:"details,omitempty"`
}

// fail writes the standard error envelope at the given status code.
func fail(c *gin.Context, status int, code, message string, details ...map[string]string) {
	body := gin.H{"error": Error{Code: code, Message: message}}
	if len(details) > 0 {
		body = gin.H{"error": Error{Code: code, Message: message, Details: details[0]}}
	}
	c.AbortWithStatusJSON(status, body)
}

// 400 — malformed request that the client can't possibly fix without
// changing what it sent.
func BadRequest(c *gin.Context, message string) {
	fail(c, http.StatusBadRequest, "BAD_REQUEST", message)
}

// 401 — missing or invalid credentials.
func Unauthorized(c *gin.Context, message string) {
	if message == "" {
		message = "Authentication required"
	}
	fail(c, http.StatusUnauthorized, "UNAUTHORIZED", message)
}

// 403 — authenticated but not allowed.
func Forbidden(c *gin.Context, message string) {
	if message == "" {
		message = "You don't have permission to do that"
	}
	fail(c, http.StatusForbidden, "FORBIDDEN", message)
}

// 404 — entity didn't exist (or is filtered out by access rules).
func NotFound(c *gin.Context, message string) {
	if message == "" {
		message = "Not found"
	}
	fail(c, http.StatusNotFound, "NOT_FOUND", message)
}

// 409 — conflict (e.g. unique constraint, version conflict).
func Conflict(c *gin.Context, message string) {
	fail(c, http.StatusConflict, "CONFLICT", message)
}

// 422 — payload was well-formed but failed validation. Pass per-field
// errors via details map so the frontend can highlight them.
func Validation(c *gin.Context, message string, fields map[string]string) {
	fail(c, http.StatusUnprocessableEntity, "VALIDATION_ERROR", message, fields)
}

// 500 — server fault. Don't echo the raw error; log it and return a
// generic message so we don't leak internals.
func Internal(c *gin.Context, internalErr error) {
	msg := "Internal server error"
	if internalErr != nil {
		// In dev you may want the actual message. For now keep it
		// opaque; logger middleware records the full err.
		_ = internalErr
	}
	fail(c, http.StatusInternalServerError, "INTERNAL_ERROR", msg)
}

// OK writes 200 with { data, message? }.
func OK(c *gin.Context, data interface{}, message ...string) {
	body := gin.H{"data": data}
	if len(message) > 0 && message[0] != "" {
		body["message"] = message[0]
	}
	c.JSON(http.StatusOK, body)
}

// Created writes 201 with { data, message? }.
func Created(c *gin.Context, data interface{}, message ...string) {
	body := gin.H{"data": data}
	if len(message) > 0 && message[0] != "" {
		body["message"] = message[0]
	}
	c.JSON(http.StatusCreated, body)
}
