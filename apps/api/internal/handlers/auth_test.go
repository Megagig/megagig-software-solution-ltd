package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"megagig-software-solution/apps/api/internal/config"
	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/services"
)

// newTestDB opens a fresh in-memory SQLite database and migrates the User model.
// It accepts testing.TB so both tests and benchmarks can call it.
func newTestDB(tb testing.TB) *gorm.DB {
	tb.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	require.NoError(tb, err)
	require.NoError(tb, db.AutoMigrate(&models.User{}))
	return db
}

func newTestAuthSvc(cfg *config.Config) *services.AuthService {
	return &services.AuthService{
		Secret:        cfg.JWTSecret,
		AccessExpiry:  cfg.JWTAccessExpiry,
		RefreshExpiry: cfg.JWTRefreshExpiry,
	}
}

func testCfg() *config.Config {
	return &config.Config{
		JWTSecret:        "test-secret-key-for-testing-only",
		JWTAccessExpiry:  15 * time.Minute,
		JWTRefreshExpiry: 7 * 24 * time.Hour,
	}
}

func newAuthRouter(h *AuthHandler) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/api/auth/register", h.Register)
	r.POST("/api/auth/login", h.Login)
	return r
}

func postJSON(tb testing.TB, r *gin.Engine, path string, body map[string]string) *httptest.ResponseRecorder {
	tb.Helper()
	raw, err := json.Marshal(body)
	require.NoError(tb, err)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(raw))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	return w
}

func TestAuthHandler_Register_Success(t *testing.T) {
	cfg := testCfg()
	db := newTestDB(t)
	h := &AuthHandler{DB: db, AuthService: newTestAuthSvc(cfg), Config: cfg}
	r := newAuthRouter(h)

	w := postJSON(t, r, "/api/auth/register", map[string]string{
		"first_name": "Jane",
		"last_name":  "Doe",
		"email":      "jane@example.com",
		"password":   "password123",
	})

	assert.Equal(t, http.StatusCreated, w.Code)

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "User registered successfully", resp["message"])

	data, ok := resp["data"].(map[string]interface{})
	require.True(t, ok, "response should have data field")
	assert.NotNil(t, data["tokens"])
	assert.NotNil(t, data["user"])
}

func TestAuthHandler_Register_ValidationError(t *testing.T) {
	cfg := testCfg()
	db := newTestDB(t)
	h := &AuthHandler{DB: db, AuthService: newTestAuthSvc(cfg), Config: cfg}
	r := newAuthRouter(h)

	// Missing required fields (first_name, last_name, password)
	w := postJSON(t, r, "/api/auth/register", map[string]string{
		"email": "incomplete@example.com",
	})

	assert.Equal(t, http.StatusUnprocessableEntity, w.Code)

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	errObj, ok := resp["error"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, "VALIDATION_ERROR", errObj["code"])
}

func TestAuthHandler_Register_DuplicateEmail(t *testing.T) {
	cfg := testCfg()
	db := newTestDB(t)
	h := &AuthHandler{DB: db, AuthService: newTestAuthSvc(cfg), Config: cfg}
	r := newAuthRouter(h)

	body := map[string]string{
		"first_name": "Alice",
		"last_name":  "Smith",
		"email":      "alice@example.com",
		"password":   "password123",
	}

	// First registration — should succeed
	w1 := postJSON(t, r, "/api/auth/register", body)
	require.Equal(t, http.StatusCreated, w1.Code)

	// Second registration same email — should conflict
	w2 := postJSON(t, r, "/api/auth/register", body)
	assert.Equal(t, http.StatusConflict, w2.Code)

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w2.Body.Bytes(), &resp))
	errObj, ok := resp["error"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, "EMAIL_EXISTS", errObj["code"])
}

func TestAuthHandler_Login_Success(t *testing.T) {
	cfg := testCfg()
	db := newTestDB(t)
	h := &AuthHandler{DB: db, AuthService: newTestAuthSvc(cfg), Config: cfg}
	r := newAuthRouter(h)

	// Register first
	postJSON(t, r, "/api/auth/register", map[string]string{
		"first_name": "Bob",
		"last_name":  "Jones",
		"email":      "bob@example.com",
		"password":   "mypassword99",
	})

	// Then login
	w := postJSON(t, r, "/api/auth/login", map[string]string{
		"email":    "bob@example.com",
		"password": "mypassword99",
	})

	assert.Equal(t, http.StatusOK, w.Code)

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	assert.Equal(t, "Logged in successfully", resp["message"])

	data, ok := resp["data"].(map[string]interface{})
	require.True(t, ok)
	tokens, ok := data["tokens"].(map[string]interface{})
	require.True(t, ok)
	assert.NotEmpty(t, tokens["access_token"])
	assert.NotEmpty(t, tokens["refresh_token"])
}

func TestAuthHandler_Login_WrongPassword(t *testing.T) {
	cfg := testCfg()
	db := newTestDB(t)
	h := &AuthHandler{DB: db, AuthService: newTestAuthSvc(cfg), Config: cfg}
	r := newAuthRouter(h)

	postJSON(t, r, "/api/auth/register", map[string]string{
		"first_name": "Carol",
		"last_name":  "White",
		"email":      "carol@example.com",
		"password":   "correct-password",
	})

	w := postJSON(t, r, "/api/auth/login", map[string]string{
		"email":    "carol@example.com",
		"password": "wrong-password",
	})

	assert.Equal(t, http.StatusUnauthorized, w.Code)

	var resp map[string]interface{}
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	errObj, ok := resp["error"].(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, "INVALID_CREDENTIALS", errObj["code"])
}

func TestAuthHandler_Login_UnknownEmail(t *testing.T) {
	cfg := testCfg()
	db := newTestDB(t)
	h := &AuthHandler{DB: db, AuthService: newTestAuthSvc(cfg), Config: cfg}
	r := newAuthRouter(h)

	w := postJSON(t, r, "/api/auth/login", map[string]string{
		"email":    "nobody@example.com",
		"password": "anything",
	})

	assert.Equal(t, http.StatusUnauthorized, w.Code)
}
