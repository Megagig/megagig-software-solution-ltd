import { Clock } from "lucide-react";
import type { Blog } from "@repo/shared/types";
import { formatPostDate, readingTimeMinutes } from "@/lib/blogs";

// "17 September 2026 · 5 min read" — shared by the cards and the post header.
export function PostMeta({ blog, className }: { blog: Blog; className?: string }) {
  const date = formatPostDate(blog.published_at);
  return (
    <p className={className ?? "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-foreground-muted"}>
      {date && <time dateTime={blog.published_at ?? undefined}>{date}</time>}
      {date && <span aria-hidden="true">·</span>}
      <span className="inline-flex items-center gap-1">
        <Clock className="h-4 w-4" aria-hidden="true" />
        {readingTimeMinutes(blog.content ?? "")} min read
      </span>
    </p>
  );
}
