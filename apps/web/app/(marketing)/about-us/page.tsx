import type { ReactNode } from "react";
import type { Metadata } from "next";
import { StatsRow } from "@/components/stats-row";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublishedStats } from "@/lib/stats";
import { getPublishedAboutItems } from "@/lib/about-items";
import { getPublishedProducts } from "@/lib/products";
import { getPublishedCaseStudies } from "@/lib/case-studies";
import { FounderSpotlight, hasFounderContent } from "../_components/founder-spotlight";
import { QuoteCtaBand } from "../_components/quote-cta-band";
import { AboutSection, type SectionTone } from "./_components/about-section";
import { AboutStory } from "./_components/about-story";
import { ValuesGrid } from "./_components/values-grid";
import { Timeline } from "./_components/timeline";
import { ProcessSteps } from "./_components/process-steps";
import { ProofStrip } from "./_components/proof-strip";

export const metadata: Metadata = {
  title: "About us",
  description:
    "The story, mission and founder behind Megagig Software Solution — and how we build software Nigerian businesses actually use.",
};

// project-requirements.md §5.8 — About. Every piece of content is
// admin-managed (SiteSettings About & founder fields, Stat, AboutItem, plus
// the existing Product/CaseStudy resources); none is hard-coded here. Each
// section renders only when it has published content, so the page never
// shows an empty shell — and background tones are assigned by position so
// the surface/background alternation holds whichever sections are showing.
export default async function AboutPage() {
  const [settings, stats, aboutItems, products, caseStudies] = await Promise.all([
    getSiteSettings(),
    getPublishedStats(),
    getPublishedAboutItems(),
    getPublishedProducts(),
    getPublishedCaseStudies(3),
  ]);

  const story = settings?.founding_story ?? "";
  const mission = settings?.mission_statement ?? "";
  const foundedYear = settings?.founded_year;

  // Visible sections in page order. The hero above is bg-background, so the
  // first section here is surface, then they alternate.
  const sections: ((tone: SectionTone) => ReactNode)[] = [];
  if (story.trim()) {
    sections.push((tone) => <AboutStory key="story" story={story} tone={tone} />);
  }
  if (stats.length > 0) {
    sections.push((tone) => (
      <AboutSection key="stats" tone={tone}>
        <StatsRow stats={stats} />
      </AboutSection>
    ));
  }
  if (aboutItems.values.length > 0) {
    sections.push((tone) => <ValuesGrid key="values" values={aboutItems.values} tone={tone} />);
  }
  if (aboutItems.milestones.length > 0) {
    sections.push((tone) => <Timeline key="timeline" milestones={aboutItems.milestones} tone={tone} />);
  }
  if (hasFounderContent(settings)) {
    sections.push((tone) => <FounderSpotlight key="founder" founder={settings} tone={tone} />);
  }
  if (aboutItems.steps.length > 0) {
    sections.push((tone) => <ProcessSteps key="steps" steps={aboutItems.steps} tone={tone} />);
  }
  if (products.length > 0 || caseStudies.length > 0) {
    sections.push((tone) => (
      <ProofStrip key="proof" products={products} caseStudies={caseStudies} tone={tone} />
    ));
  }

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">
              About us{foundedYear ? ` · Since ${foundedYear}` : ""}
            </p>
            <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight text-foreground md:text-4xl">
              {mission || "About Megagig Software Solution"}
            </h1>
          </div>
        </div>
      </section>

      {sections.map((render, index) => render(index % 2 === 0 ? "surface" : "background"))}

      <QuoteCtaBand
        whatsAppNumber={settings?.whatsapp_number}
        contactEmail={settings?.contact_email}
        contactPhone={settings?.contact_phone}
      />
    </>
  );
}
