package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"megagig-software-solution/apps/api/internal/models"
	"megagig-software-solution/apps/api/internal/services"
	"megagig-software-solution/apps/api/internal/totp"
)

// TOTPHandler handles two-factor authentication endpoints.
type TOTPHandler struct {
	DB          *gorm.DB
	AuthService *services.AuthService
	Issuer      string // App name for authenticator display
}

type totpSetupResponse struct {
	Secret string `json:"secret"`
	URI    string `json:"uri"`
}

type totpEnableRequest struct {
	Secret string `json:"secret" binding:"required"`
	Code   string `json:"code" binding:"required"`
}

type totpVerifyRequest struct {
	PendingToken string `json:"pending_token" binding:"required"`
	Code         string `json:"code" binding:"required"`
	TrustDevice  bool   `json:"trust_device"`
}

type totpDisableRequest struct {
	Password string `json:"password" binding:"required"`
}

type backupCodeVerifyRequest struct {
	PendingToken string `json:"pending_token" binding:"required"`
	Code         string `json:"code" binding:"required"`
	TrustDevice  bool   `json:"trust_device"`
}

// Setup generates a new TOTP secret and QR code URI for the user.
// The secret is NOT stored yet — the user must verify it first via Enable.
func (h *TOTPHandler) Setup(c *gin.Context) {
	userID := c.GetString("user_id")
	user, _ := c.Get("user")
	u := user.(models.User)

	// Check if TOTP is already enabled
	var existing models.TwoFactorConfig
	if err := h.DB.Where("user_id = ?", userID).First(&existing).Error; err == nil && existing.Enabled {
		c.JSON(http.StatusConflict, gin.H{
			"error": gin.H{
				"code":    "TOTP_ALREADY_ENABLED",
				"message": "Two-factor authentication is already enabled",
			},
		})
		return
	}

	secret, err := totp.GenerateSecret()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOTP_ERROR", "message": "Failed to generate secret"},
		})
		return
	}

	uri := totp.GenerateURI(secret, u.Email, h.Issuer)

	c.JSON(http.StatusOK, gin.H{
		"data": totpSetupResponse{
			Secret: secret,
			URI:    uri,
		},
		"message": "Scan the QR code with your authenticator app, then verify with a code",
	})
}

// Enable verifies the initial TOTP code and activates 2FA for the user.
// Returns backup codes that the user should save.
func (h *TOTPHandler) Enable(c *gin.Context) {
	userID := c.GetString("user_id")

	var req totpEnableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	// Verify the code matches the secret
	valid, err := totp.ValidateCode(req.Secret, req.Code)
	if err != nil || !valid {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "INVALID_TOTP_CODE",
				"message": "Invalid verification code. Make sure your authenticator app is synced.",
			},
		})
		return
	}

	// Generate backup codes
	codes, hashes, err := totp.GenerateBackupCodes(0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOTP_ERROR", "message": "Failed to generate backup codes"},
		})
		return
	}

	// Upsert the TwoFactorConfig
	var config models.TwoFactorConfig
	h.DB.Where("user_id = ?", userID).FirstOrCreate(&config, models.TwoFactorConfig{UserID: userID})

	config.Secret = req.Secret
	config.Enabled = true
	config.BackupCodes = hashes

	if err := h.DB.Save(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOTP_ERROR", "message": "Failed to enable two-factor authentication"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"enabled":      true,
			"backup_codes": codes,
		},
		"message": "Two-factor authentication enabled. Save your backup codes in a safe place.",
	})
}

