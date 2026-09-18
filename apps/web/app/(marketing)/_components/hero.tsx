import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroShowcase } from "./hero-showcase";

interface HeroProps {
  headline?: string;
  subhead?: string;
}

const FALLBACK_SUBHEAD =
  "We build production software for African SMEs — engineered for local workflows, not adapted from someone else's market.";

// Subtle radial glow behind the hero (ui-rules.md §1 — restrained, not a
// "cartoonish gradient": low-opacity, our own brand/accent tokens via
// color-mix so it flips correctly in dark mode, no hard edges).
const GLOW_STYLE: React.CSSProperties = {
  background:
    "radial-gradient(55% 50% at 50% 0%, color-mix(in srgb, var(--color-brand) 14%, transparent), transparent 70%), " +
    "radial-gradient(35% 35% at 85% 15%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 70%)",
};

export function Hero({ headline, subhead }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-background">
      <div aria-hidden className="pointer-events-none absolute inset-0" style={GLOW_STYLE} />

      <div className="relative mx-auto flex max-w-(--space-container-max) flex-col items-center px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-foreground-muted">
          <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
          Available for new projects
        </div>

        {headline ? (
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight text-foreground sm:text-6xl md:text-7xl">
            {headline}
          </h1>
        ) : (
          <h1 className="max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
            <span className="text-foreground">We build</span>
            <br />
            <span className="text-brand">production software</span>
            <br />
            <span className="text-foreground">for Nigerian businesses</span>
          </h1>
        )}

        <p className="mt-8 max-w-2xl text-lg leading-normal text-foreground-muted">
          {subhead || FALLBACK_SUBHEAD}
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link href="/start-project">
            <Button size="lg">
              Start a project <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#selected-work">
            <Button variant="secondary" size="lg">
              See our work
            </Button>
          </Link>
        </div>

        <HeroShowcase />
      </div>
    </section>
  );
}
