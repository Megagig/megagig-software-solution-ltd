import type { Stat } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Server-side fetch of published stats in curated order (sort_order asc) —
 * the single admin-managed source for every trust-number strip on the site
 * (Home's Our Story + Closing CTA, /pricing, /about-us). See
 * lib/case-studies.ts for the pattern this follows.
 *
 * Returns [] on failure so a stats outage hides the strip instead of
 * taking down the page (code-standards.md §5).
 */
export async function getPublishedStats(): Promise<Stat[]> {
  try {
    const params = new URLSearchParams({ page_size: "20" });
    const res = await fetch(`${API_URL}/api/v1/public/stats?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as Stat[]) ?? [];
  } catch {
    return [];
  }
}
