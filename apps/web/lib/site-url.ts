/**
 * Public origin of the marketing site, used for canonical/Open Graph URLs
 * and share links. Set NEXT_PUBLIC_SITE_URL in production (e.g.
 * https://megagigsoftwaresolution.com.ng); the localhost fallback only
 * suits local development.
 */
export function getSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}
