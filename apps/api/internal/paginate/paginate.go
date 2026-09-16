// Package paginate provides a generic list/sort/search/paginate helper
// used by every resource's List endpoint. The goal: one source of truth
// for page clamping, sort whitelisting, and search construction so that
// new resources don't drift on the boilerplate. Works with any GORM model.
//
// Usage (handler side):
//
//	func (h *ShopHandler) List(c *gin.Context) {
//	    res, err := paginate.List[models.Shop](
//	        h.DB.Model(&models.Shop{}).Preload("Building"),
//	        paginate.Bind(c),
//	        paginate.Config{
//	            Searchable:   []string{"shop_number", "description"},
//	            Sortable:     map[string]bool{"created_at": true, "monthly_rent": true},
//	            DefaultSort:  "created_at",
//	            DefaultOrder: "desc",
//	        },
//	    )
//	    if err != nil {
//	        c.JSON(http.StatusInternalServerError, gin.H{"error": gin.H{"code": "INTERNAL_ERROR", "message": err.Error()}})
//	        return
//	    }
//	    c.JSON(http.StatusOK, res)
//	}
package paginate

import (
	"encoding/base64"
	"fmt"
	"math"
	"reflect"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Defaults applied when the request query is empty or out of range.
const (
	DefaultPage       = 1
	DefaultPageSize   = 20
	MaxPageSize       = 100
	DefaultSortColumn = "created_at"
	DefaultSortOrder  = "desc"
)

// Params is the normalized query state for a List request.
// Produced by Bind(c). Filters is free-form extra WHERE col = val clauses.
// Cursor (when present) drives cursor-mode pagination — see Config.CursorMode.
type Params struct {
	Page      int
	PageSize  int
	Search    string
	SortBy    string
	SortOrder string
	Cursor    string // opaque base64 from a previous Result.Meta.NextCursor
	Filters   map[string]any

	// v3.31.34 — date filter. DateField is the column (default
	// "created_at"); DateFrom/DateTo are inclusive bounds. When both
	// are zero values, no date filter is applied. Set via the
	// ?created_from=/?created_to= query params (or the legacy
	// ?created_since=Nd shortcut used by the stat cards).
	DateField string
	DateFrom  time.Time
	DateTo    time.Time
}

// With returns a copy of Params with an additional filter applied.
// Empty string values are ignored so handlers can pipe c.Query() directly.
//
//	paginate.Bind(c).With("building_id", c.Query("building_id"))
func (p Params) With(key string, value any) Params {
	if s, ok := value.(string); ok && s == "" {
		return p
	}
	if value == nil {
		return p
	}
	if p.Filters == nil {
		p.Filters = map[string]any{key: value}
		return p
	}
	// Copy the map so we don't mutate the caller's Params.
	copied := make(map[string]any, len(p.Filters)+1)
	for k, v := range p.Filters {
		copied[k] = v
	}
	copied[key] = value
	p.Filters = copied
	return p
}

// Config describes which columns the caller has declared searchable / sortable
// for a particular resource. Anything not in Sortable falls back to DefaultSort.
type Config struct {
	Searchable   []string        // columns included in ILIKE search
	Sortable     map[string]bool // whitelist for sort_by values
	DefaultSort  string          // fallback sort column (defaults to "created_at")
	DefaultOrder string          // fallback sort order (defaults to "desc")

	// CursorMode opts into cursor-based pagination (default is offset/page).
	// When true, the response carries Meta.NextCursor + Meta.HasMore instead
	// of Page/Pages/Total. Cursor is opaque base64 of (sort_value, id) so
	// pages stay stable when rows insert mid-pagination.
	CursorMode bool

	// IncludeTotal asks cursor mode to also run COUNT(*). Slow on big
	// tables — leave off unless your UI shows a "X of Y" indicator.
	IncludeTotal bool
}

// Meta is the pagination envelope, matching Grit's existing response shape.
// Cursor mode populates NextCursor + HasMore; offset mode populates
// Page + Pages. Total is shared (always set in offset mode; opt-in in
// cursor mode via Config.IncludeTotal).
type Meta struct {
	Total      int64  `json:"total,omitempty"`
	Page       int    `json:"page,omitempty"`
	PageSize   int    `json:"page_size"`
	Pages      int    `json:"pages,omitempty"`
	NextCursor string `json:"next_cursor,omitempty"`
	HasMore    bool   `json:"has_more,omitempty"`
}

// Result wraps the paginated data in the canonical { data, meta } envelope.
type Result[T any] struct {
	Data []T  `json:"data"`
	Meta Meta `json:"meta"`
}

// Bind reads page / page_size / search / sort_by / sort_order from the Gin
// context, clamps them, and returns a normalized Params.
//
// v3.31.34 — also parses the date-filter query params:
//
//	?created_from=2026-01-01&created_to=2026-12-31
//	?created_since=7d   (legacy shortcut: last 7 days)
//	?date_field=published_at   (override the default "created_at" column)
//
// Both _from and _to are inclusive. Dates without time components are
// snapped to the start (00:00) for _from and end (23:59:59) for _to.
func Bind(c *gin.Context) Params {
	page, _ := strconv.Atoi(c.DefaultQuery("page", strconv.Itoa(DefaultPage)))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", strconv.Itoa(DefaultPageSize)))

	if page < 1 {
		page = DefaultPage
	}
	if pageSize < 1 || pageSize > MaxPageSize {
		pageSize = DefaultPageSize
	}

	dateField := c.Query("date_field")
	if dateField == "" {
		dateField = "created_at"
	}
	dateFrom, dateTo := parseDateRange(c)

	return Params{
		Page:      page,
		PageSize:  pageSize,
		Search:    c.Query("search"),
		SortBy:    c.Query("sort_by"),
		SortOrder: c.Query("sort_order"),
		Cursor:    c.Query("cursor"),
		DateField: dateField,
		DateFrom:  dateFrom,
		DateTo:    dateTo,
	}
}

// parseDateRange reads the three supported date-window query params and
// returns the resolved (from, to) bounds. Zero values mean "no bound".
//
// Precedence: explicit created_from/created_to wins over created_since.
// This lets a UI date picker override a stat card's "last 7 days" link
// without surprising clobber.
func parseDateRange(c *gin.Context) (time.Time, time.Time) {
	var from, to time.Time
	if since := c.Query("created_since"); since != "" {
		if d, ok := parseRelativeDuration(since); ok {
			from = time.Now().Add(-d)
		}
	}
	if s := c.Query("created_from"); s != "" {
		if t, err := parseDateInput(s, false); err == nil {
			from = t
		}
	}
	if s := c.Query("created_to"); s != "" {
		if t, err := parseDateInput(s, true); err == nil {
			to = t
		}
	}
	return from, to
}

// parseRelativeDuration parses "7d", "30d", "12h", "1w" into a
// time.Duration. Used by the stat-card shortcut ?created_since=7d so
// hand-written URLs stay short. Returns ok=false on unrecognised input
// (caller falls back to no bound rather than failing the request).
func parseRelativeDuration(s string) (time.Duration, bool) {
	if len(s) < 2 {
		return 0, false
	}
	unit := s[len(s)-1]
	nStr := s[:len(s)-1]
	n, err := strconv.Atoi(nStr)
	if err != nil || n < 0 {
		return 0, false
	}
	switch unit {
	case 'h':
		return time.Duration(n) * time.Hour, true
	case 'd':
		return time.Duration(n) * 24 * time.Hour, true
	case 'w':
		return time.Duration(n) * 7 * 24 * time.Hour, true
	case 'm':
		// month = 30 days. Good enough for stats; calendar-accurate
		// month math isn't worth the dep.
		return time.Duration(n) * 30 * 24 * time.Hour, true
	}
	return 0, false
}

// parseDateInput parses an ISO date or datetime string. If endOfDay is
// true and the input is a bare date, it snaps to 23:59:59.999 so the
// _to bound is inclusive of the whole day the user picked.
func parseDateInput(s string, endOfDay bool) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339, s); err == nil {
		return t, nil
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		if endOfDay {
			return t.Add(24*time.Hour - time.Nanosecond), nil
		}
		return t, nil
	}
	return time.Time{}, fmt.Errorf("invalid date %q", s)
}

