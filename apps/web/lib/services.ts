import { Globe, Layers3, Smartphone, MonitorSmartphone, Bot, Palette, Calculator, Compass, GraduationCap } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Static service catalog per project-requirements.md §5.2 — code-owned,
// not a DB resource (build-plan.md Phase 4, item 2), unlike this file's
// lib/*.ts siblings which wrap a public API fetch. Single source of truth
// for Home's ServicesGrid, /services, and /services/[slug].
export interface RelatedWork {
  type: "case-study" | "product";
  slug: string;
}

export interface Service {
  slug: string;
  icon: LucideIcon;
  title: string;
  description: string;
  /** "What's included" bullets on the detail page. */
  whatsIncluded: string[];
  /** Subset of the real tech logos (see lib/tech-logos.ts) genuinely used
   * for this kind of work — never a full-stack dump on every service. */
  stack: string[];
  /** Real CaseStudy/Product evidence for this service, only where a
   * genuine match exists — omitted rather than forced (ui-rules.md §1:
   * evidence over decoration, no illustrations standing in for proof). */
  relatedWork?: RelatedWork[];
}

// One card gets a solid accent-fill highlight to break up an otherwise
// uniform grid — a deliberate design decision, not a per-service ranking.
export const HIGHLIGHTED_SLUG = "ai-automation";

export const SERVICES: Service[] = [
  {
    slug: "web-design-development",
    icon: Globe,
    title: "Web Design & Development",
    description: "Marketing sites and web apps built for speed, SEO, and real conversion — not just good looks.",
    whatsIncluded: [
      "Responsive marketing site or web app design and build",
      "SEO-friendly structure, metadata, and page speed from day one",
      "CMS/admin panel so your team can update content without a developer",
      "Lead-capture forms wired to your inbox and CRM",
    ],
    stack: ["Next.js"],
    relatedWork: [{ type: "case-study", slug: "kaneopromovers" }],
  },
  {
    slug: "custom-software-saas",
    icon: Layers3,
    title: "Custom Software / SaaS Platforms",
    description: "End-to-end product builds, from database to UI, engineered for how your business actually runs.",
    whatsIncluded: [
      "Product discovery and architecture before a line of code is written",
      "Full-stack build — database, API, and UI as one coherent system",
      "Multi-tenant support where the business model needs it",
      "Ongoing iteration after launch, not a one-and-done handoff",
    ],
    stack: ["Next.js", "Go", "MongoDB / PostgreSQL"],
    relatedWork: [
      { type: "product", slug: "businesscopilot" },
      { type: "case-study", slug: "societyledger" },
    ],
  },
  {
    slug: "mobile-app-development",
    icon: Smartphone,
    title: "Mobile App Development",
    description: "Native-feeling apps for iOS and Android, built for low-connectivity, real-world usage.",
    whatsIncluded: [
      "Single codebase for iOS and Android",
      "Offline-first data sync for unreliable connectivity",
      "Push notifications and native device integrations",
      "App store submission and release management",
    ],
    stack: ["React", "Expo"],
    relatedWork: [
      { type: "product", slug: "pharmacycopilot" },
      { type: "product", slug: "businesscopilot" },
    ],
  },
  {
    slug: "desktop-pos-apps",
    icon: MonitorSmartphone,
    title: "Desktop & POS Apps",
    description: "Offline-first desktop and point-of-sale software for retail, pharmacy, and hospitality.",
    whatsIncluded: [
      "Offline-first desktop app that keeps working through network outages",
      "Barcode/receipt-printer and till hardware integration",
      "Multi-branch inventory and sales sync",
      "Role-based staff access (cashier, manager, admin)",
    ],
    stack: ["Electron", "Wails"],
    relatedWork: [
      { type: "product", slug: "pharmacycopilot" },
      { type: "case-study", slug: "megapro-erp" },
    ],
  },
  {
    slug: "ai-automation",
    icon: Bot,
    title: "AI Automation",
    description: "Practical automation that removes manual work from your team's day-to-day operations.",
    whatsIncluded: [
      "Workflow audit to find the manual work worth automating first",
      "AI-assisted document, data-entry, and reporting automation",
      "Integration with the tools your team already uses",
      "Measured against hours saved, not automation for its own sake",
    ],
    stack: ["Next.js", "Go"],
  },
  {
    slug: "ui-ux-design",
    icon: Palette,
    title: "UI/UX Design",
    description: "Interfaces designed around how your users actually work, not generic templates.",
    whatsIncluded: [
      "User flows mapped to how the work actually happens, not a generic template",
      "A design system your product can grow on, not a one-off mockup",
      "Accessibility and responsive behavior built in, not patched on after",
      "Design handoff straight into a real, working build",
    ],
    stack: ["Tailwind"],
  },
  {
    slug: "accounting-software-automations",
    icon: Calculator,
    title: "Accounting Software Automations",
    description: "Custom ledgers, reconciliation, invoicing, and reporting — automated for how your finance team actually works.",
    whatsIncluded: [
      "General ledger, receivables/payables, and tax-code configuration",
      "Automated reconciliation health checks, not month-end guesswork",
      "Invoicing and reporting tailored to your chart of accounts",
      "Fiscal-period controls so closed books stay closed",
    ],
    stack: ["Next.js", "Node.js", "MongoDB / PostgreSQL"],
    relatedWork: [{ type: "case-study", slug: "yazzyos" }],
  },
  {
    slug: "tech-consultation",
    icon: Compass,
    title: "Tech Consultation & Architecture Review",
    description: "An outside engineering eye on your stack, roadmap, or a system that's grown past its original design.",
    whatsIncluded: [
      "Independent review of your current architecture and roadmap",
      "Identification of what's actually slowing the team down",
      "A prioritized, realistic plan — not a rewrite-everything recommendation",
      "Available as a one-off engagement or ongoing advisory",
    ],
    stack: ["Next.js", "Go", "MongoDB / PostgreSQL"],
  },
  {
    slug: "it-training-internships",
    icon: GraduationCap,
    title: "IT Training & Internships",
    description: "Hands-on training and internship placements for developers building real-world skills.",
    whatsIncluded: [
      "Structured, hands-on curriculum on our real production stack",
      "Mentorship from engineers shipping live products, not just theory",
      "Internship placements with real project work, not busywork",
      "A clear track from trainee to production-ready contributor",
    ],
    stack: ["Next.js", "Go", "MongoDB / PostgreSQL"],
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((service) => service.slug === slug);
}
