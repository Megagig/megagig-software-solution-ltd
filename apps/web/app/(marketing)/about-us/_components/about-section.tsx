import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionTone = "background" | "surface";

// Shared section shell for /about-us. Sections are individually optional
// (each hides when its admin-managed content is empty), so the page assigns
// each visible section its background by position — that keeps the
// background/surface alternation intact whichever sections are showing.
export function AboutSection({
  tone,
  children,
  className,
}: {
  tone: SectionTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={tone === "surface" ? "bg-surface" : "bg-background"}>
      <div
        className={cn(
          "mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)",
          className
        )}
      >
        {children}
      </div>
    </section>
  );
}
