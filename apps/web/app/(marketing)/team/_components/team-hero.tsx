import Link from "next/link";
import { ArrowRight, Code2, MapPin, Sparkles, Users } from "lucide-react";
import type { Stat } from "@repo/shared/types";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { IconChip } from "@/components/icon-chip";
import { StatsRow } from "@/components/stats-row";

interface TeamHeroProps {
  /** SiteSettings mission statement — the descriptive line under the headline. */
  missionStatement?: string;
  /** SiteSettings address (e.g. "Lagos, Nigeria") — shown as a location pill. */
  location?: string;
  stats: Stat[];
}

// Nothing here is a claim we can't back: the headline echoes Home's
// confirmed "software teams actually adopt" positioning, and the
// descriptive line, location and stats all come from admin-managed data.
export function TeamHero({ missionStatement, location, stats }: TeamHeroProps) {
  return (
    <section className="relative overflow-hidden bg-background">
      <HeroBackdrop />

      <div className="relative mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        {location && (
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm text-foreground-muted">
            <MapPin className="h-4 w-4 text-brand" aria-hidden="true" />
            {location}
          </div>
        )}

        <h1 className="mx-auto max-w-5xl text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.15]">
          Meet the Nigerian team
          <IconChip>
            <Users />
          </IconChip>
          engineering software
          <IconChip>
            <Code2 />
          </IconChip>
          your business
          <IconChip>
            <Sparkles />
          </IconChip>
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
          <Link href="/careers">
            <Button variant="secondary" size="lg">
              Join our team
            </Button>
          </Link>
        </div>

        <StatsRow stats={stats} className="mt-16" />
      </div>
    </section>
  );
}
