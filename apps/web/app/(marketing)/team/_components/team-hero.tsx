import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, Code2, MapPin, Sparkles, Users } from "lucide-react";
import type { Stat } from "@repo/shared/types";
import { Button } from "@/components/ui/button";
import { StatsRow } from "@/components/stats-row";

interface TeamHeroProps {
  /** SiteSettings mission statement — the descriptive line under the headline. */
  missionStatement?: string;
  /** SiteSettings address (e.g. "Lagos, Nigeria") — shown as a location pill. */
  location?: string;
  stats: Stat[];
}

// Restrained backdrop (ui-rules.md §1): a faint dot grid faded out toward
// the edges plus the same low-opacity brand/accent glow Home's hero uses —
// token colors via color-mix/var so it flips correctly in dark mode.
const BACKDROP_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(55% 50% at 50% 0%, color-mix(in srgb, var(--color-brand) 14%, transparent), transparent 70%), " +
    "radial-gradient(35% 35% at 88% 18%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 70%)",
};
const DOTS_STYLE: React.CSSProperties = {
  backgroundImage: "radial-gradient(var(--color-border) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
  maskImage: "radial-gradient(ellipse 70% 65% at 50% 40%, black, transparent)",
  WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 40%, black, transparent)",
};

// Tinted icon chip sitting inline in the headline; scales with the type.
function Chip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="mx-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 align-middle text-brand sm:mx-2 sm:h-12 sm:w-12 md:h-14 md:w-14 [&>svg]:h-1/2 [&>svg]:w-1/2"
    >
      {children}
    </span>
  );
}

// Nothing here is a claim we can't back: the headline echoes Home's
// confirmed "software teams actually adopt" positioning, and the
// descriptive line, location and stats all come from admin-managed data.
export function TeamHero({ missionStatement, location, stats }: TeamHeroProps) {
  return (
    <section className="relative overflow-hidden bg-background">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={BACKDROP_STYLE} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={DOTS_STYLE} />

      <div className="relative mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        {location && (
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-foreground-muted">
            <MapPin className="h-4 w-4 text-brand" aria-hidden="true" />
            {location}
          </div>
        )}

        <h1 className="mx-auto max-w-5xl text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.15]">
          Meet the Nigerian team
          <Chip>
            <Users />
          </Chip>
          engineering software
          <Chip>
            <Code2 />
          </Chip>
          your business
          <Chip>
            <Sparkles />
          </Chip>
          actually uses
        </h1>

        {missionStatement && (
          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-foreground-muted">{missionStatement}</p>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/start-project">
            <Button size="lg">
              Start a project <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="#team">
            <Button variant="secondary" size="lg">
              Meet the team
            </Button>
          </Link>
        </div>

        <StatsRow stats={stats} className="mt-16" />
      </div>
    </section>
  );
}