// isSafeDateColumn reports whether the client-supplied date_field column is
// safe to interpolate into a WHERE fragment. Only bare identifiers that are
// either a known timestamp column or an explicitly-declared sortable column
// are allowed; everything else is rejected so the caller falls back to
// "created_at". This is the guard behind the date-filter injection fix.
func isSafeDateColumn(col string, cfg Config) bool {
	if col == "" {
		return false
	}
	// Reject anything that isn't a plain snake_case identifier up front —
	// no spaces, parens, quotes, or SQL operators can survive this.
	for _, r := range col {
		if !(r >= 'a' && r <= 'z' || r >= 'A' && r <= 'Z' || r >= '0' && r <= '9' || r == '_') {
			return false
		}
	}
	if col == "created_at" || col == "updated_at" {
		return true
	}
	return cfg.Sortable[col]
}

// List runs the query with search / sort / filters / pagination applied and
// returns a typed Result[T]. The caller is expected to have already set the
// model and any relevant Preload() chains on the passed-in *gorm.DB.
//
// Invariants enforced:
//   - page >= 1, 1 <= page_size <= MaxPageSize
//   - sort_by must be in cfg.Sortable, else cfg.DefaultSort (or DefaultSortColumn)
//   - sort_order must be "asc" or "desc", else cfg.DefaultOrder (or DefaultSortOrder)
//   - search is applied as ILIKE across cfg.Searchable columns (nothing if empty)
func List[T any](query *gorm.DB, p Params, cfg Config) (Result[T], error) {
	// Normalize sort_by against the whitelist.
	sortBy := p.SortBy
	if sortBy == "" || !cfg.Sortable[sortBy] {
		sortBy = cfg.DefaultSort
		if sortBy == "" {
			sortBy = DefaultSortColumn
		}
	}

	// Normalize sort_order.
	sortOrder := p.SortOrder
	if sortOrder != "asc" && sortOrder != "desc" {
		sortOrder = cfg.DefaultOrder
		if sortOrder == "" {
			sortOrder = DefaultSortOrder
		}
	}

	// Apply equality filters (e.g. ?status=active&building_id=...).
	for col, val := range p.Filters {
		query = query.Where(col+" = ?", val)
	}

	// v3.31.34 — date-window filter. DateField defaults to "created_at"
	// in Bind() so we only need to apply when at least one bound is set.
	//
	// SECURITY (v3.31.84): DateField arrives straight from the ?date_field=
	// query param, so it MUST be whitelisted before it touches a WHERE
	// fragment — GORM treats the condition string as raw SQL. We allow the
	// two always-present timestamp columns plus anything the resource
	// already declared sortable (a strict, developer-controlled set), and
	// fall back to "created_at" on anything else. This closes the
	// date_field SQL-injection vector reachable by any authenticated user.
	dateField := p.DateField
	if !isSafeDateColumn(dateField, cfg) {
		dateField = "created_at"
	}
	if !p.DateFrom.IsZero() {
		query = query.Where(dateField+" >= ?", p.DateFrom)
	}
	if !p.DateTo.IsZero() {
		query = query.Where(dateField+" <= ?", p.DateTo)
	}

	// Apply search across configured columns.
	if p.Search != "" && len(cfg.Searchable) > 0 {
		clause, args := buildSearchClause(cfg.Searchable, p.Search)
		query = query.Where(clause, args...)
	}

	if cfg.CursorMode {
		return listCursor[T](query, p, cfg, sortBy, sortOrder)
	}

	var result Result[T]

	// Count first (before Order/Offset/Limit so Count reflects the whole match).
	if err := query.Count(&result.Meta.Total).Error; err != nil {
		return result, err
	}

	// Then fetch the page.
	offset := (p.Page - 1) * p.PageSize
	if err := query.
		Order(sortBy + " " + sortOrder).
		Offset(offset).
		Limit(p.PageSize).
		Find(&result.Data).Error; err != nil {
		return result, err
	}

	result.Meta.Page = p.Page
	result.Meta.PageSize = p.PageSize
	result.Meta.Pages = 0
	if result.Meta.Total > 0 && p.PageSize > 0 {
		result.Meta.Pages = int(math.Ceil(float64(result.Meta.Total) / float64(p.PageSize)))
	}

	return result, nil
}

