import type { Product } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Server-side fetch of published products, curated order first
 * (sort_order asc). See lib/case-studies.ts for the pattern this follows.
 */
export async function getPublishedProducts(limit?: number): Promise<Product[]> {
  try {
    const params = new URLSearchParams({ page_size: String(limit ?? 100) });
    const res = await fetch(`${API_URL}/api/v1/public/products?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as Product[]) ?? [];
  } catch {
    return [];
  }
}
