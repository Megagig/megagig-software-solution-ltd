import Link from "next/link";
import type { Stat } from "@repo/shared/types";
import { Button } from "@/components/ui/button";
import { StatsRow } from "@/components/stats-row";
import { cn } from "@/lib/utils";

// Trust stats are admin-managed (Stat resource) and passed in by the page.
export function ClosingCta({ stats }: { stats: Stat[] }) {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        <StatsRow stats={stats} />

        <h2
          className={cn(
            "mx-auto max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl",
            stats.length > 0 && "mt-16"
          )}
        >
          Let's build something your business actually uses.
        </h2>
        <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link href="/start-project">
            <Button size="lg">Start a project</Button>
          </Link>
          <Link href="#selected-work">
            <Button variant="secondary" size="lg">
              See our work
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
