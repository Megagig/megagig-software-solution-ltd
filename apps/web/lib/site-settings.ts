import type { SiteSettings } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Server-side fetch of the public SiteSettings singleton (contact info,
 * WhatsApp number, hero copy). Uses plain fetch rather than the client-only
 * axios instance in lib/api.ts — this runs in the (marketing) layout as a
 * Server Component, not the browser.
 *
 * `next: { revalidate: 60 }` opts this into Next's ISR cache explicitly —
 * Next does NOT read the origin's own Cache-Control header to decide
 * caching, so without this the (marketing) layout gets statically frozen
 * at build time and admin edits (WhatsApp number, contact info) would
 * never show up without a redeploy, contradicting library-docs.md's
 * revalidate convention and project-requirements.md §6's explicit
 * "no redeploy needed" requirement for SiteSettings.
 *
 * Returns null on failure so a SiteSettings outage never takes down the
 * whole site (code-standards.md §5 — a failed fetch renders an empty
 * state, it doesn't crash the page).
 */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/site-settings`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data as SiteSettings;
  } catch {
    return null;
  }
}
