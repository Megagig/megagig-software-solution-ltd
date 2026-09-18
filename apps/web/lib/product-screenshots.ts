// Demo CaseStudy/Product records have no real Upload-backed hero image yet
// (Phase 5 populates those). Until then, fall back to the real screenshots
// already sitting in apps/web/public/, keyed by slug, rather than a letter
// placeholder — real imagery is the whole point of "evidence over
// decoration" (ui-rules.md §1).
const SCREENSHOTS_BY_SLUG: Record<string, string> = {
  pharmacycopilot: "/pharmacyCopilotPC.PNG",
  businesscopilot: "/BusinessCopilot.PNG",
  "acpn-ota-zone": "/acpnota.PNG",
  "ccrn-oau-alumni": "/ccrnoau.PNG",
  "megapro-erp": "/MegaPro%20ERP.PNG",
  yazzyos: "/YazzyosAccount.PNG",
  societyledger: "/SocietyLedger.PNG",
  medsafe: "/medsafe.PNG",
  kaneopromovers: "/Kaneopromovers.PNG",
};

export function getScreenshotForSlug(slug: string): string | null {
  return SCREENSHOTS_BY_SLUG[slug] ?? null;
}
