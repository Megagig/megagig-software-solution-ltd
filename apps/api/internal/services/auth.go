package services

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// AuthService handles JWT token operations.
type AuthService struct {
	Secret        string
	AccessExpiry  time.Duration
	RefreshExpiry time.Duration
}

// TokenPair holds access and refresh tokens.
type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	ExpiresAt    int64  `json:"expires_at"`
}

// Claims represents JWT claims.
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// GenerateTokenPair creates a new access + refresh token pair.
func (s *AuthService) GenerateTokenPair(userID string, email, role string) (*TokenPair, error) {
	accessToken, expiresAt, err := s.generateToken(userID, email, role, s.AccessExpiry)
	if err != nil {
		return nil, fmt.Errorf("generating access token: %w", err)
	}

	refreshToken, _, err := s.generateToken(userID, email, role, s.RefreshExpiry)
	if err != nil {
		return nil, fmt.Errorf("generating refresh token: %w", err)
	}

	return &TokenPair{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresAt:    expiresAt,
	}, nil
}

// ValidateToken parses and validates a JWT token.
func (s *AuthService) ValidateToken(tokenString string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.Secret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("parsing token: %w", err)
	}

	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token")
	}

	return claims, nil
}

// GenerateResetToken creates a random hex token for password resets.
func GenerateResetToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", fmt.Errorf("generating reset token: %w", err)
	}
	return hex.EncodeToString(bytes), nil
}

func (s *AuthService) generateToken(userID string, email, role string, expiry time.Duration) (string, int64, error) {
	expiresAt := time.Now().Add(expiry)

	// Every token gets a unique jti. Without it, two tokens minted for the same
	// user in the same second are byte-identical — same claims, same
	// second-resolution exp, same key — so two different devices would share one
	// refresh token and could not be told apart or revoked independently.
	jti, err := GenerateResetToken()
	if err != nil {
		return "", 0, fmt.Errorf("generating token id: %w", err)
	}

	claims := &Claims{
		UserID: userID,
		Email:  email,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        jti,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(s.Secret))
	if err != nil {
		return "", 0, err
	}

	return tokenString, expiresAt.Unix(), nil
}

// SetAuthCookies writes the token pair as HttpOnly cookies so the browser
// holds the credentials out of JavaScript's reach. The native mobile and
// desktop clients keep using the Authorization: Bearer header, which is
// why the JSON body still includes the tokens — both paths work.
//
// Cookie names: grit_access (sent on every request) and grit_refresh
// (scoped to /api/auth so it isn't sent everywhere). Both are HttpOnly,
// Secure when on HTTPS, and SameSite=Lax so CSRF surface is limited to
// top-level navigations. The CSRF middleware adds defence in depth.
//
// Reference: docs/backend/authentication §"Token Storage on the Frontend".
func (s *AuthService) SetAuthCookies(c *gin.Context, pair *TokenPair) {
	secure := isRequestHTTPS(c)
	accessSeconds := int(s.AccessExpiry / time.Second)
	refreshSeconds := int(s.RefreshExpiry / time.Second)

	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("grit_access", pair.AccessToken, accessSeconds, "/", "", secure, true)
	c.SetCookie("grit_refresh", pair.RefreshToken, refreshSeconds, "/api/auth", "", secure, true)
}

// ClearAuthCookies expires both auth cookies. Call this from the Logout
// handler so a stolen browser session is cut off as soon as the user
// signs out.
func (s *AuthService) ClearAuthCookies(c *gin.Context) {
	secure := isRequestHTTPS(c)
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("grit_access", "", -1, "/", "", secure, true)
	c.SetCookie("grit_refresh", "", -1, "/api/auth", "", secure, true)
}

// isRequestHTTPS returns true when the request is on HTTPS (directly or
// via a trusted proxy that set X-Forwarded-Proto=https). We use it to flip
// the Secure cookie flag so the browser refuses to send these cookies
// over an unencrypted hop.
func isRequestHTTPS(c *gin.Context) bool {
	if c.Request.TLS != nil {
		return true
	}
	if strings.EqualFold(c.GetHeader("X-Forwarded-Proto"), "https") {
		return true
	}
	return false
}
