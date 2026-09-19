import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Blog } from "@repo/shared/types";
import {
  collectTags,
  formatPostDate,
  getBylineName,
  getExcerpt,
  getRelatedBlogs,
  readingTimeMinutes,
  stripHtml,
} from "@/lib/blogs";
import { sanitizeBlogHtml } from "@/lib/sanitize";
import { BlogCard } from "@/app/(marketing)/blog/_components/blog-card";
import { BlogCover } from "@/app/(marketing)/blog/_components/blog-cover";
import { FeaturedPost } from "@/app/(marketing)/blog/_components/featured-post";
import { Pagination } from "@/app/(marketing)/blog/_components/pagination";
import { ShareLinks } from "@/app/(marketing)/blog/_components/share-links";
import { TagFilter } from "@/app/(marketing)/blog/_components/tag-filter";
import { AuthorBox } from "@/app/(marketing)/blog/_components/author-box";

const post = (n: number, extra: Partial<Blog> = {}): Blog => ({
  id: `post-${n}`,
  title: `Post ${n}`,
  slug: `post-${n}`,
  content: "<p>Hello world</p>",
  image: null,
  excerpt: `Excerpt ${n}`,
  author_id: null,
  tags: ["Alpha"],
  seo_title: null,
  seo_description: null,
  published: true,
  published_at: "2026-09-17T10:00:00Z",
  created_at: "",
  updated_at: "",
  ...extra,
});

describe("sanitizeBlogHtml", () => {
  it("keeps ordinary rich-text markup", () => {
    const out = sanitizeBlogHtml("<h2>Title</h2><p>Some <strong>bold</strong> and <em>italic</em></p><ul><li>One</li></ul>");
    expect(out).toContain("<h2>Title</h2>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<li>One</li>");
  });

  it("strips scripts, event handlers and javascript: links", () => {
    const out = sanitizeBlogHtml(
      '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a><img src="x" onerror="alert(1)">'
    );
    expect(out).not.toMatch(/<script/i);
    expect(out).not.toMatch(/onclick|onerror/i);
    expect(out).not.toMatch(/javascript:/i);
  });

  it("blocks data: image URIs and iframes", () => {
    const out = sanitizeBlogHtml('<img src="data:text/html;base64,AAAA"><iframe src="https://evil.example"></iframe>');
    expect(out).not.toMatch(/data:/i);
    expect(out).not.toMatch(/<iframe/i);
  });

  it("demotes h1 (the page already has one) to h2", () => {
    const out = sanitizeBlogHtml("<h1>Big</h1>");
    expect(out).toContain("<h2>Big</h2>");
    expect(out).not.toContain("<h1");
  });

  it("opens external links safely in a new tab but leaves internal links alone", () => {
    const external = sanitizeBlogHtml('<a href="https://example.com">e</a>');
    expect(external).toContain('target="_blank"');
    expect(external).toContain('rel="noopener noreferrer"');

    const internal = sanitizeBlogHtml('<a href="/services/ai-automation" target="_blank">i</a>');
    expect(internal).toContain('href="/services/ai-automation"');
    expect(internal).not.toContain("target=");
  });
});

describe("blog helpers", () => {
  it("strips HTML and estimates reading time (min 1 minute)", () => {
    expect(stripHtml("<h2>A</h2><p>b &amp; c</p>")).toBe("A b & c");
    expect(readingTimeMinutes("<p>short</p>")).toBe(1);
    expect(readingTimeMinutes(`<p>${"word ".repeat(450)}</p>`)).toBe(3);
  });

  it("uses the excerpt, or a trimmed start of the body when there is none", () => {
    expect(getExcerpt(post(1))).toBe("Excerpt 1");
    const long = post(1, { excerpt: null, content: `<p>${"a".repeat(300)}</p>` });
    expect(getExcerpt(long, 50).length).toBeLessThanOrEqual(51);
    expect(getExcerpt(long, 50).endsWith("…")).toBe(true);
  });

  it("credits the author, or the company when there is none", () => {
    expect(getBylineName(post(1))).toBe("Megagig Software Solution");
    expect(getBylineName(post(1, { author: { name: "Ada Obi" } as Blog["author"] }))).toBe("Ada Obi");
  });

  it("formats dates in UTC so server and client agree", () => {
    expect(formatPostDate("2026-09-17T23:30:00Z")).toBe("17 September 2026");
    expect(formatPostDate(null)).toBe("");
  });

  it("collects tags with counts, most-used first", () => {
    const tags = collectTags([post(1, { tags: ["A", "B"] }), post(2, { tags: ["B"] }), post(3, { tags: ["C"] })]);
    expect(tags[0]).toEqual({ tag: "B", count: 2 });
    expect(tags.map((t) => t.tag)).toEqual(["B", "A", "C"]);
  });

  it("ranks related posts by shared tags, excludes the current one, and fills with others", () => {
    const current = post(1, { tags: ["A", "B"] });
    const all = [
      current,
      post(2, { tags: ["Z"] }),
      post(3, { tags: ["A", "B"] }),
      post(4, { tags: ["A"] }),
    ];
    const related = getRelatedBlogs(current, all, 3);
    expect(related.map((b) => b.id)).toEqual(["post-3", "post-4", "post-2"]);
    expect(related.find((b) => b.id === "post-1")).toBeUndefined();
  });
});