// Verify validates a TOTP code during the login flow (after password check).
// Exchanges a pending token + valid TOTP code for real JWT tokens.
func (h *TOTPHandler) Verify(c *gin.Context) {
	var req totpVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	// Look up the pending token
	tokenHash := totp.HashToken(req.PendingToken)
	var pending models.TOTPPendingToken
	if err := h.DB.Where("token_hash = ? AND expires_at > ?", tokenHash, time.Now()).First(&pending).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "INVALID_PENDING_TOKEN",
				"message": "Invalid or expired verification session. Please log in again.",
			},
		})
		return
	}

	// Get the user's TOTP config
	var config models.TwoFactorConfig
	if err := h.DB.Where("user_id = ? AND enabled = ?", pending.UserID, true).First(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOTP_ERROR", "message": "Two-factor configuration not found"},
		})
		return
	}

	// Validate the TOTP code
	valid, err := totp.ValidateCode(config.Secret, req.Code)
	if err != nil || !valid {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "INVALID_TOTP_CODE",
				"message": "Invalid verification code",
			},
		})
		return
	}

	// Delete the pending token (one-time use)
	h.DB.Delete(&pending)

	// Load the user for token generation
	var user models.User
	if err := h.DB.Where("id = ?", pending.UserID).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "USER_ERROR", "message": "User not found"},
		})
		return
	}

	// Generate real JWT tokens
	tokens, err := h.AuthService.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOKEN_ERROR", "message": "Failed to generate tokens"},
		})
		return
	}

	// If user wants to trust this device, create a trusted device cookie
	if req.TrustDevice {
		h.createTrustedDevice(c, user.ID)
	}

	// Mirror tokens into HttpOnly cookies so the browser client doesn't
	// need to handle them in JS. Native bearer clients use the JSON body.
	h.AuthService.SetAuthCookies(c, tokens)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"user":   user,
			"tokens": tokens,
		},
		"message": "Logged in successfully",
	})
}

// VerifyBackupCode validates a backup code during login (alternative to TOTP).
func (h *TOTPHandler) VerifyBackupCode(c *gin.Context) {
	var req backupCodeVerifyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	// Look up the pending token
	tokenHash := totp.HashToken(req.PendingToken)
	var pending models.TOTPPendingToken
	if err := h.DB.Where("token_hash = ? AND expires_at > ?", tokenHash, time.Now()).First(&pending).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "INVALID_PENDING_TOKEN",
				"message": "Invalid or expired verification session. Please log in again.",
			},
		})
		return
	}

	// Get the user's TOTP config
	var config models.TwoFactorConfig
	if err := h.DB.Where("user_id = ? AND enabled = ?", pending.UserID, true).First(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOTP_ERROR", "message": "Two-factor configuration not found"},
		})
		return
	}

	// Verify the backup code
	idx := totp.VerifyBackupCode(req.Code, config.BackupCodes)
	if idx < 0 {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "INVALID_BACKUP_CODE",
				"message": "Invalid backup code",
			},
		})
		return
	}

	// Remove the used backup code (one-time use)
	config.BackupCodes = append(config.BackupCodes[:idx], config.BackupCodes[idx+1:]...)
	h.DB.Save(&config)

	// Delete the pending token
	h.DB.Delete(&pending)

	// Load user and generate tokens
	var user models.User
	if err := h.DB.Where("id = ?", pending.UserID).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "USER_ERROR", "message": "User not found"},
		})
		return
	}

	tokens, err := h.AuthService.GenerateTokenPair(user.ID, user.Email, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOKEN_ERROR", "message": "Failed to generate tokens"},
		})
		return
	}

	if req.TrustDevice {
		h.createTrustedDevice(c, user.ID)
	}

	remaining := len(config.BackupCodes)
	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"user":                   user,
			"tokens":                 tokens,
			"backup_codes_remaining": remaining,
		},
		"message": "Logged in successfully with backup code",
	})
}

// Disable turns off 2FA for the user (requires password confirmation).
func (h *TOTPHandler) Disable(c *gin.Context) {
	userID := c.GetString("user_id")

	var req totpDisableRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error": gin.H{"code": "VALIDATION_ERROR", "message": err.Error()},
		})
		return
	}

	// Verify password
	var user models.User
	if err := h.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": gin.H{"code": "NOT_FOUND", "message": "User not found"},
		})
		return
	}

	if !user.CheckPassword(req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": gin.H{
				"code":    "INVALID_PASSWORD",
				"message": "Incorrect password",
			},
		})
		return
	}

	// Delete TOTP config, trusted devices, and pending tokens
	h.DB.Where("user_id = ?", userID).Delete(&models.TwoFactorConfig{})
	h.DB.Where("user_id = ?", userID).Delete(&models.TrustedDevice{})
	h.DB.Where("user_id = ?", userID).Delete(&models.TOTPPendingToken{})

	c.JSON(http.StatusOK, gin.H{
		"message": "Two-factor authentication disabled",
	})
}

