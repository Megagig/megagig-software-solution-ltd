package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"megagig-software-solution/apps/api/internal/models"
)

// newBlogTestEnv builds a router over an in-memory SQLite database with
// foreign keys ENFORCED (SQLite ignores them by default) — several of the
// behaviours below exist precisely because of the fk_blogs_author constraint.
func newBlogTestEnv(t *testing.T) (*gin.Engine, *gorm.DB) {
	t.Helper()
	gin.SetMode(gin.TestMode)

	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{Logger: logger.Default.LogMode(logger.Silent)})
	require.NoError(t, err)
	sqlDB, err := db.DB()
	require.NoError(t, err)
	sqlDB.SetMaxOpenConns(1) // one connection so the in-memory DB and the PRAGMA are shared
	require.NoError(t, db.Exec("PRAGMA foreign_keys = ON").Error)
	require.NoError(t, db.AutoMigrate(&models.TeamMember{}, &models.Blog{}))

	h := NewBlogHandler(db)
	r := gin.New()
	r.POST("/admin/blogs", h.Create)
	r.PUT("/admin/blogs/:id", h.Update)
	return r, db
}

func doBlogRequest(t *testing.T, r *gin.Engine, method, path string, body any) (int, map[string]any) {
	t.Helper()
	var buf bytes.Buffer
	if body != nil {
		require.NoError(t, json.NewEncoder(&buf).Encode(body))
	}
	req := httptest.NewRequest(method, path, &buf)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)

	var out map[string]any
	_ = json.Unmarshal(w.Body.Bytes(), &out)
	return w.Code, out
}

func errorCode(out map[string]any) string {
	if e, ok := out["error"].(map[string]any); ok {
		s, _ := e["code"].(string)
		return s
	}
	return ""
}

func dataOf(out map[string]any) map[string]any {
	d, _ := out["data"].(map[string]any)
	return d
}

func createBlog(t *testing.T, r *gin.Engine, title string) string {
	t.Helper()
	code, out := doBlogRequest(t, r, http.MethodPost, "/admin/blogs", map[string]any{"title": title, "content": "<p>x</p>"})
	require.Equal(t, http.StatusCreated, code, "create failed: %v", out)
	return dataOf(out)["id"].(string)
}

func TestBlogCreateWithoutAuthorStoresNull(t *testing.T) {
	r, db := newBlogTestEnv(t)
	// Regression: "" for author_id violates the author foreign key.
	id := createBlog(t, r, "No Author Post")

	var blog models.Blog
	require.NoError(t, db.First(&blog, "id = ?", id).Error)
	assert.Equal(t, "", blog.AuthorID)
	var isNull int64
	db.Raw("SELECT count(*) FROM blogs WHERE id = ? AND author_id IS NULL", id).Scan(&isNull)
	assert.Equal(t, int64(1), isNull, "author_id must be NULL, not an empty string")
}

func TestBlogUpdateSlug(t *testing.T) {
	r, _ := newBlogTestEnv(t)
	id := createBlog(t, r, "First Post")
	other := createBlog(t, r, "Second Post")

	// Messy input is normalized to a clean slug.
	code, out := doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"slug": "  My Custom SLUG! "})
	require.Equal(t, http.StatusOK, code, "%v", out)
	assert.Equal(t, "my-custom-slug", dataOf(out)["slug"])

	// Re-saving the post's own slug is not a conflict.
	code, _ = doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"slug": "my-custom-slug"})
	assert.Equal(t, http.StatusOK, code)

	// Another post's slug is refused.
	code, out = doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+other, map[string]any{"slug": "my-custom-slug"})
	assert.Equal(t, http.StatusConflict, code)
	assert.Equal(t, "SLUG_TAKEN", errorCode(out))

	// A slug with nothing usable in it is refused.
	code, out = doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"slug": "!!!"})
	assert.Equal(t, http.StatusUnprocessableEntity, code)
	assert.Equal(t, "VALIDATION_ERROR", errorCode(out))
}

