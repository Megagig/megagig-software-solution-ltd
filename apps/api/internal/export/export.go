// Package export streams resource data out as CSV or XLSX. Used by
// auto-generated /<resource>/export endpoints — handlers reuse the
// List service layer to fetch rows, then call CSV(w, items, opts) or
// XLSX(w, items, opts) directly into the response writer.
//
// Column.Field uses Go-side struct field names with dot-notation for
// associations: "Tenant.Name", "Owner.Email", etc. Empty values render
// as empty strings.
//
// Format strings:
//
//	""                — Sprintf %v (default)
//	"date:..."        — time.Time.Format(layout) — layout follows after the colon
//	"datetime"        — RFC3339-friendly date+time
//	"currency:CCC"    — formatted as "CCC 1,234.56"
//	"bool"            — "Yes" / "No"
package export

import (
	"encoding/csv"
	"fmt"
	"io"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

// Column describes one output column.
type Column struct {
	Header string // human-readable column header
	Field  string // Go struct field path, e.g. "Tenant.Name"
	Format string // optional formatter — see package doc
}

// Options controls how items are rendered.
type Options struct {
	Columns []Column
	Sheet   string // XLSX only — defaults to "Sheet1"
}

// CSV writes items as a comma-separated stream into w. Includes the
// header row. For streaming exports (write headers once, then many
// batches) call CSV() for the first batch and CSVRows() for the rest.
func CSV(w io.Writer, items interface{}, opts Options) error {
	cw := csv.NewWriter(w)
	defer cw.Flush()

	headers := make([]string, len(opts.Columns))
	for i, col := range opts.Columns {
		headers[i] = col.Header
	}
	if err := cw.Write(headers); err != nil {
		return err
	}
	return writeCSVRows(cw, items, opts)
}

// CSVRows writes items WITHOUT a header row — used by streaming
// exports for batches after the first one (the header was already
// written by the initial CSV() call).
func CSVRows(w io.Writer, items interface{}, opts Options) error {
	cw := csv.NewWriter(w)
	defer cw.Flush()
	return writeCSVRows(cw, items, opts)
}

func writeCSVRows(cw *csv.Writer, items interface{}, opts Options) error {
	v := reflect.ValueOf(items)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	if v.Kind() != reflect.Slice {
		return fmt.Errorf("export: items must be a slice, got %T", items)
	}

	for i := 0; i < v.Len(); i++ {
		row := make([]string, len(opts.Columns))
		for j, col := range opts.Columns {
			row[j] = formatCell(extractField(v.Index(i), col.Field), col.Format)
		}
		if err := cw.Write(row); err != nil {
			return err
		}
	}
	return nil
}

// XLSX writes items as an Excel workbook into w.
func XLSX(w io.Writer, items interface{}, opts Options) error {
	f := excelize.NewFile()
	defer f.Close()

	sheet := opts.Sheet
	if sheet == "" {
		sheet = "Sheet1"
	}
	if sheet != "Sheet1" {
		// excelize creates "Sheet1" by default; swap to the requested name.
		_ = f.SetSheetName("Sheet1", sheet)
	}

	for i, col := range opts.Columns {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		_ = f.SetCellValue(sheet, cell, col.Header)
	}

	v := reflect.ValueOf(items)
	if v.Kind() == reflect.Ptr {
		v = v.Elem()
	}
	if v.Kind() != reflect.Slice {
		return fmt.Errorf("export: items must be a slice, got %T", items)
	}

	for i := 0; i < v.Len(); i++ {
		for j, col := range opts.Columns {
			cell, _ := excelize.CoordinatesToCellName(j+1, i+2)
			val := formatCell(extractField(v.Index(i), col.Field), col.Format)
			_ = f.SetCellValue(sheet, cell, val)
		}
	}

	return f.Write(w)
}

// extractField walks a dot-path through a struct. Returns the zero
// value if any segment is missing.
func extractField(v reflect.Value, path string) interface{} {
	if path == "" {
		return nil
	}
	for v.Kind() == reflect.Ptr || v.Kind() == reflect.Interface {
		if v.IsNil() {
			return nil
		}
		v = v.Elem()
	}
	parts := strings.Split(path, ".")
	for _, p := range parts {
		if v.Kind() != reflect.Struct {
			return nil
		}
		f := v.FieldByName(p)
		if !f.IsValid() {
			return nil
		}
		v = f
		for v.Kind() == reflect.Ptr || v.Kind() == reflect.Interface {
			if v.IsNil() {
				return nil
			}
			v = v.Elem()
		}
	}
	if !v.IsValid() {
		return nil
	}
	return v.Interface()
}

func formatCell(v interface{}, format string) string {
	if v == nil {
		return ""
	}
	if format == "" {
		return fmt.Sprintf("%v", v)
	}

	// "currency:UGX"
	if strings.HasPrefix(format, "currency:") {
		ccy := strings.TrimPrefix(format, "currency:")
		switch n := v.(type) {
		case float64:
			return ccy + " " + thousands(n)
		case float32:
			return ccy + " " + thousands(float64(n))
		case int:
			return ccy + " " + thousands(float64(n))
		case int64:
			return ccy + " " + thousands(float64(n))
		}
		return fmt.Sprintf("%v", v)
	}

	// "date:2006-01-02"
	if strings.HasPrefix(format, "date:") {
		layout := strings.TrimPrefix(format, "date:")
		if t, ok := v.(time.Time); ok {
			return t.Format(layout)
		}
	}

	if format == "datetime" {
		if t, ok := v.(time.Time); ok {
			return t.Format("2006-01-02 15:04")
		}
	}

	if format == "bool" {
		if b, ok := v.(bool); ok {
			if b {
				return "Yes"
			}
			return "No"
		}
	}

	return fmt.Sprintf("%v", v)
}

// thousands formats a float with thousands separators and 2 decimals.
func thousands(f float64) string {
	s := strconv.FormatFloat(f, 'f', 2, 64)
	parts := strings.SplitN(s, ".", 2)
	intPart := parts[0]
	neg := strings.HasPrefix(intPart, "-")
	if neg {
		intPart = intPart[1:]
	}
	var out []byte
	for i, c := range intPart {
		if i > 0 && (len(intPart)-i)%3 == 0 {
			out = append(out, ',')
		}
		out = append(out, byte(c))
	}
	result := string(out) + "." + parts[1]
	if neg {
		return "-" + result
	}
	return result
}
