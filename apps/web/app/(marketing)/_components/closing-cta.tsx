import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatCallout } from "@/components/ui/stat-callout";

// Real trust stats confirmed by the founder — ui-rules.md §10: real
// numbers only, 2-4 per section max (this uses the cap, 4).
const STATS = [
  { value: "3+", label: "Years engineering production software" },
  { value: "10+", label: "Products in production" },
  { value: "99.9%", label: "Uptime" },
  { value: "200+", label: "Pharmacies & businesses served" },
];

export function ClosingCta() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
          {STATS.map((stat) => (
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
