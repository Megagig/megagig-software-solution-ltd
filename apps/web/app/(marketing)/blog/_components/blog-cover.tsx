import Image from "next/image";
import { BookOpen } from "lucide-react";
import type { Blog } from "@repo/shared/types";
import { cn } from "@/lib/utils";

// Alternates the fallback wash between brand and accent, stably per post
// (same slug → same tone), so a grid of cover-less posts doesn't read as one
// flat block.
function toneFor(slug: string): "brand" | "accent" {
  let sum = 0;
  for (let i = 0; i < slug.length; i++) sum += slug.charCodeAt(i);
  return sum % 2 === 0 ? "brand" : "accent";
}

// The post's cover image, or — when none has been uploaded — a designed
// fallback tile carrying the post's first tag, so a cover-less post still
// looks intentional. `unoptimized`: an uploaded cover lives on the storage
// origin, which next/image would otherwise need allow-listing for.
export function BlogCover({ blog, className }: { blog: Blog; className?: string }) {
  if (blog.image) {
    return (
      <div className={cn("relative aspect-[16/9] w-full overflow-hidden bg-surface", className)}>
        <Image
          src={blog.image}
          alt={`Cover image for ${blog.title}`}
          fill
          unoptimized
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 400px"
        />
      </div>
    );
  }

  const tone = toneFor(blog.slug);
  const tag = blog.tags?.[0];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative flex aspect-[16/9] w-full flex-col items-center justify-center gap-3 overflow-hidden",
        tone === "brand"
          ? "bg-gradient-to-br from-brand/20 via-brand/10 to-accent/15"
          : "bg-gradient-to-br from-accent/20 via-accent/10 to-brand/15",
        className
      )}
    >
      <span
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full bg-surface-raised shadow-sm",
          tone === "brand" ? "text-brand" : "text-accent"
        )}
      >
        <BookOpen className="h-7 w-7" />
      </span>
      {tag && (
        <span
          className={cn(
            "px-4 text-center text-xs font-semibold uppercase tracking-wide",
            tone === "brand" ? "text-brand" : "text-accent"
          )}
        >
          {tag}
        </span>
      )}
    </div>
  );
}
