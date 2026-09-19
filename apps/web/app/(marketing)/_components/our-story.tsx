import type { Stat } from "@repo/shared/types";
import { StatsRow } from "@/components/stats-row";

interface OurStoryProps {
  missionStatement?: string;
  foundedYear?: number;
  stats: Stat[];
}

// Everything here is admin-managed (SiteSettings mission/founded year +
// the Stat resource) — nothing is hard-coded. Shows the first 2 stats per
// project-requirements.md §5.1. Renders nothing until there is something
// real to show.
export function OurStory({ missionStatement, foundedYear, stats }: OurStoryProps) {
  if (!missionStatement && stats.length === 0) return null;

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        <p className="text-xs font-medium uppercase tracking-wide text-brand">
          Our story{foundedYear ? ` · Since ${foundedYear}` : ""}
        </p>
        {missionStatement && (
          <h2 className="mx-auto mt-3 max-w-[65ch] text-2xl font-medium leading-snug text-foreground md:text-3xl">
            {missionStatement}
          </h2>
        )}
        <StatsRow stats={stats} max={2} className="mt-10 max-w-md" />
      </div>
    </section>
  );
}
