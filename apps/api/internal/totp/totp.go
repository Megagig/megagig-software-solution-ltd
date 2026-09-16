package totp

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha1"
	"crypto/sha256"
	"encoding/base32"
	"encoding/binary"
	"encoding/hex"
	"fmt"
	"math"
	"net/url"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

const (
	// SecretSize is the number of random bytes for the TOTP secret.
	SecretSize = 20
	// CodeDigits is the number of digits in a TOTP code.
	CodeDigits = 6
	// Period is the time step in seconds.
	Period = 30
	// Window is the number of periods to check before/after current (clock skew tolerance).
	Window = 1
	// BackupCodeLength is the character length of each backup code.
	BackupCodeLength = 8
	// BackupCodeCount is the default number of backup codes generated.
	BackupCodeCount = 10
	// PendingTokenExpiry is how long a TOTP pending token is valid.
	PendingTokenExpiry = 5 * time.Minute
	// TrustedDeviceDuration is how long a trusted device cookie lasts.
	TrustedDeviceDuration = 30 * 24 * time.Hour // 30 days
)

// GenerateSecret creates a new random TOTP secret, base32-encoded.
func GenerateSecret() (string, error) {
	secret := make([]byte, SecretSize)
	if _, err := rand.Read(secret); err != nil {
		return "", fmt.Errorf("generating TOTP secret: %w", err)
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(secret), nil
}

// GenerateURI builds an otpauth:// URI for QR code generation.
func GenerateURI(secret, email, issuer string) string {
	v := url.Values{}
	v.Set("secret", secret)
	v.Set("issuer", issuer)
	v.Set("algorithm", "SHA1")
	v.Set("digits", fmt.Sprintf("%d", CodeDigits))
	v.Set("period", fmt.Sprintf("%d", Period))

	label := url.PathEscape(fmt.Sprintf("%s:%s", issuer, email))
	return fmt.Sprintf("otpauth://totp/%s?%s", label, v.Encode())
}

// ValidateCode checks if the given TOTP code is valid for the secret.
// Accepts codes within ±Window periods for clock skew tolerance.
func ValidateCode(secret, code string) (bool, error) {
	now := time.Now().Unix()
	counter := now / Period

	for i := -int64(Window); i <= int64(Window); i++ {
		expected, err := generateCode(secret, counter+i)
		if err != nil {
			return false, err
		}
		if expected == code {
			return true, nil
		}
	}
	return false, nil
}

// generateCode computes the HOTP code for a given counter (RFC 4226).
func generateCode(secret string, counter int64) (string, error) {
	key, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(strings.ToUpper(secret))
	if err != nil {
		return "", fmt.Errorf("decoding secret: %w", err)
	}

	// Counter to big-endian 8 bytes
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(counter))

	// HMAC-SHA1
	mac := hmac.New(sha1.New, key)
	mac.Write(buf)
	hash := mac.Sum(nil)

	// Dynamic truncation (RFC 4226 section 5.4)
	offset := hash[len(hash)-1] & 0x0f
	truncated := binary.BigEndian.Uint32(hash[offset:offset+4]) & 0x7fffffff

	// Modulo 10^digits
	code := truncated % uint32(math.Pow10(CodeDigits))
	return fmt.Sprintf("%0*d", CodeDigits, code), nil
}

// GenerateBackupCodes creates a set of one-time-use recovery codes.
// Returns the plaintext codes (show once to user) and their bcrypt hashes (store in DB).
func GenerateBackupCodes(count int) ([]string, []string, error) {
	if count == 0 {
		count = BackupCodeCount
	}

	codes := make([]string, count)
	hashes := make([]string, count)

	for i := 0; i < count; i++ {
		raw := make([]byte, BackupCodeLength)
		if _, err := rand.Read(raw); err != nil {
			return nil, nil, fmt.Errorf("generating backup code: %w", err)
		}
		// Hex-encode and take first BackupCodeLength characters, uppercase for readability
		code := strings.ToUpper(hex.EncodeToString(raw)[:BackupCodeLength])
		codes[i] = code

		hash, err := bcrypt.GenerateFromPassword([]byte(code), bcrypt.DefaultCost)
		if err != nil {
			return nil, nil, fmt.Errorf("hashing backup code: %w", err)
		}
		hashes[i] = string(hash)
	}

	return codes, hashes, nil
}

// VerifyBackupCode checks if a code matches any of the stored hashes.
// Returns the index of the matched code, or -1 if no match.
func VerifyBackupCode(code string, hashes []string) int {
	code = strings.ToUpper(strings.TrimSpace(code))
	for i, h := range hashes {
		if bcrypt.CompareHashAndPassword([]byte(h), []byte(code)) == nil {
			return i
		}
	}
	return -1
}

// GeneratePendingToken creates a random token for the TOTP verification step.
func GeneratePendingToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

// HashToken returns the SHA-256 hash of a token (for DB storage).
func HashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

// GenerateDeviceToken creates a random token for trusted device cookies.
func GenerateDeviceToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
