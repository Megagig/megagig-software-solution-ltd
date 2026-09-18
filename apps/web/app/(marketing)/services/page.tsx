import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServiceCard } from "@/components/service-card";
import { SERVICES, HIGHLIGHTED_SLUG } from "@/lib/services";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Web, mobile, desktop, and custom software — engineering-led delivery from Megagig Software Solution.",
};

// Static per build-plan.md Phase 4 item 2 — same code-owned SERVICES
// catalog and card as Home's ServicesGrid, just the full, uncapped list.
export default function ServicesIndexPage() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading
          eyebrow="What we do"
          title="Services"
          subhead="End-to-end software delivery — from the first architecture conversation to the product your team runs on every day."
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {SERVICES.map((service) => (
            <ServiceCard key={service.slug} service={service} highlighted={service.slug === HIGHLIGHTED_SLUG} />
          ))}
        </div>
      </div>
    </section>
  );
}