// listCursor implements cursor-based pagination. The cursor is an
// opaque base64 of (sort_value, id) so pages stay stable when rows
// insert mid-pagination. We fetch PageSize+1 rows to detect HasMore
// without a separate count query.
func listCursor[T any](query *gorm.DB, p Params, cfg Config, sortBy, sortOrder string) (Result[T], error) {
	var result Result[T]

	if cfg.IncludeTotal {
		countQuery := query.Session(&gorm.Session{})
		if err := countQuery.Count(&result.Meta.Total).Error; err != nil {
			return result, err
		}
	}

	if p.Cursor != "" {
		sortVal, lastID, err := decodeCursor(p.Cursor)
		if err == nil {
			op := "<"
			if sortOrder == "asc" {
				op = ">"
			}
			// Postgres tuple comparison: (sort_col, id) < (val, id).
			// Works on SQLite too. The id tiebreaker keeps the cursor
			// stable when sort_value collides on multiple rows.
			query = query.Where(fmt.Sprintf("(%s, id) %s (?, ?)", sortBy, op), sortVal, lastID)
		}
	}

	limit := p.PageSize + 1
	if err := query.
		Order(sortBy + " " + sortOrder).
		Order("id " + sortOrder).
		Limit(limit).
		Find(&result.Data).Error; err != nil {
		return result, err
	}

	if len(result.Data) > p.PageSize {
		result.Data = result.Data[:p.PageSize]
		result.Meta.HasMore = true
	}

	if len(result.Data) > 0 {
		last := result.Data[len(result.Data)-1]
		sortVal, id := extractCursor(last, sortBy)
		if id != "" {
			result.Meta.NextCursor = encodeCursor(sortVal, id)
		}
	}

	result.Meta.PageSize = p.PageSize
	return result, nil
}

