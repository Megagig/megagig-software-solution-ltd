package files

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
)

// FileRef is the canonical JSON shape stored in a resource's file
// column. The frontend uploads to /api/uploads and gets back this
// exact shape, which it then submits to the parent resource's create
// or update endpoint.
//
// Why we embed the metadata (and don't just store a URL): rendering a
// file preview needs the MIME (so we know it's a video vs an image),
// deleting needs the S3 key, and image-list pages need width / height
// to render a placeholder of the right size and avoid layout shift.
// Storing this once at upload time is one DB write; recomputing it on
// every page render would be N database joins.
type FileRef struct {
	URL          string `json:"url"`
	Key          string `json:"key"`
	Name         string `json:"name"`
	MIME         string `json:"mime"`
	Size         int64  `json:"size"`
	Width        *int   `json:"width,omitempty"`
	Height       *int   `json:"height,omitempty"`
	Duration     *int   `json:"duration,omitempty"` // video / audio (seconds)
	ThumbnailURL string `json:"thumbnail_url,omitempty"`
}

// Value implements driver.Valuer so GORM stores FileRef as JSON.
//
// Why string instead of []byte: lib/pq encodes a []byte driver.Value
// as bytea (Postgres binary type). Inserting bytea into a json column
// fails with SQLSTATE 22P02 ("invalid input syntax for type json")
// because Postgres tries to interpret the binary blob as a JSON
// document and the framing is wrong. Returning a string sends a
// plain text value that Postgres parses as JSON cleanly. SQLite and
// MySQL are tolerant either way; only Postgres is strict here.
func (f FileRef) Value() (driver.Value, error) {
	b, err := json.Marshal(f)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

// Scan implements sql.Scanner so GORM hydrates FileRef from JSON.
func (f *FileRef) Scan(value interface{}) error {
	if value == nil {
		*f = FileRef{}
		return nil
	}
	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return fmt.Errorf("files.FileRef.Scan: unsupported type %T", value)
	}
	return json.Unmarshal(data, f)
}

// FileRefs is a slice of FileRef with database round-trip support. The
// custom Value / Scan means generated models can declare a field as
// `files.FileRefs` directly — no GORM serializer tag needed.
type FileRefs []FileRef

// Value implements driver.Valuer for the slice variant.
// Same string-vs-[]byte reasoning as FileRef.Value above.
func (fs FileRefs) Value() (driver.Value, error) {
	if len(fs) == 0 {
		// Store the empty array, not NULL — keeps the JSON shape
		// stable on the frontend (it always sees [], never null).
		return "[]", nil
	}
	b, err := json.Marshal(fs)
	if err != nil {
		return nil, err
	}
	return string(b), nil
}

// Scan implements sql.Scanner for the slice variant.
func (fs *FileRefs) Scan(value interface{}) error {
	if value == nil {
		*fs = FileRefs{}
		return nil
	}
	var data []byte
	switch v := value.(type) {
	case []byte:
		data = v
	case string:
		data = []byte(v)
	default:
		return fmt.Errorf("files.FileRefs.Scan: unsupported type %T", value)
	}
	if len(data) == 0 {
		*fs = FileRefs{}
		return nil
	}
	return json.Unmarshal(data, fs)
}

// Keys returns the S3 keys of every FileRef in the slice. Used by the
// orphan cleanup cron and by replacement-delete logic to figure out
// which storage objects to purge.
func (fs FileRefs) Keys() []string {
	out := make([]string, 0, len(fs))
	for _, f := range fs {
		if f.Key != "" {
			out = append(out, f.Key)
		}
	}
	return out
}

// TotalSize sums the byte size of every FileRef in the slice. Used by
// the storage admin page to compute per-resource storage usage.
func (fs FileRefs) TotalSize() int64 {
	var total int64
	for _, f := range fs {
		total += f.Size
	}
	return total
}
