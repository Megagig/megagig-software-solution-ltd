import Image from "next/image";
import { Github, Linkedin, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";

// Static, real content per project-requirements.md §5.1 (not DB-backed —
// code-standards.md §6). Facts confirmed directly by the founder.
const LINKS = [
  { href: "https://github.com/Megagig", icon: Github, label: "GitHub" },
  { href: "https://www.linkedin.com/in/obi-anthony/", icon: Linkedin, label: "LinkedIn" },
  { href: "https://x.com/megagigsolution", icon: Twitter, label: "X" },
];

export function FounderSpotlight() {
  return (
    <section className="bg-background">
      <div className="mx-auto grid max-w-(--space-container-max) gap-10 px-(--space-container-x) py-(--space-section-y-mobile) md:grid-cols-[minmax(0,280px)_1fr] md:items-start md:py-(--space-section-y)">
        <div className="relative mx-auto aspect-square w-48 overflow-hidden rounded-lg border border-border md:w-full">
          <Image
            src="/profile.jfif"
            alt="Obi Anthony Uchenna, Founder & Lead Developer at Megagig Software Solution"
            fill
            className="object-cover"
            sizes="(max-width: 768px) 192px, 280px"
          />
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brand">Founder spotlight</p>
          <p className="mt-3 text-2xl font-medium leading-snug text-foreground">
            &ldquo;Build software teams actually adopt, not software that looks good in a pitch deck.&rdquo;
          </p>

          <div className="mt-6 space-y-4 text-foreground-muted">
            <p>
              I started Megagig Software Solution Ltd to close a gap I kept running into as a developer:
              most Nigerian businesses were being sold software built for someone else's market — global
              SaaS that ignores mobile money, offline-first retail, and how local teams actually work. I
              wanted to build the alternative.
            </p>
            <p>
              Since 2023, I've built and shipped several production platforms end-to-end — including
              PharmacyCopilot, a cross-platform pharmacy management SaaS running across web, desktop, and
              mobile for pharmacists across Nigeria, and BusinessCopilot, a unified POS, inventory,
              accounting, CRM, and HR platform built to match and exceed tools like QuickBooks and
              FreshBooks for the local market. I work the full stack — from the database and API up
              through the desktop, web, and mobile clients that ship to real users.
            </p>
            <p>My focus with Megagig is simple: build software teams actually adopt, not software that looks good in a pitch deck.</p>
          </div>

          <p className="mt-6 font-semibold text-foreground">
            Obi Anthony Uchenna
            <span className="block text-sm font-normal text-foreground-muted">
              Founder & Lead Developer, Megagig Software Solution Ltd
            </span>
          </p>

          <div className="mt-5 flex items-center gap-2">
            {LINKS.map((link) => (
              <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" className="gap-1.5">
                  <link.icon className="h-4 w-4" /> {link.label}
                </Button>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
