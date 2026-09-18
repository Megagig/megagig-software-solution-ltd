import type { FAQ } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Server-side fetch of published FAQs, curated order first (sort_order
 * asc). See lib/case-studies.ts for the pattern this follows.
 */
export async function getPublishedFAQs(limit?: number): Promise<FAQ[]> {
  try {
    const params = new URLSearchParams({ page_size: String(limit ?? 50) });
    const res = await fetch(`${API_URL}/api/v1/public/faqs?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as FAQ[]) ?? [];
  } catch {
    return [];
  }
}
