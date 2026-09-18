import { StatCallout } from "@/components/ui/stat-callout";

// Static, real facts confirmed directly by the founder — founding year
// 2023, mission line and stats as given. Not DB-backed (code-standards.md
// §6): a rebrand or new milestone means editing this file, not the admin.
export function OurStory() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">Our story</p>
        <h2 className="mx-auto mt-3 max-w-[65ch] text-2xl font-medium leading-snug text-foreground md:text-3xl">
          We build production software that Nigerian businesses actually trust and use — engineered for
          how they run, not adapted from how someone else's market runs.
        </h2>
        <div className="mx-auto mt-10 grid max-w-md grid-cols-2 gap-8">
          <StatCallout value="3+" label="Years in business" />
          <StatCallout value="10+" label="Products shipped in-house" />
        </div>
      </div>
    </section>
  );
}
