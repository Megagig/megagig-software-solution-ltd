import { Globe, Smartphone, Palette, MonitorSmartphone, GraduationCap, Bot, Compass } from "lucide-react";
import type { LucideIcon } from "lucide-react";

// Category cards, "Custom quote" per ui-rules.md §5 — no fixed-tier
// pricing table on this site. Static per project-requirements.md §5.5.
// Single shared source for Home's PricingTeaser and the full /pricing
// page. `slug` links each card to its matching, already-built Services
// detail page — real cross-links, not new content.
export interface PricingCategory {
  icon: LucideIcon;
  label: string;
  slug: string;
  highlighted?: boolean;
}

export const PRICING_CATEGORIES: PricingCategory[] = [
  { icon: Globe, label: "Web Design & Development", slug: "web-design-development" },
  { icon: Smartphone, label: "Mobile App Development", slug: "mobile-app-development" },
  { icon: Palette, label: "UI/UX Design", slug: "ui-ux-design" },
  { icon: MonitorSmartphone, label: "Desktop App Development", slug: "desktop-pos-apps" },
  { icon: GraduationCap, label: "IT Training", slug: "it-training-internships" },
  { icon: Bot, label: "AI Automation & Integration", slug: "ai-automation", highlighted: true },
  { icon: Compass, label: "Consultation", slug: "tech-consultation" },
];
