import type { JobOpening } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Server-side fetch of open roles, newest first — /careers. The API only
 * returns is_open roles (closing a role hides it). See lib/case-studies.ts
 * for the pattern this follows.
 *
 * Returns [] on failure so a careers outage shows the page's designed
 * empty state instead of taking down the page (code-standards.md §5).
 */
export async function getOpenJobOpenings(): Promise<JobOpening[]> {
  try {
    const params = new URLSearchParams({ page_size: "100" });
    const res = await fetch(`${API_URL}/api/v1/public/job-openings?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as JobOpening[]) ?? [];
  } catch {
    return [];
  }
}

/**
 * "Send your CV" link — a mailto to the Site Settings contact email (no
 * upload: file attachments are out of scope for v1, project-requirements.md
 * §7). Falls back to the contact page when no email is configured, so the
 * button is never dead.
 */
export function getCvHref(contactEmail?: string | null): string {
  if (!contactEmail) return "/contact-us";
  return `mailto:${contactEmail}?subject=${encodeURIComponent("CV / Application")}`;
}

/**
 * Where a role's Apply button goes: the role's own apply_url when set (an
 * external form or a mailto), otherwise the general CV email with the role
 * title in the subject, otherwise the contact page.
 */
export function getApplyHref(role: Pick<JobOpening, "title" | "apply_url">, contactEmail?: string | null): string {
  const own = role.apply_url?.trim();
  if (own) return own;
  if (contactEmail) {
    return `mailto:${contactEmail}?subject=${encodeURIComponent(`Application: ${role.title}`)}`;
  }
  return "/contact-us";
}
