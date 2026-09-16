// Package audit owns the tamper-evident hash chain over the activity log.
//
// Each row's Hash = SHA-256(PrevHash || canonical(row)) where canonical
// is a stable JSON serialization of the audit-relevant fields. Any
// mutation to a row breaks every Hash from that row forward, which
// VerifyChain detects.
//
// Insert is serialized via a row-level FOR UPDATE lock on the latest
// row inside the same transaction that does the INSERT — concurrent
// inserts queue cleanly without forking the chain. Verification walks
// the chain in created_at + id order; ties broken by id.
//
// What this defends against:
//   - Direct SQL UPDATE / DELETE on activity_logs (most common attack
//     vector — DBA covering tracks).
//   - Out-of-band insertion of forged history.
//
// What this does NOT defend against:
//   - Compromise of the running server itself (an attacker with code
//     execution can rewrite the whole chain). External anchoring
//     (publishing the daily root hash to a public ledger) is the
//     follow-up — see #48.
package audit

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"time"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"

	"megagig-software-solution/apps/api/internal/models"
)

// Canonical returns the stable JSON bytes of an entry for hashing.
// We exclude ID / PrevHash / Hash from the canonical form: ID is
// random and uncorrelated with content; PrevHash + Hash are derived
// values, not inputs to the hash.
func Canonical(e *models.ActivityLog) ([]byte, error) {
	c := canonicalEntry{
		UserID:        e.UserID,
		Method:        e.Method,
		Path:          e.Path,
		Status:        e.Status,
		PayloadDigest: e.PayloadDigest,
		IPAddress:     e.IPAddress,
		UserAgent:     e.UserAgent,
		DurationMS:    e.DurationMS,
		// Use unix-nano so the canonical bytes are stable across tz
		// changes / TIMESTAMPTZ formatting differences.
		CreatedAtUnixNano: e.CreatedAt.UTC().UnixNano(),
	}
	return json.Marshal(c)
}

// canonicalEntry's field order is the wire format for hashing —
// reorder ONLY in a major version bump (verify breaks otherwise).
type canonicalEntry struct {
	UserID            string `json:"user_id"`
	Method            string `json:"method"`
	Path              string `json:"path"`
	Status            int    `json:"status"`
	PayloadDigest     string `json:"payload_digest"`
	IPAddress         string `json:"ip_address"`
	UserAgent         string `json:"user_agent"`
	DurationMS        int64  `json:"duration_ms"`
	CreatedAtUnixNano int64  `json:"created_at_unix_nano"`
}

// ComputeHash returns hex(sha256(prevHash || canonical)) — the prev
// hash is included as a hex string (not raw bytes) so the input is
// trivially auditable: cat prev_hash | xxd; cat canonical.json.
func ComputeHash(prevHash string, canonical []byte) string {
	h := sha256.New()
	h.Write([]byte(prevHash))
	h.Write(canonical)
	return hex.EncodeToString(h.Sum(nil))
}

// AppendChained inserts a new ActivityLog with PrevHash + Hash filled
// in. Intended for ad-hoc / one-off audit writes from app code (NOT
// the hot-path middleware — that uses the buffered worker pattern).
//
// Concurrency note: this function takes a row-level FOR UPDATE lock
// on the latest row to serialize concurrent callers. Use sparingly;
// for any high-throughput audit source, route through the middleware's
// channel writer instead.
func AppendChained(db *gorm.DB, entry *models.ActivityLog) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var prev models.ActivityLog
		err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).
			Order("created_at desc, id desc").
			Limit(1).
			First(&prev).Error
		if err != nil && err != gorm.ErrRecordNotFound {
			return err
		}

		canonical, err := Canonical(entry)
		if err != nil {
			return fmt.Errorf("canonicalize: %w", err)
		}
		entry.PrevHash = prev.Hash
		entry.Hash = ComputeHash(prev.Hash, canonical)
		return tx.Create(entry).Error
	})
}

// ChainStatus is the result of VerifyChain.
type ChainStatus struct {
	Valid        bool   `json:"valid"`
	TotalEntries int    `json:"total_entries"`
	BrokenAtID   string `json:"broken_at_id,omitempty"`
	BrokenAt     int    `json:"broken_at,omitempty"` // zero-indexed position
	Expected     string `json:"expected,omitempty"`
	Got          string `json:"got,omitempty"`
	Message      string `json:"message,omitempty"`
}

// VerifyChain walks the entire activity log in (created_at, id) order
// and recomputes every Hash. The first mismatch is reported with the
// position and offending row's ID — everything before that position
// is trustworthy.
//
// Memory-bounded: iterates in batches of verifyBatchSize so a 100M-row
// log doesn't OOM the process. Honours context cancellation so the
// caller can attach a deadline (the admin endpoint should pass
// c.Request.Context() with a 30s timeout).
//
// Cost is O(n) — about a second per million rows on a warm cache.
// Wire to a nightly cron + a /api/admin/activity/integrity endpoint.
const verifyBatchSize = 1000

func VerifyChain(ctx context.Context, db *gorm.DB) (ChainStatus, error) {
	prevHash := ""
	total := 0
	var lastCreatedAt time.Time
	var lastID string

	for {
		select {
		case <-ctx.Done():
			return ChainStatus{TotalEntries: total}, ctx.Err()
		default:
		}

		var batch []models.ActivityLog
		q := db.Order("created_at asc, id asc").Limit(verifyBatchSize)
		if total > 0 {
			// Cursor on (created_at, id) so we don't re-read rows
			// already verified in the previous batch.
			q = q.Where("(created_at, id) > (?, ?)", lastCreatedAt, lastID)
		}
		if err := q.Find(&batch).Error; err != nil {
			return ChainStatus{TotalEntries: total}, err
		}
		if len(batch) == 0 {
			break
		}

		for i := range batch {
			e := &batch[i]
			canonical, err := Canonical(e)
			if err != nil {
				return ChainStatus{TotalEntries: total}, err
			}
			expected := ComputeHash(prevHash, canonical)
			if expected != e.Hash {
				return ChainStatus{
					Valid:        false,
					TotalEntries: total + i,
					BrokenAtID:   e.ID,
					BrokenAt:     total + i,
					Expected:     expected,
					Got:          e.Hash,
					Message:      "hash mismatch — row was modified, deleted, or inserted out of order",
				}, nil
			}
			if e.PrevHash != prevHash {
				return ChainStatus{
					Valid:        false,
					TotalEntries: total + i,
					BrokenAtID:   e.ID,
					BrokenAt:     total + i,
					Expected:     prevHash,
					Got:          e.PrevHash,
					Message:      "prev_hash mismatch — chain link broken",
				}, nil
			}
			prevHash = e.Hash
		}

		last := &batch[len(batch)-1]
		lastCreatedAt = last.CreatedAt
		lastID = last.ID
		total += len(batch)

		if len(batch) < verifyBatchSize {
			break // last page
		}
	}

	return ChainStatus{
		Valid:        true,
		TotalEntries: total,
	}, nil
}