describe("blog components", () => {
  it("BlogCard links the title to the post and shows tags, excerpt and meta", () => {
    render(<BlogCard blog={post(1, { tags: ["A", "B", "C"] })} />);
    expect(screen.getByRole("link", { name: "Post 1" })).toHaveAttribute("href", "/blog/post-1");
    expect(screen.getByText("Excerpt 1")).toBeInTheDocument();
    // "A" appears as a tag badge and on the cover fallback tile.
    expect(screen.getAllByText("A").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByText("C")).not.toBeInTheDocument(); // only the first two tags
    expect(screen.getByText(/min read/)).toBeInTheDocument();
  });

  it("BlogCover falls back to a designed tile with the first tag when there is no image", () => {
    render(<BlogCover blog={post(1, { tags: ["AI Automation"] })} />);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("AI Automation")).toBeInTheDocument();
  });

  it("BlogCover renders the uploaded image with descriptive alt text when set", () => {
    render(<BlogCover blog={post(1, { image: "/cover.png" })} />);
    expect(screen.getByAltText("Cover image for Post 1")).toBeInTheDocument();
  });

  it("FeaturedPost marks the latest post and links to it", () => {
    render(<FeaturedPost blog={post(1)} />);
    expect(screen.getByText("Latest")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Post 1" })).toBeInTheDocument();
    expect(screen.getByText("Megagig Software Solution")).toBeInTheDocument();
  });

  it("TagFilter renders All + each tag as links, marks the active one, and hides with no tags", () => {
    const { unmount } = render(<TagFilter tags={[{ tag: "A", count: 2 }]} active="A" total={3} />);
    expect(screen.getByRole("link", { name: /All/ })).toHaveAttribute("href", "/blog");
    const active = screen.getByRole("link", { name: /^A\s*2$/ });
    expect(active).toHaveAttribute("href", "/blog?tag=A");
    expect(active).toHaveAttribute("aria-current", "page");
    unmount();
    expect(render(<TagFilter tags={[]} total={0} />).container).toBeEmptyDOMElement();
  });

  it("Pagination hides with one page, keeps the tag in links, and disables the ends", () => {
    expect(render(<Pagination page={1} totalPages={1} />).container).toBeEmptyDOMElement();

    render(<Pagination page={2} totalPages={3} tag="A" />);
    expect(screen.getByRole("link", { name: "Page 3" })).toHaveAttribute("href", "/blog?tag=A&page=3");
    expect(screen.getByRole("link", { name: "Page 1" })).toHaveAttribute("href", "/blog?tag=A");
    expect(screen.getByRole("link", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
  });

  it("Pagination disables Previous on the first page", () => {
    render(<Pagination page={1} totalPages={2} />);
    expect(screen.getByText("Previous").closest("span")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/blog?page=2");
  });

  it("ShareLinks builds encoded WhatsApp, X and LinkedIn URLs and a copy button", () => {
    render(<ShareLinks url="https://site.ng/blog/a b" title="Hello & world" />);
    expect(screen.getByRole("link", { name: "Share on WhatsApp" }).getAttribute("href")).toContain(
      "wa.me/?text=Hello%20%26%20world%20https%3A%2F%2Fsite.ng%2Fblog%2Fa%20b"
    );
    expect(screen.getByRole("link", { name: "Share on X" }).getAttribute("href")).toContain("twitter.com/intent/tweet");
    expect(screen.getByRole("link", { name: "Share on LinkedIn" }).getAttribute("href")).toContain("linkedin.com/sharing");
    expect(screen.getByRole("button", { name: "Copy link to this post" })).toBeInTheDocument();
  });

  it("AuthorBox renders only when an author is assigned", () => {
    expect(render(<AuthorBox author={undefined} />).container).toBeEmptyDOMElement();
    render(<AuthorBox author={{ name: "Ada Obi", role: "Engineer", photo_url: "" } as Blog["author"]} />);
    expect(screen.getByText("Ada Obi")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Meet the team" })).toHaveAttribute("href", "/team");
  });
});
