import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PRICING_CATEGORIES } from "@/lib/pricing";
import { cn } from "@/lib/utils";

// Primary card action is a direct entry point into /start-project (per
// user request: clicking a category should let the visitor jump straight
// into submitting what they want built, not read about it first). "See
// what's included" stays as a secondary link to the Services detail page
// for anyone who wants details before committing — not removed, just no
// longer the only path.
export function PricingTeaser() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="Investment" title="Pricing" subhead="Every project is scoped and quoted individually — here's what we cover." align="center" />
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRICING_CATEGORIES.map((category) => (
            <Card
              key={category.label}
              className={cn(
                "flex h-full flex-col items-center gap-3 p-6 text-center",
                category.highlighted && "border-transparent bg-accent"
              )}
            >
              <category.icon className={cn("h-7 w-7", category.highlighted ? "text-accent-foreground" : "text-brand")} />
              <p className={cn("text-sm font-medium", category.highlighted ? "text-accent-foreground" : "text-foreground")}>
                {category.label}
              </p>
              <Link
                href={`/start-project?service=${category.slug}`}
                className={cn(
                  "inline-flex items-center gap-1 text-lg font-bold hover:underline",
                  category.highlighted ? "text-accent-foreground" : "text-brand"
                )}
              >
                Get a Quote <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/services/${category.slug}`}
                className={cn(
                  "text-xs",
                  category.highlighted ? "text-accent-foreground/70 hover:text-accent-foreground" : "text-foreground-muted hover:text-foreground"
                )}
              >
                See what&apos;s included →
              </Link>
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
