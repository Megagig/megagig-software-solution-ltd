import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type SectionTone = "background" | "surface";

// Shared section shell (used by /about-us and /careers). Sections are individually optional
// (each hides when its admin-managed content is empty), so the page assigns
// each visible section its background by position — that keeps the
// background/surface alternation intact whichever sections are showing.
export function PageSection({
  tone,
  children,
  className,
  id,
}: {
  tone: SectionTone;
  children: ReactNode;
  className?: string;
  /** Optional in-page anchor target (e.g. "#roles"); offsets for the sticky navbar. */
  id?: string;
}) {
  return (
    <section id={id} className={cn(tone === "surface" ? "bg-surface" : "bg-background", id && "scroll-mt-24")}>
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
