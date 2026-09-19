import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  DEFAULT_BYLINE,
  getBylineName,
  getExcerpt,
  getPublishedBlogBySlug,
  getPublishedBlogs,
  getRelatedBlogs,
} from "@/lib/blogs";
import { sanitizeBlogHtml } from "@/lib/sanitize";
import { getSiteSettings } from "@/lib/site-settings";
import { getSiteUrl } from "@/lib/site-url";
import { QuoteCtaBand } from "../../_components/quote-cta-band";
import { AuthorBox } from "../_components/author-box";
import { BlogCard } from "../_components/blog-card";
import { PostMeta } from "../_components/post-meta";
import { ShareLinks } from "../_components/share-links";

export async function generateStaticParams() {
  const blogs = await getPublishedBlogs();
  return blogs.map((blog) => ({ slug: blog.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const blog = await getPublishedBlogBySlug(slug);
  if (!blog) return {};

  // seo_title / seo_description fall back to the title / excerpt, per
  // build-plan.md Phase 7.
  const title = blog.seo_title?.trim() || blog.title;
  const description = blog.seo_description?.trim() || getExcerpt(blog, 160);
  const url = `${getSiteUrl()}/blog/${blog.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      publishedTime: blog.published_at ?? undefined,
      modifiedTime: blog.updated_at,
      authors: [getBylineName(blog)],
      tags: blog.tags,
      ...(blog.image ? { images: [{ url: blog.image }] } : {}),
    },
    twitter: { card: blog.image ? "summary_large_image" : "summary", title, description },
  };
}

// project-requirements.md §5.9 — post detail. Server-rendered; the body is
// admin-authored rich-text HTML, sanitized (lib/sanitize.ts) before it is
// rendered. Byline falls back to the company when no author is assigned.
export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [blog, all, settings] = await Promise.all([
    getPublishedBlogBySlug(slug),
    getPublishedBlogs(),
    getSiteSettings(),
  ]);
  if (!blog) notFound();

  const url = `${getSiteUrl()}/blog/${blog.slug}`;
  const related = getRelatedBlogs(blog, all);
  const byline = getBylineName(blog);
  const html = sanitizeBlogHtml(blog.content);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    description: blog.seo_description?.trim() || getExcerpt(blog, 160),
    datePublished: blog.published_at ?? undefined,
    dateModified: blog.updated_at,
    mainEntityOfPage: url,
    author: { "@type": blog.author ? "Person" : "Organization", name: byline },
    publisher: { "@type": "Organization", name: DEFAULT_BYLINE },
    ...(blog.image ? { image: blog.image } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        // Our own serialized data; "<" is escaped so it can never close the tag.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-(--space-container-x) pb-10 pt-(--space-section-y-mobile) md:pb-12 md:pt-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground-muted hover:text-brand"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> All posts
          </Link>

          {blog.tags?.length > 0 && (
            <div className="mt-6 flex flex-wrap gap-2">
              {blog.tags.map((tag) => (
                <Link key={tag} href={`/blog?tag=${encodeURIComponent(tag)}`}>
                  <Badge variant="brand">{tag}</Badge>
                </Link>
              ))}
            </div>
          )}

          <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-5xl">
            {blog.title}
          </h1>

          <div className="mt-6 flex items-center gap-3">
            {blog.author?.photo_url ? (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-brand/10">
                <Image src={blog.author.photo_url} alt="" fill unoptimized className="object-cover object-top" sizes="44px" />
              </div>
            ) : (
              <span
                aria-hidden="true"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand/10 text-sm font-bold text-brand"
              >
                {byline.charAt(0)}
              </span>
            )}
            <div>
              <p className="font-semibold text-foreground">{byline}</p>
              <PostMeta blog={blog} />
            </div>
          </div>
        </div>

        {blog.image && (
          <div className="mx-auto max-w-5xl px-(--space-container-x) pb-10">
            <div className="relative aspect-[16/9] overflow-hidden rounded-2xl border border-border bg-surface">
              <Image
                src={blog.image}
                alt={`Cover image for ${blog.title}`}
                fill
                unoptimized
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 1024px"
              />
            </div>
          </div>
        )}
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-3xl px-(--space-container-x) pb-(--space-section-y-mobile) md:pb-16">
          <article className="prose-blog" dangerouslySetInnerHTML={{ __html: html }} />

          <div className="mt-12 space-y-6 border-t border-border pt-8">
            <ShareLinks url={url} title={blog.title} />
            <AuthorBox author={blog.author} />
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="bg-surface">
          <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
            <h2 className="text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Keep reading
            </h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((post) => (
                <BlogCard key={post.id} blog={post} />
              ))}
            </div>
          </div>
        </section>
      )}

      <QuoteCtaBand
        whatsAppNumber={settings?.whatsapp_number}
        contactEmail={settings?.contact_email}
        contactPhone={settings?.contact_phone}
      />
    </>
  );
}
