import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Blog } from "@repo/shared/types";
import { Badge } from "@/components/ui/badge";
import { getBylineName, getExcerpt } from "@/lib/blogs";
import { BlogCover } from "./blog-cover";
import { PostMeta } from "./post-meta";

// The newest post, shown large above the grid on the first page.
export function FeaturedPost({ blog }: { blog: Blog }) {
  return (
    <article className="group relative grid overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm transition-shadow duration-standard ease-standard hover:shadow-lg md:grid-cols-2">
      <div className="overflow-hidden">
        <BlogCover blog={blog} className="h-full md:aspect-auto md:min-h-[320px]" />
      </div>

      <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">Latest</Badge>
          {blog.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="brand">
              {tag}
            </Badge>
          ))}
        </div>

        <h2 className="mt-4 text-2xl font-bold leading-tight tracking-tight text-foreground md:text-3xl">
          <Link
            href={`/blog/${blog.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand group-hover:text-brand"
          >
            {blog.title}
          </Link>
        </h2>
        <p className="mt-4 text-lg leading-relaxed text-foreground-muted">{getExcerpt(blog, 220)}</p>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-foreground-muted">
          <span className="font-medium text-foreground">{getBylineName(blog)}</span>
          <PostMeta blog={blog} />
        </div>

        <span className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-brand">
          Read article
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </article>
  );
}