// Status returns whether TOTP is enabled for the current user.
func (h *TOTPHandler) Status(c *gin.Context) {
	userID := c.GetString("user_id")

	var config models.TwoFactorConfig
	enabled := false
	backupCodesRemaining := 0

	if err := h.DB.Where("user_id = ?", userID).First(&config).Error; err == nil {
		enabled = config.Enabled
		backupCodesRemaining = len(config.BackupCodes)
	}

	// Count trusted devices
	var deviceCount int64
	h.DB.Model(&models.TrustedDevice{}).Where("user_id = ? AND expires_at > ?", userID, time.Now()).Count(&deviceCount)

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"enabled":                enabled,
			"backup_codes_remaining": backupCodesRemaining,
			"trusted_devices":        deviceCount,
		},
	})
}

// RegenerateBackupCodes creates a new set of backup codes, replacing the old ones.
func (h *TOTPHandler) RegenerateBackupCodes(c *gin.Context) {
	userID := c.GetString("user_id")

	var config models.TwoFactorConfig
	if err := h.DB.Where("user_id = ? AND enabled = ?", userID, true).First(&config).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": gin.H{
				"code":    "TOTP_NOT_ENABLED",
				"message": "Two-factor authentication is not enabled",
			},
		})
		return
	}

	codes, hashes, err := totp.GenerateBackupCodes(0)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOTP_ERROR", "message": "Failed to generate backup codes"},
		})
		return
	}

	config.BackupCodes = hashes
	if err := h.DB.Save(&config).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": gin.H{"code": "TOTP_ERROR", "message": "Failed to save backup codes"},
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": gin.H{
			"backup_codes": codes,
		},
		"message": "New backup codes generated. Previous codes are now invalid.",
	})
}

// RevokeTrustedDevices removes all trusted devices for the current user.
func (h *TOTPHandler) RevokeTrustedDevices(c *gin.Context) {
	userID := c.GetString("user_id")

	h.DB.Where("user_id = ?", userID).Delete(&models.TrustedDevice{})

	c.JSON(http.StatusOK, gin.H{
		"message": "All trusted devices revoked. You will need to enter a TOTP code on next login.",
	})
}

// createTrustedDevice stores a trusted device and sets the cookie.
func (h *TOTPHandler) createTrustedDevice(c *gin.Context, userID string) {
	deviceToken, err := totp.GenerateDeviceToken()
	if err != nil {
		return // Non-critical, skip silently
	}

	device := models.TrustedDevice{
		UserID:    userID,
		TokenHash: totp.HashToken(deviceToken),
		UserAgent: c.Request.UserAgent(),
		IPAddress: c.ClientIP(),
		ExpiresAt: time.Now().Add(totp.TrustedDeviceDuration),
	}

	if err := h.DB.Create(&device).Error; err != nil {
		return // Non-critical
	}

	c.SetCookie(
		"totp_trusted",
		deviceToken,
		int(totp.TrustedDeviceDuration.Seconds()),
		"/",
		"",    // domain
		false, // secure (set true in production)
		true,  // httpOnly
	)
}

// IsTrustedDevice checks if the current request has a valid trusted device cookie.
func IsTrustedDevice(c *gin.Context, db *gorm.DB, userID string) bool {
	token, err := c.Cookie("totp_trusted")
	if err != nil || token == "" {
		return false
	}

	tokenHash := totp.HashToken(token)
	var device models.TrustedDevice
	if err := db.Where("user_id = ? AND token_hash = ? AND expires_at > ?", userID, tokenHash, time.Now()).First(&device).Error; err != nil {
		return false
	}

	// Refresh the device expiry (sliding window)
	device.ExpiresAt = time.Now().Add(totp.TrustedDeviceDuration)
	db.Save(&device)

	return true
}
