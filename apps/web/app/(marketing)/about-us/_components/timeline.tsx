import type { AboutItem } from "@repo/shared/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { AboutSection, type SectionTone } from "./about-section";

// Admin-managed timeline (AboutItem kind="milestone"). Order is the admin's
// sort_order, not parsed from the label — the label is free text like
// "2023" or "Since then", so the admin fully controls the sequence.
export function Timeline({ milestones, tone }: { milestones: AboutItem[]; tone: SectionTone }) {
  if (milestones.length === 0) return null;

  return (
    <AboutSection tone={tone}>
      <SectionHeading eyebrow="Our journey" title="Milestones" align="center" />
      <ol className="mx-auto mt-10 max-w-2xl border-l border-border">
        {milestones.map((milestone) => (
          <li key={milestone.id} className="relative pb-10 pl-8 last:pb-0">
            <span
              aria-hidden="true"
              className="absolute left-0 top-1.5 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-brand bg-background"
            />
            {milestone.label && (
              <p className="text-xs font-semibold uppercase tracking-wide text-brand">{milestone.label}</p>
            )}
            <h3 className="mt-1 text-lg font-semibold text-foreground">{milestone.title}</h3>
            {milestone.description && <p className="mt-2 text-foreground-muted">{milestone.description}</p>}
          </li>
        ))}
      </ol>
    </AboutSection>
  );
}
