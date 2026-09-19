import type { AboutItem } from "@repo/shared/types";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { AboutSection, type SectionTone } from "./about-section";

// Admin-managed values (AboutItem kind="value"). Plain cards, no icons —
// an icon per value would need a hard-coded name-to-icon lookup, which
// defeats the point of making these editable.
export function ValuesGrid({ values, tone }: { values: AboutItem[]; tone: SectionTone }) {
  if (values.length === 0) return null;

  return (
    <AboutSection tone={tone}>
      <SectionHeading eyebrow="What we stand for" title="Our values" align="center" />
      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {values.map((value) => (
          <Card key={value.id} className="p-6">
            <span aria-hidden="true" className="block h-1 w-10 rounded-full bg-brand" />
            <h3 className="mt-4 text-lg font-semibold text-foreground">{value.title}</h3>
            {value.description && <p className="mt-2 text-foreground-muted">{value.description}</p>}
          </Card>
        ))}
      </div>
    </AboutSection>
  );
}
