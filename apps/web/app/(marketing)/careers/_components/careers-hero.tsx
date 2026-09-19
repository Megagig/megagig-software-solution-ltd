import Link from "next/link";
import { ArrowRight, Code2, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HeroBackdrop } from "@/components/hero-backdrop";
import { IconChip } from "@/components/icon-chip";

// Same icon-chip headline treatment as /team. The supporting line makes no
// claims about pay, perks or hiring process — only what the page does.
export function CareersHero({ cvHref }: { cvHref: string }) {
  return (
    <section className="relative overflow-hidden bg-background">
      <HeroBackdrop />

      <div className="relative mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Careers</p>

        <h1 className="mx-auto mt-4 max-w-5xl text-4xl font-bold leading-[1.15] tracking-tight text-foreground sm:text-5xl md:text-6xl md:leading-[1.15]">
          Join the team
          <IconChip>
            <Users />
          </IconChip>
          building software
          <IconChip>
            <Code2 />
          </IconChip>
          Nigerian businesses
          <IconChip>
            <Sparkles />
          </IconChip>
          trust
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-foreground-muted">
          We&apos;re an engineering-led team shipping production software for real users. See what&apos;s open, or send
          us your CV.
        </p>

        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="#roles">
            <Button size="lg">
              See open roles <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <a href={cvHref}>
            <Button variant="secondary" size="lg">
              Send your CV
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}
