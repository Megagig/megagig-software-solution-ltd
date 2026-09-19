package handlers

import "testing"

func TestNormalizeBlogSlug(t *testing.T) {
	cases := []struct {
		in   string
		want string
	}{
		{"my-post-title", "my-post-title"},
		{"  My Post: Title!  ", "my-post-title"},
		{"AI Automation for Nigerian Businesses", "ai-automation-for-nigerian-businesses"},
		{"multiple---hyphens___here", "multiple-hyphens-here"},
		{"-leading-and-trailing-", "leading-and-trailing"},
		{"numbers 2026 ok", "numbers-2026-ok"},
		{"", ""},
		{"   ", ""},
		{"!!!", ""},
		{"../../etc/passwd", "etc-passwd"},
	}
	for _, tc := range cases {
		if got := normalizeBlogSlug(tc.in); got != tc.want {
			t.Errorf("normalizeBlogSlug(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}
