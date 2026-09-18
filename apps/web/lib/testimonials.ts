import type { Testimonial } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Server-side fetch of published testimonials, curated order first
 * (sort_order asc). See lib/case-studies.ts for the pattern this follows.
 */
export async function getPublishedTestimonials(limit?: number): Promise<Testimonial[]> {
  try {
    const params = new URLSearchParams({ page_size: String(limit ?? 100) });
    const res = await fetch(`${API_URL}/api/v1/public/testimonials?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as Testimonial[]) ?? [];
  } catch {
    return [];
  }
}
