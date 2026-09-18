import Link from "next/link";
import { Globe, Smartphone, Palette, MonitorSmartphone, GraduationCap, Bot, Compass } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Category cards, "Custom quote" per ui-rules.md §5 — no fixed-tier
// pricing table on this site. Static per project-requirements.md §5.5.
const CATEGORIES = [
  { icon: Globe, label: "Web Design & Development" },
  { icon: Smartphone, label: "Mobile App Development" },
  { icon: Palette, label: "UI/UX Design" },
  { icon: MonitorSmartphone, label: "Desktop App Development" },
  { icon: GraduationCap, label: "IT Training" },
  { icon: Bot, label: "AI Automation & Integration", highlighted: true },
  { icon: Compass, label: "Consultation" },
];

export function PricingTeaser() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="Investment" title="Pricing" subhead="Every project is scoped and quoted individually — here's what we cover." align="center" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((category) => (
            <Card
              key={category.label}
              className={cn(
                "flex flex-col items-center gap-3 p-6 text-center",
                category.highlighted && "border-transparent bg-accent"
              )}
            >
              <category.icon className={cn("h-7 w-7", category.highlighted ? "text-accent-foreground" : "text-brand")} />
              <p className={cn("text-sm font-medium", category.highlighted ? "text-accent-foreground" : "text-foreground")}>
                {category.label}
              </p>
              <p className={cn("text-2xl font-bold", category.highlighted ? "text-accent-foreground" : "text-foreground")}>
                Custom quote
              </p>
            </Card>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link href="/pricing">
            <Button variant="secondary">See full pricing</Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
