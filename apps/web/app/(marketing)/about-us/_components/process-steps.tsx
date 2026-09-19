import type { AboutItem } from "@repo/shared/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { AboutSection, type SectionTone } from "./about-section";

// Admin-managed "how we work" steps (AboutItem kind="step"). Numbered
// 01, 02, 03… from their sort position — the same large pale numeral
// treatment as the case-study detail sections.
export function ProcessSteps({ steps, tone }: { steps: AboutItem[]; tone: SectionTone }) {
  if (steps.length === 0) return null;

  return (
    <AboutSection tone={tone}>
      <SectionHeading eyebrow="Our process" title="How we work" align="center" />
      <ol className="mx-auto mt-10 max-w-3xl space-y-10">
        {steps.map((step, index) => (
          <li key={step.id} className="flex gap-5 sm:gap-8">
            <span aria-hidden="true" className="shrink-0 text-5xl font-bold text-brand/15 sm:text-6xl">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="pt-1">
              <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">{step.title}</h3>
              {step.description && (
                <p className="mt-3 text-lg leading-relaxed text-foreground-muted">{step.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </AboutSection>
  );
}
