import type { Blog } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const BLOG_PAGE_SIZE = 9;
export const DEFAULT_BYLINE = "Megagig Software Solution";

/**
 * Server-side fetch of published posts, newest first (the API orders by
 * published_at desc and preloads the author). Returns [] on failure so a
 * blog outage shows the designed empty state instead of taking the page
 * down (code-standards.md §5). See lib/case-studies.ts for the pattern.
 */
export async function getPublishedBlogs(): Promise<Blog[]> {
  try {
    const params = new URLSearchParams({ page_size: "100" });
    const res = await fetch(`${API_URL}/api/v1/blogs?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as Blog[]) ?? [];
  } catch {
    return [];
  }
}

/** A single published post by slug, or null on failure/404. */
export async function getPublishedBlogBySlug(slug: string): Promise<Blog | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/blogs/${encodeURIComponent(slug)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as Blog) ?? null;
  } catch {
    return null;
  }
}

/** Plain text of an HTML string (tags removed, whitespace collapsed). */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Estimated reading time in whole minutes (~200 words per minute, min 1). */
export function readingTimeMinutes(html: string): number {
  const words = stripHtml(html).split(" ").filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** The post's excerpt, or the start of its body when none was written. */
export function getExcerpt(blog: Pick<Blog, "excerpt" | "content">, maxLength = 180): string {
  const excerpt = blog.excerpt?.trim();
  if (excerpt) return excerpt;
  const text = stripHtml(blog.content ?? "");
  return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

/** Who to credit: the assigned author, or the company when there is none. */
export function getBylineName(blog: Pick<Blog, "author">): string {
  return blog.author?.name?.trim() || DEFAULT_BYLINE;
}

/** "17 September 2026" — fixed to UTC so server and client never disagree. */
export function formatPostDate(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Every tag used by the given posts, with post counts, most-used first. */
export function collectTags(blogs: Blog[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const blog of blogs) {
    for (const tag of blog.tags ?? []) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/**
 * Up to `limit` other posts, ranked by how many tags they share with
 * `current` (ties keep newest-first order); posts sharing nothing only fill
 * the remaining slots so the section is never empty when other posts exist.
 */
export function getRelatedBlogs(current: Blog, all: Blog[], limit = 3): Blog[] {
  const tags = new Set(current.tags ?? []);
  const others = all.filter((blog) => blog.id !== current.id);
  const scored = others.map((blog, index) => ({
    blog,
    index,
    shared: (blog.tags ?? []).filter((tag) => tags.has(tag)).length,
  }));
  scored.sort((a, b) => b.shared - a.shared || a.index - b.index);
  return scored.slice(0, limit).map((entry) => entry.blog);
}
