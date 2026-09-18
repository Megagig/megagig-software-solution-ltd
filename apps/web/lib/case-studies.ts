import type { CaseStudy } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Server-side fetch of published case studies, newest-curated-order first
 * (sort_order asc). Plain fetch, not the client-only axios instance in
 * lib/api.ts — this runs in Server Components for SEO-critical content
 * per library-docs.md.
 *
 * Returns [] on failure so a CaseStudy outage never takes down Home
 * (code-standards.md §5).
 */
export async function getPublishedCaseStudies(limit?: number): Promise<CaseStudy[]> {
  try {
    const params = new URLSearchParams({ page_size: String(limit ?? 100) });
    const res = await fetch(`${API_URL}/api/v1/public/case-studies?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as CaseStudy[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * Server-side fetch of a single published case study by slug —
 * /case-study/[slug]. Returns null on failure/404 so the page can call
 * notFound() itself. Testimonial and HeroImage are preloaded server-side
 * by the API's GetBySlug handler.
 */
export async function getPublishedCaseStudyBySlug(slug: string): Promise<CaseStudy | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/case-studies/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return (json.data as CaseStudy) ?? null;
  } catch {
    return null;
  }
}
