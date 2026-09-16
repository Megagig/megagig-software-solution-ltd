"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import { usePublicBlog } from "@/hooks/use-blogs";

export default function BlogDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const { data: blog, isLoading, error } = usePublicBlog(slug);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 animate-pulse">
        <div className="h-4 bg-bg-hover rounded w-24 mb-8" />
        <div className="h-8 bg-bg-hover rounded w-3/4 mb-4" />
        <div className="h-4 bg-bg-hover rounded w-1/3 mb-12" />
        <div className="aspect-[2/1] bg-bg-hover rounded-xl mb-12" />
        <div className="space-y-4">
          <div className="h-4 bg-bg-hover rounded w-full" />
          <div className="h-4 bg-bg-hover rounded w-full" />
          <div className="h-4 bg-bg-hover rounded w-5/6" />
          <div className="h-4 bg-bg-hover rounded w-full" />
          <div className="h-4 bg-bg-hover rounded w-4/6" />
        </div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-bg-elevated border border-border">
          <span className="text-2xl text-text-muted">404</span>
        </div>
        <h1 className="text-xl font-semibold text-foreground">Post not found</h1>
        <p className="mt-2 text-sm text-text-muted">
          The blog post you're looking for doesn't exist or has been removed.
        </p>
        <Link
          href="/blog"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-6 py-16">
      {/* Back link */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-foreground transition-colors mb-8"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Blog
      </Link>

      {/* Title and meta */}
      <header className="mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight leading-tight">
          {blog.title}
        </h1>
        <div className="mt-4 flex items-center gap-2 text-sm text-text-muted">
          <Calendar className="h-4 w-4" />
          <time dateTime={blog.published_at || blog.created_at}>
            {new Date(blog.published_at || blog.created_at).toLocaleDateString(
              "en-US",
              {
                month: "long",
                day: "numeric",
                year: "numeric",
              }
            )}
          </time>
        </div>
      </header>

      {/* Cover image */}
      {blog.image && (
        <div className="mb-12 rounded-xl overflow-hidden border border-border">
          <img
            src={blog.image}
            alt={blog.title}
            className="w-full h-auto object-cover"
          />
        </div>
      )}

      {/* Content */}
      <div
        className="prose-blog"
        dangerouslySetInnerHTML={{ __html: blog.content }}
      />

      {/* Bottom nav */}
      <div className="mt-16 pt-8 border-t border-border/50">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-accent hover:text-accent-hover transition-colors font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          All posts
        </Link>
      </div>
    </article>
  );
}
