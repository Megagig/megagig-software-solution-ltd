package backup

import (
	"archive/zip"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"strings"

	"gorm.io/gorm"
)

// SplitStatements splits our generated dump.sql into executable statements.
//
// This is NOT a general SQL parser — it doesn't need to be. We generate the file
// ourselves and only ever emit numbers, NULL/TRUE/FALSE, and single-quoted
// literals with ” escaping. Tracking quote state is therefore exact. Splitting
// naively on ";" would corrupt any value containing a semicolon.
func SplitStatements(script string) []string {
	var out []string
	var cur strings.Builder
	inString := false

	rs := []rune(script)
	for i := 0; i < len(rs); i++ {
		c := rs[i]
		if inString {
			cur.WriteRune(c)
			if c == '\'' {
				// '' is an escaped quote, not the end of the literal.
				if i+1 < len(rs) && rs[i+1] == '\'' {
					cur.WriteRune('\'')
					i++
					continue
				}
				inString = false
			}
			continue
		}
		switch c {
		case '\'':
			inString = true
			cur.WriteRune(c)
		case ';':
			if s := strings.TrimSpace(cur.String()); s != "" {
				out = append(out, s)
			}
			cur.Reset()
		default:
			cur.WriteRune(c)
		}
	}
	if s := strings.TrimSpace(cur.String()); s != "" {
		out = append(out, s)
	}
	return out
}

// stripComments removes SQL "--" comments, but ONLY when they're real comments
// and not part of a quoted string value. The naive line-based version dropped
// any line beginning with "--", which corrupted multi-line string values whose
// continuation line happened to start with "--" (e.g. a note field). This walks
// the script tracking string state (with ” escape handling), so text inside a
// literal is never touched.
func stripComments(script string) string {
	var b strings.Builder
	inString := false
	for i := 0; i < len(script); i++ {
		c := script[i]
		if inString {
			b.WriteByte(c)
			if c == '\'' {
				// A doubled '' is an escaped quote — stays inside the string.
				if i+1 < len(script) && script[i+1] == '\'' {
					b.WriteByte(script[i+1])
					i++
					continue
				}
				inString = false
			}
			continue
		}
		if c == '\'' {
			inString = true
			b.WriteByte(c)
			continue
		}
		// Outside a string, "--" begins a comment that runs to end of line.
		if c == '-' && i+1 < len(script) && script[i+1] == '-' {
			for i < len(script) && script[i] != '\n' {
				i++
			}
			if i < len(script) {
				b.WriteByte('\n')
			}
			continue
		}
		b.WriteByte(c)
	}
	return b.String()
}

// Restore replays a backup archive into the connected database inside a single
// transaction: either every row lands or nothing does.
//
// The archive carries DATA, not schema — run migrations on the target database
// first (cmd/restore does this for you).
func Restore(db *gorm.DB, zipPath string) (Manifest, error) {
	var man Manifest

	zr, err := zip.OpenReader(zipPath)
	if err != nil {
		return man, fmt.Errorf("opening %s: %w", zipPath, err)
	}
	defer zr.Close()

	var dump string
	for _, f := range zr.File {
		switch f.Name {
		case "dump.sql", "metadata.json":
			rc, err := f.Open()
			if err != nil {
				return man, err
			}
			data, err := io.ReadAll(rc)
			rc.Close()
			if err != nil {
				return man, err
			}
			if f.Name == "dump.sql" {
				dump = string(data)
			} else {
				_ = json.Unmarshal(data, &man)
			}
		}
	}
	if dump == "" {
		return man, errors.New("dump.sql not found in archive")
	}

	stmts := SplitStatements(stripComments(dump))
	return man, db.Transaction(func(tx *gorm.DB) error {
		// Clear every table the dump repopulates BEFORE replaying it. Migrations
		// run first (cmd/restore) and seed baseline rows — the default roles —
		// and the dump carries its own authoritative copy of those same rows.
		// Without this, replaying the dump's ADMIN/EDITOR/USER inserts collides
		// with the freshly seeded ones on the unique role-name index and the
		// whole restore aborts: the backup becomes unrestorable. Truncating first
		// makes the restored database match the backup exactly, and makes restore
		// idempotent onto a non-empty schema. Table names come from the manifest,
		// derived from models.Models() — never user input — so this is not an
		// injection surface. RESTART IDENTITY resets sequences; CASCADE handles
		// foreign keys regardless of order.
		if len(man.Tables) > 0 {
			quoted := make([]string, len(man.Tables))
			for i, t := range man.Tables {
				quoted[i] = "\"" + t + "\""
			}
			if err := tx.Exec("TRUNCATE " + strings.Join(quoted, ", ") + " RESTART IDENTITY CASCADE").Error; err != nil {
				return fmt.Errorf("clearing tables before restore: %w", err)
			}
		}

		for _, s := range stmts {
			switch strings.ToUpper(strings.TrimSpace(s)) {
			case "BEGIN", "COMMIT":
				continue // we own the transaction
			}
			if err := tx.Exec(s).Error; err != nil {
				head := s
				if len(head) > 120 {
					head = head[:120] + "..."
				}
				return fmt.Errorf("executing %q: %w", head, err)
			}
		}
		return nil
	})
}
