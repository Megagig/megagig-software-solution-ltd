import Link from "next/link";
import { Globe, Layers3, Smartphone, MonitorSmartphone, Bot, Palette, Calculator, Compass, GraduationCap, ArrowUpRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// One card per grid gets a solid accent-fill highlight to break up an
// otherwise uniform grid — a deliberate redesign decision, not a
// per-service ranking. AI Automation is the pick, matching the reference
// site's own choice for the same reasoning (it's the most visually
// demonstrable service).
const HIGHLIGHTED_SLUG = "ai-automation";

// Static service catalog per project-requirements.md §5.2 — code-owned,
// not a DB resource, per code-standards.md §6. Slugs feed /services/[slug]
// once Phase 4.2 builds those detail pages.
const SERVICES = [
  {
    slug: "web-design-development",
    icon: Globe,
    title: "Web Design & Development",
    description: "Marketing sites and web apps built for speed, SEO, and real conversion — not just good looks.",
  },
  {
    slug: "custom-software-saas",
    icon: Layers3,
    title: "Custom Software / SaaS Platforms",
    description: "End-to-end product builds, from database to UI, engineered for how your business actually runs.",
  },
  {
    slug: "mobile-app-development",
    icon: Smartphone,
    title: "Mobile App Development",
    description: "Native-feeling apps for iOS and Android, built for low-connectivity, real-world usage.",
  },
  {
    slug: "desktop-pos-apps",
    icon: MonitorSmartphone,
    title: "Desktop & POS Apps",
    description: "Offline-first desktop and point-of-sale software for retail, pharmacy, and hospitality.",
  },
  {
    slug: "ai-automation",
    icon: Bot,
    title: "AI Automation",
    description: "Practical automation that removes manual work from your team's day-to-day operations.",
  },
  {
    slug: "ui-ux-design",
    icon: Palette,
    title: "UI/UX Design",
    description: "Interfaces designed around how your users actually work, not generic templates.",
  },
  {
    slug: "accounting-software-automations",
    icon: Calculator,
    title: "Accounting Software Automations",
    description: "Custom ledgers, reconciliation, invoicing, and reporting — automated for how your finance team actually works.",
  },
  {
    slug: "tech-consultation",
    icon: Compass,
    title: "Tech Consultation & Architecture Review",
    description: "An outside engineering eye on your stack, roadmap, or a system that's grown past its original design.",
  },
  {
    slug: "it-training-internships",
    icon: GraduationCap,
    title: "IT Training & Internships",
    description: "Hands-on training and internship placements for developers building real-world skills.",
  },
];

export function ServicesGrid() {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading
          eyebrow="What we do"
          title="Services"
          subhead="End-to-end software delivery — from the first architecture conversation to the product your team runs on every day."
          align="center"
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
          {SERVICES.map((service) => {
            const highlighted = service.slug === HIGHLIGHTED_SLUG;
            return (
              <Link key={service.slug} href={`/services/${service.slug}`} className="group block h-full">
                <Card
                  interactive
                  className={cn(
                    "relative flex h-full flex-col overflow-hidden p-7 transition-colors duration-standard ease-standard",
                    highlighted ? "border-transparent bg-accent" : "hover:border-brand/40"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-xl transition-transform duration-standard ease-standard group-hover:-translate-y-0.5",
                      highlighted ? "bg-white/15" : "bg-brand/10"
                    )}
                  >
                    <service.icon className={cn("h-6 w-6", highlighted ? "text-accent-foreground" : "text-brand")} />
                  </div>
                  <h3
                    className={cn(
                      "mt-5 text-xl font-semibold",
                      highlighted ? "text-accent-foreground" : "text-foreground"
                    )}
                  >
                    {service.title}
                  </h3>
                  <p className={cn("mt-2 text-sm leading-relaxed", highlighted ? "text-accent-foreground/80" : "text-foreground-muted")}>
                    {service.description}
                  </p>
                  <ArrowUpRight
                    className={cn(
                      "absolute right-6 top-7 h-5 w-5 -translate-y-1 opacity-0 transition-all duration-standard ease-standard group-hover:translate-y-0 group-hover:opacity-100",
                      highlighted ? "text-accent-foreground" : "text-brand"
                    )}
                  />
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
