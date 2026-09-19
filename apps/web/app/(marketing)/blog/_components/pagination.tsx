import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  /** Selected tag, kept in every link so paging doesn't drop the filter. */
  tag?: string;
}

function hrefFor(page: number, tag?: string): string {
  const params = new URLSearchParams();
  if (tag) params.set("tag", tag);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/blog?${query}` : "/blog";
}

// Prev / numbered / next as plain links — works without client JavaScript
// and every page has its own crawlable URL. Hidden with a single page.
export function Pagination({ page, totalPages, tag }: PaginationProps) {
  if (totalPages <= 1) return null;

  const base =
    "inline-flex h-10 min-w-10 items-center justify-center gap-1 rounded-md border px-3 text-sm font-medium transition-colors duration-fast ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";
  const idle = "border-border bg-surface-raised text-foreground-muted hover:border-brand/40 hover:text-brand";
  const disabled = "pointer-events-none border-border bg-surface-raised text-foreground-subtle opacity-50";

  return (
    <nav aria-label="Pagination" className="mt-12 flex flex-wrap items-center justify-center gap-2">
      {page > 1 ? (
        <Link href={hrefFor(page - 1, tag)} className={cn(base, idle)} rel="prev">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
        </Link>
      ) : (
        <span className={cn(base, disabled)} aria-disabled="true">
          <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Previous
        </span>
      )}

      {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
        <Link
          key={n}
          href={hrefFor(n, tag)}
          aria-label={`Page ${n}`}
          aria-current={n === page ? "page" : undefined}
          className={cn(base, n === page ? "border-brand bg-brand text-brand-foreground" : idle)}
        >
          {n}
        </Link>
      ))}

      {page < totalPages ? (
        <Link href={hrefFor(page + 1, tag)} className={cn(base, idle)} rel="next">
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      ) : (
        <span className={cn(base, disabled)} aria-disabled="true">
          Next <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </span>
      )}
    </nav>
  );
}
