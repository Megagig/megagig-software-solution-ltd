import type { Metadata } from "next";
import { ValuesGrid } from "@/components/values-grid";
import { getPublishedAboutItems } from "@/lib/about-items";
import { getCvHref, getOpenJobOpenings } from "@/lib/job-openings";
import { getSiteSettings } from "@/lib/site-settings";
import { CareersHero } from "./_components/careers-hero";
import { CvBand } from "./_components/cv-band";
import { RolesSection } from "./_components/roles-section";

export const metadata: Metadata = {
  title: "Careers",
  description: "Open roles at Megagig Software Solution — or send us your CV.",
};

// project-requirements.md §5.8 — Careers. Open roles come from the admin-
// managed JobOpening resource (only is_open roles are returned); the values
// block reuses the About page's admin-managed values. With no open roles the
// page shows a designed empty state and the CV call to action. Background
// tones alternate by position: hero (background) → roles (surface) → values
// (background) → brand CV band.
export default async function CareersPage() {
  const [roles, settings, aboutItems] = await Promise.all([
    getOpenJobOpenings(),
    getSiteSettings(),
    getPublishedAboutItems(),
  ]);
  const contactEmail = settings?.contact_email;

  return (
    <>
      <CareersHero cvHref={getCvHref(contactEmail)} />
      <RolesSection roles={roles} contactEmail={contactEmail} tone="surface" />
      <ValuesGrid values={aboutItems.values} tone="background" />
      <CvBand contactEmail={contactEmail} />
    </>
  );
}
