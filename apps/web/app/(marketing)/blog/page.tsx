import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { BLOG_PAGE_SIZE, collectTags, getPublishedBlogs } from "@/lib/blogs";
import { BlogCard } from "./_components/blog-card";
import { FeaturedPost } from "./_components/featured-post";
import { Pagination } from "./_components/pagination";
import { TagFilter } from "./_components/tag-filter";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Practical guidance from the team building software for Nigerian businesses — AI automation, accounting software, custom software and mobile apps.",
};

interface BlogIndexProps {
  searchParams: Promise<{ tag?: string; page?: string }>;
}

// project-requirements.md §5.9 — Blog index. Server-rendered from the
// admin-managed Blog resource (published posts only; ISR revalidate 60).
// Filtering (`?tag=`) and paging (`?page=`) are plain links, so it works
// without client JavaScript and every view has its own crawlable URL. On the
// first unfiltered page the newest post is featured above the grid.
export default async function BlogPage({ searchParams }: BlogIndexProps) {
  const { tag: tagParam, page: pageParam } = await searchParams;
  const all = await getPublishedBlogs();
  const tags = collectTags(all);

  const tag = tagParam?.trim() || undefined;
  const filtered = tag ? all.filter((blog) => blog.tags?.includes(tag)) : all;

  const requestedPage = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  // Featured card only on page 1 of the unfiltered list; the grid then holds
  // the remaining posts.
  const featured = !tag && requestedPage === 1 ? filtered[0] : undefined;
  const listed = !tag ? filtered.slice(1) : filtered;
  const totalPages = Math.max(1, Math.ceil(listed.length / BLOG_PAGE_SIZE));
  const page = Math.min(requestedPage, totalPages);
  const pagePosts = listed.slice((page - 1) * BLOG_PAGE_SIZE, page * BLOG_PAGE_SIZE);

  return (
    <>
      <section className="relative overflow-hidden bg-background">
        <HeroBackdrop />
        <div className="relative mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand">Blog</p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Insights for businesses building with software
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-foreground-muted">
            Practical guidance from the team building software for Nigerian businesses.
          </p>
          <div className="mt-10">
            <TagFilter tags={tags} active={tag} total={all.length} />
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          {all.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-border bg-surface-raised px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
                <BookOpen className="h-7 w-7" aria-hidden="true" />
              </span>
              <h2 className="mt-5 text-xl font-semibold text-foreground">Articles are on the way</h2>
              <p className="mt-2 max-w-[48ch] text-foreground-muted">
                We&apos;re preparing our first posts. In the meantime, see what we build.
              </p>
              <Link href="/services" className="mt-6">
                <Button>Explore our services</Button>
              </Link>
            </div>
          ) : filtered.length === 0 ? (
            <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
              <h2 className="text-xl font-semibold text-foreground">No posts tagged &ldquo;{tag}&rdquo; yet</h2>
              <p className="mt-2 text-foreground-muted">Try another topic, or browse everything we&apos;ve published.</p>
              <Link href="/blog" className="mt-6">
                <Button variant="secondary">View all posts</Button>
              </Link>
            </div>
          ) : (
            <>
              {featured && <FeaturedPost blog={featured} />}

              {pagePosts.length > 0 && (
                <div className={`grid gap-6 sm:grid-cols-2 lg:grid-cols-3 ${featured ? "mt-10" : ""}`}>
                  {pagePosts.map((blog) => (
                    <BlogCard key={blog.id} blog={blog} />
                  ))}
                </div>
              )}

              <Pagination page={page} totalPages={totalPages} tag={tag} />
            </>
          )}
        </div>
      </section>
    </>
  );
}
