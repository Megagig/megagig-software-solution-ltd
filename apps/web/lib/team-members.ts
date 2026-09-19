import type { TeamMember } from "@repo/shared/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

/**
 * Server-side fetch of published team members in curated order (sort_order
 * asc) — /team. See lib/case-studies.ts for the pattern this follows.
 *
 * Returns [] on failure so a team outage shows the page's empty state
 * instead of taking down the page (code-standards.md §5).
 */
export async function getPublishedTeamMembers(): Promise<TeamMember[]> {
  try {
    const params = new URLSearchParams({ page_size: "100" });
    const res = await fetch(`${API_URL}/api/v1/public/team-members?${params}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data as TeamMember[]) ?? [];
  } catch {
    return [];
  }
}
