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

// All real screenshots for a product, for the /product/[slug] detail
// page's gallery — richer evidence than the single-shot card everywhere
// else. Only two products currently have more than one real shot; every
// other slug just falls back to its single entry above (or none).
const GALLERY_BY_SLUG: Record<string, string[]> = {
  pharmacycopilot: ["/pharmacyCopilotPC.PNG", "/pharmacyCopilotPOS.PNG"],
  businesscopilot: ["/BusinessCopilot.PNG", "/BusinessCopilotContact.PNG"],
};

export function getScreenshotsForSlug(slug: string): string[] {
  if (GALLERY_BY_SLUG[slug]) return GALLERY_BY_SLUG[slug];
  const single = getScreenshotForSlug(slug);
  return single ? [single] : [];
}

// Real mobile-app screenshots, separate from the desktop/web gallery above
// — portrait aspect, shown in a phone-style frame rather than the
// browser-chrome frame the desktop shots use. Only set for products that
// actually have a mobile app (matches their Platforms field).
const MOBILE_SCREENSHOTS_BY_SLUG: Record<string, string[]> = {
  pharmacycopilot: ["/PharmacyCopilot-mobile-p.png", "/PharmacyCopilot-mobilec.png"],
  businesscopilot: ["/BusinessCopilot_mobile-light.png", "/BusinessCopilot_mobile-dark.png"],
};

export function getMobileScreenshotsForSlug(slug: string): string[] {
  return MOBILE_SCREENSHOTS_BY_SLUG[slug] ?? [];
}
