import type { AboutItem } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface AboutItems {
  values: AboutItem[];
  milestones: AboutItem[];
  steps: AboutItem[];
}

/**
 * Server-side fetch of published About items, split by kind into the three
 * /about-us sections (values, timeline milestones, how-we-work steps). The
 * API already returns them in curated order (sort_order asc), so the split
 * preserves it. See lib/case-studies.ts for the pattern this follows.
 *
 * Returns empty lists on failure so an outage hides those sections instead
 * of taking down the page (code-standards.md §5).
 */
export async function getPublishedAboutItems(): Promise<AboutItems> {
  const empty: AboutItems = { values: [], milestones: [], steps: [] };
  try {
    const params = new URLSearchParams({ page_size: "100" });
    const res = await fetch(`${API_URL}/api/v1/public/about-items?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return empty;
    const json = await res.json();
    const items = (json.data as AboutItem[]) ?? [];
    return {
      values: items.filter((item) => item.kind === "value"),
      milestones: items.filter((item) => item.kind === "milestone"),
      steps: items.filter((item) => item.kind === "step"),
    };
  } catch {
    return empty;
  }
}
