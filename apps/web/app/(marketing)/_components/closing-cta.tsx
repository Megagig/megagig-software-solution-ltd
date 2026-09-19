import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatCallout } from "@/components/ui/stat-callout";
import { TRUST_STATS } from "@/lib/trust-stats";

export function ClosingCta() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
          {TRUST_STATS.map((stat) => (
            <StatCallout key={stat.label} value={stat.value} label={stat.label} />
          ))}
        </div>

        <h2 className="mx-auto mt-16 max-w-2xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
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
