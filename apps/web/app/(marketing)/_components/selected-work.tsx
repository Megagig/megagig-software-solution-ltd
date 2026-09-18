import type { CaseStudy } from "@repo/shared/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { CaseStudyCard } from "./case-study-card";

interface SelectedWorkProps {
  caseStudies: CaseStudy[];
}

// Exhaustive grid (not capped) per project-requirements.md §5.1, anchor
// target for the hero's "See our work" CTA.
export function SelectedWork({ caseStudies }: SelectedWorkProps) {
  if (caseStudies.length === 0) return null;

  return (
    <section id="selected-work" className="scroll-mt-20 bg-surface">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="Portfolio" title="Selected work" align="center" className="mx-auto mb-10" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