// EncodeCursor / DecodeCursor are exported for handlers that build
// custom cursors (e.g. nested resource links).
func EncodeCursor(sortValue, id string) string      { return encodeCursor(sortValue, id) }
func DecodeCursor(s string) (string, string, error) { return decodeCursor(s) }

func encodeCursor(sortVal, id string) string {
	return base64.URLEncoding.EncodeToString([]byte(sortVal + "|" + id))
}

func decodeCursor(s string) (string, string, error) {
	b, err := base64.URLEncoding.DecodeString(s)
	if err != nil {
		return "", "", fmt.Errorf("invalid cursor: %w", err)
	}
	parts := strings.SplitN(string(b), "|", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("invalid cursor format")
	}
	return parts[0], parts[1], nil
}

// extractCursor reflects on the last row to pull out the sort field
// + ID. The sort field is stored as snake_case (matching the column),
// so we convert to PascalCase for the Go struct field lookup.
func extractCursor(item interface{}, sortBy string) (string, string) {
	rv := reflect.ValueOf(item)
	if rv.Kind() == reflect.Ptr {
		rv = rv.Elem()
	}
	if rv.Kind() != reflect.Struct {
		return "", ""
	}

	idVal := rv.FieldByName("ID")
	if !idVal.IsValid() || idVal.Kind() != reflect.String {
		return "", ""
	}
	id := idVal.String()

	goFieldName := snakeToPascal(sortBy)
	sortField := rv.FieldByName(goFieldName)
	if !sortField.IsValid() {
		return "", id
	}

	if t, ok := sortField.Interface().(time.Time); ok {
		return t.Format(time.RFC3339Nano), id
	}
	return fmt.Sprintf("%v", sortField.Interface()), id
}

// snakeToPascal turns "created_at" into "CreatedAt".
func snakeToPascal(s string) string {
	parts := strings.Split(s, "_")
	for i, p := range parts {
		if p == "" {
			continue
		}
		parts[i] = strings.ToUpper(p[:1]) + p[1:]
	}
	return strings.Join(parts, "")
}

// buildSearchClause builds "col1 ILIKE ? OR col2 ILIKE ? OR ..." with the
// same wildcard-wrapped search term repeated as each arg.
func buildSearchClause(cols []string, term string) (string, []any) {
	clause := ""
	args := make([]any, 0, len(cols))
	wild := "%" + term + "%"
	for i, col := range cols {
		if i > 0 {
			clause += " OR "
		}
		clause += col + " ILIKE ?"
		args = append(args, wild)
	}
	return clause, args
}
