import Link from "next/link";
import { cn } from "@/lib/utils";

interface TagFilterProps {
  tags: { tag: string; count: number }[];
  /** Currently selected tag, or undefined for "All". */
  active?: string;
  total: number;
}

// Tag chips as plain links (`?tag=`), so filtering works without client
// JavaScript, is shareable, and is crawlable. Renders nothing when there is
// nothing to filter by.
export function TagFilter({ tags, active, total }: TagFilterProps) {
  if (tags.length === 0) return null;

  const chip = (selected: boolean) =>
    cn(
      "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
      selected
        ? "border-brand bg-brand text-brand-foreground"
        : "border-border bg-surface-raised text-foreground-muted hover:border-brand/40 hover:text-brand"
    );

  return (
    <nav aria-label="Filter posts by topic" className="flex flex-wrap justify-center gap-2">
      <Link href="/blog" className={chip(!active)} aria-current={!active ? "page" : undefined}>
        All <span className="text-xs opacity-80">{total}</span>
      </Link>
      {tags.map(({ tag, count }) => (
        <Link
          key={tag}
          href={`/blog?tag=${encodeURIComponent(tag)}`}
          className={chip(active === tag)}
          aria-current={active === tag ? "page" : undefined}
        >
          {tag} <span className="text-xs opacity-80">{count}</span>
        </Link>
      ))}
    </nav>
  );
}
