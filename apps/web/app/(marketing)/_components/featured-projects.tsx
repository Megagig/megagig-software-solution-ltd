"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@repo/shared/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { Carousel } from "@/components/ui/carousel";
import { TabletFrame } from "@/components/ui/tablet-frame";
import { Badge } from "@/components/ui/badge";
import { getScreenshotForSlug } from "@/lib/product-screenshots";
import { cn } from "@/lib/utils";

interface FeaturedProjectsProps {
  caseStudies: CaseStudy[];
}

// Real, shipped-project showcase, matching the reference site's own
// Featured Clients section: a split dark/light panel, a clickable
// name-pill list on the left that jumps the auto-advancing carousel on
// the right to that slide, a caption overlaid on the screenshot itself,
// and the whole slide linking through to that case study's detail page.
//
// Peek devices are deliberately much smaller than the main frame and
// pushed well clear of it (fixed widths, not percentages) — the first
// pass sized them at 70% of the panel, which made them nearly the same
// size as the main frame and collide with it instead of receding behind.
//
// Only the inner card's LEFT panel is dark (bg-black, below) — the outer
// <section> stays on the normal theme background. An earlier pass wrapped
// the whole section in a hardcoded dark bg + inverted heading, which read
// as one big black band instead of a light section with one dark panel.
export function FeaturedProjects({ caseStudies }: FeaturedProjectsProps) {
  const projects = caseStudies.filter((cs) => getScreenshotForSlug(cs.slug));
  const [active, setActive] = useState(0);

  if (projects.length === 0) return null;

  const peekLeft = projects[(active + projects.length - 1) % projects.length];
  const peekRight = projects[(active + 1) % projects.length];

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading
          eyebrow="Featured clients"
          title="Real products. In production."
          align="center"
        />

        <div className="mx-auto mt-10 flex max-w-4xl flex-col overflow-hidden rounded-2xl shadow-2xl md:min-h-[460px] md:flex-row">
          {/* Left panel — clickable name list, jumps the carousel to that slide */}
          <div className="flex shrink-0 gap-3 overflow-x-auto bg-black p-6 md:w-64 md:flex-col md:justify-center md:gap-4 md:overflow-visible md:p-10">
            {projects.map((cs, i) => (
              <button
                key={cs.id}
                type="button"
                aria-current={i === active}
                onClick={() => setActive(i)}
                className={cn(
                  "shrink-0 whitespace-nowrap rounded-full border px-5 py-3 text-center text-xs font-semibold uppercase tracking-wide transition-colors md:whitespace-normal",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2",
                  i === active ? "border-transparent bg-accent text-accent-foreground" : "border-white/10 text-white/40 hover:border-white/30 hover:text-white/70"
                )}
              >
                {cs.client_name}
              </button>
            ))}
          </div>

          {/* Right panel — carousel with small, receded peek devices */}
          <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-[#eef1f6] p-10 md:p-16">
            {projects.length > 1 && (
              <>
                <div className="absolute left-2 top-1/2 z-0 hidden w-40 -translate-y-1/2 opacity-30 blur-[0.5px] grayscale md:block lg:left-8 lg:w-48">
                  <TabletFrame>
                    <div className="relative aspect-[4/3] w-full">
                      <Image src={getScreenshotForSlug(peekLeft.slug)!} alt="" fill className="object-cover object-top" sizes="200px" />
                    </div>
                  </TabletFrame>
                </div>
                <div className="absolute right-2 top-1/2 z-0 hidden w-40 -translate-y-1/2 opacity-30 blur-[0.5px] grayscale md:block lg:right-8 lg:w-48">
                  <TabletFrame>
                    <div className="relative aspect-[4/3] w-full">
                      <Image src={getScreenshotForSlug(peekRight.slug)!} alt="" fill className="object-cover object-top" sizes="200px" />
                    </div>
                  </TabletFrame>
                </div>
              </>
            )}

            <div className="relative z-10 w-64 sm:w-80">
              <Carousel autoAdvanceMs={6000} index={active} onIndexChange={setActive} hideDots>
                {projects.map((cs, i) => (
                  <Link key={cs.id} href={`/case-study/${cs.slug}`} className="block">
                    <TabletFrame interactive>
                      <div className="relative aspect-[4/3] w-full">
                        <Image
                          src={getScreenshotForSlug(cs.slug)!}
                          alt={`${cs.client_name} product screenshot`}
                          fill
                          className="object-cover object-top"
                          sizes="320px"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3">
                          <Badge variant="accent" className="mb-1.5 text-[10px]">
                            {i + 1} · {cs.client_name}
                          </Badge>
                          <p className="line-clamp-2 text-xs font-semibold leading-snug text-white">{cs.tagline}</p>
                          <span className="mt-1.5 inline-block text-[10px] font-medium text-white/70">
                            Explore {cs.client_name} →
                          </span>
                        </div>
                      </div>
                    </TabletFrame>
                  </Link>
                ))}
              </Carousel>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
