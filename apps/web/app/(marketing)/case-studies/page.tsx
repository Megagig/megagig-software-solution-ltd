import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-heading";
import { CaseStudyCard } from "@/components/case-study-card";
import { getPublishedCaseStudies } from "@/lib/case-studies";

export const metadata: Metadata = {
  title: "Case Studies",
  description: "Real, shipped work from Megagig Software Solution — the problem, what we built, and the result.",
};

// Flat, exhaustive grid — no filter chips in v1 (project-requirements.md
// §7 defers filtering explicitly). First card spans 2 columns on desktop,
// same featured-slot treatment as Home's SelectedWork.
export default async function CaseStudiesIndexPage() {
  const caseStudies = await getPublishedCaseStudies();

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="Portfolio" title="Case studies" align="center" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {caseStudies.map((cs, i) => (
            <div key={cs.id} className={i === 0 ? "lg:col-span-2" : undefined}>
              <CaseStudyCard caseStudy={cs} index={i} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
