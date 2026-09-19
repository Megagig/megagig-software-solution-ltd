import Link from "next/link";
import type { Blog } from "@repo/shared/types";
import { Badge } from "@/components/ui/badge";
import { getExcerpt } from "@/lib/blogs";
import { BlogCover } from "./blog-cover";
import { PostMeta } from "./post-meta";

// One post in the index grid and the "related posts" row. The whole card is
// the click target via a stretched link on the title (the cover is
// decorative, so keyboard/screen-reader users get a single link per post).
export function BlogCard({ blog }: { blog: Blog }) {
  const tags = blog.tags?.slice(0, 2) ?? [];

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface-raised shadow-sm transition-all duration-standard ease-standard hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg focus-within:border-brand/40">
      <div className="overflow-hidden">
        <BlogCover blog={blog} className="transition-transform duration-slow ease-standard group-hover:scale-105" />
      </div>

      <div className="flex flex-1 flex-col p-5">
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="brand">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <h3 className="mt-3 text-lg font-semibold leading-snug text-foreground">
          <Link
            href={`/blog/${blog.slug}`}
            className="after:absolute after:inset-0 after:content-[''] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand group-hover:text-brand"
          >
            {blog.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-foreground-muted">{getExcerpt(blog)}</p>

        <PostMeta
          blog={blog}
          className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-5 text-sm text-foreground-muted"
        />
      </div>
    </article>
  );
}