func TestBlogUpdateSlugCannotReuseADeletedPostsSlug(t *testing.T) {
	r, db := newBlogTestEnv(t)
	id := createBlog(t, r, "Live Post")
	gone := createBlog(t, r, "Deleted Post")
	code, _ := doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+gone, map[string]any{"slug": "old-url"})
	require.Equal(t, http.StatusOK, code)
	require.NoError(t, db.Delete(&models.Blog{}, "id = ?", gone).Error) // soft delete

	// The unique index still covers soft-deleted rows, so this must be a clean
	// 409, not a 500 from the database.
	code, out := doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"slug": "old-url"})
	assert.Equal(t, http.StatusConflict, code, "%v", out)
}

func TestBlogUpdateCanClearFieldsButNotTitle(t *testing.T) {
	r, _ := newBlogTestEnv(t)
	id := createBlog(t, r, "Clearing Post")

	code, out := doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{
		"excerpt": "An excerpt", "image": "http://x/y.png", "seo_title": "SEO", "seo_description": "Desc",
		"tags": []string{"A", "B"},
	})
	require.Equal(t, http.StatusOK, code, "%v", out)
	d := dataOf(out)
	assert.Equal(t, "An excerpt", d["excerpt"])
	assert.Equal(t, []any{"A", "B"}, d["tags"])

	// Sending blanks clears them (previously a blank was silently ignored).
	code, out = doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{
		"excerpt": "", "image": "", "seo_title": "", "seo_description": "", "tags": []string{},
	})
	require.Equal(t, http.StatusOK, code, "%v", out)
	d = dataOf(out)
	assert.Equal(t, "", d["excerpt"])
	assert.Equal(t, "", d["image"])
	assert.Equal(t, "", d["seo_title"])
	assert.Equal(t, "", d["seo_description"])
	assert.Empty(t, d["tags"])

	// The title may change but never be blank.
	code, out = doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"title": "   "})
	assert.Equal(t, http.StatusUnprocessableEntity, code)
	assert.Equal(t, "VALIDATION_ERROR", errorCode(out))
}

func TestBlogUpdateAuthor(t *testing.T) {
	r, db := newBlogTestEnv(t)
	member := models.TeamMember{Name: "Ada Obi", Role: "Engineer", Published: true}
	require.NoError(t, db.Create(&member).Error)
	id := createBlog(t, r, "Authored Post")

	code, out := doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"author_id": member.ID})
	require.Equal(t, http.StatusOK, code, "%v", out)
	assert.Equal(t, member.ID, dataOf(out)["author_id"])

	// An author that doesn't exist is a clean 422, not a foreign-key 500.
	code, out = doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"author_id": "does-not-exist"})
	assert.Equal(t, http.StatusUnprocessableEntity, code)
	assert.Equal(t, "VALIDATION_ERROR", errorCode(out))

	// Clearing the author stores NULL (an empty string would violate the FK).
	code, out = doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"author_id": ""})
	require.Equal(t, http.StatusOK, code, "%v", out)
	var isNull int64
	db.Raw("SELECT count(*) FROM blogs WHERE id = ? AND author_id IS NULL", id).Scan(&isNull)
	assert.Equal(t, int64(1), isNull)
}

func TestBlogUpdatePublishOnlyStillWorks(t *testing.T) {
	r, _ := newBlogTestEnv(t)
	id := createBlog(t, r, "Publish Me")

	// The header Publish button sends only { published } — other fields must be untouched.
	code, out := doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"published": true})
	require.Equal(t, http.StatusOK, code, "%v", out)
	d := dataOf(out)
	assert.Equal(t, true, d["published"])
	assert.NotNil(t, d["published_at"])
	assert.Equal(t, "Publish Me", d["title"])

	code, out = doBlogRequest(t, r, http.MethodPut, "/admin/blogs/"+id, map[string]any{"published": false})
	require.Equal(t, http.StatusOK, code)
	assert.Nil(t, dataOf(out)["published_at"])
}
