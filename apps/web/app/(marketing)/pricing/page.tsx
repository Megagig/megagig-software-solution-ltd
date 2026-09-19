import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatCallout } from "@/components/ui/stat-callout";
import { PRICING_CATEGORIES } from "@/lib/pricing";
import { TRUST_STATS } from "@/lib/trust-stats";
import { getPublishedTestimonials } from "@/lib/testimonials";
import { getSiteSettings } from "@/lib/site-settings";
import { TestimonialsCarousel } from "../_components/testimonials-carousel";
import { QuoteCtaBand } from "../_components/quote-cta-band";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Every project is scoped and quoted individually — see what we cover and how we work.",
};

// Full pricing page per project-requirements.md §5.5, redesigned to match
// a user-provided reference site's structure and visual richness while
// keeping our own custom-quote business model exactly as specified — no
// fixed-tier table, no invented prices. Testimonials and stats reuse real
// content already established elsewhere on the site (TestimonialsCarousel,
// ClosingCta's trust stats), not new/fabricated content. The CTA band is
// the same QuoteCtaBand component Home uses, satisfying "CTA band
// identical in behavior to Home's quote CTA" by construction.
export default async function PricingPage() {
  const [testimonials, settings] = await Promise.all([getPublishedTestimonials(), getSiteSettings()]);

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Investment</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Simple, honest pricing
            </h1>
            <p className="mt-4 text-lg text-foreground-muted">
              Every project is scoped and quoted individually — no fixed packages, no surprise line items. Here&apos;s
              what we cover.
            </p>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {PRICING_CATEGORIES.map((category) => (
              <Card
                key={category.label}
                className={cn(
                  "flex h-full flex-col items-center gap-4 p-8 text-center",
                  category.highlighted && "border-transparent bg-accent"
                )}
              >
                <div
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-xl",
                    category.highlighted ? "bg-white/15" : "bg-brand/10"
                  )}
                >
                  <category.icon className={cn("h-7 w-7", category.highlighted ? "text-accent-foreground" : "text-brand")} />
                </div>
                <p className={cn("font-semibold", category.highlighted ? "text-accent-foreground" : "text-foreground")}>
                  {category.label}
                </p>
                <Link
                  href={`/start-project?service=${category.slug}`}
                  className={cn(
                    "group inline-flex items-center gap-1 text-2xl font-bold hover:underline",
                    category.highlighted ? "text-accent-foreground" : "text-brand"
                  )}
                >
                  Get a Quote <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href={`/services/${category.slug}`}
                  className={cn(
                    "text-sm",
                    category.highlighted ? "text-accent-foreground/80 hover:text-accent-foreground" : "text-foreground-muted hover:text-foreground"
                  )}
                >
                  See what&apos;s included →
                </Link>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-8 sm:grid-cols-4">
            {TRUST_STATS.map((stat) => (
              <StatCallout key={stat.label} value={stat.value} label={stat.label} />
            ))}
          </div>
        </div>
      </section>

      <TestimonialsCarousel testimonials={testimonials} />

      <QuoteCtaBand
        whatsAppNumber={settings?.whatsapp_number}
        contactEmail={settings?.contact_email}
        contactPhone={settings?.contact_phone}
      />
    </>
  );
}
