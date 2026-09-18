import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CaseStudy } from "@repo/shared/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { BrowserFrame } from "@/components/ui/browser-frame";
import { getScreenshotForSlug } from "@/lib/product-screenshots";
import { cn } from "@/lib/utils";

interface CaseStudyPreviewProps {
  caseStudies: CaseStudy[];
}

// Alternating image/text rows, matching the reference site's "Recent
// Clients" section exactly — not a card grid (that's SelectedWork,
// further down Home). Real screenshots only: only case studies with a
// matching image are shown, same anti-fabrication guard as elsewhere.
export function CaseStudyPreview({ caseStudies }: CaseStudyPreviewProps) {
  const preview = caseStudies.filter((cs) => getScreenshotForSlug(cs.slug)).slice(0, 3);
  if (preview.length === 0) return null;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <div className="mb-14 flex flex-col items-center gap-4 text-center">
          <SectionHeading eyebrow="Real, shipped work" title="Recent case studies" align="center" />
          <Link href="/case-studies" className="text-sm font-medium text-brand hover:underline">
            View all →
          </Link>
        </div>

        <div className="space-y-16 md:space-y-24">
          {preview.map((cs, i) => {
            const reversed = i % 2 === 1;
            return (
              <div
                key={cs.id}
                className={cn(
                  "grid items-start gap-8 md:mx-auto md:w-[960px] md:gap-10",
                  reversed ? "md:grid-cols-[1fr_440px]" : "md:grid-cols-[440px_1fr]",
                  reversed && "md:[&>*:first-child]:order-2"
                )}
              >
                <Link href={`/case-study/${cs.slug}`} className="group block">
                  <BrowserFrame
                    url={`${cs.slug}.com.ng`}
                    tone="dark"
                    bezel="thick"
                    className="transition-all duration-standard ease-standard group-hover:-translate-y-1 group-hover:shadow-2xl"
                  >
                    <div className="relative aspect-[5/3] w-full overflow-hidden">
                      <Image
                        src={getScreenshotForSlug(cs.slug)!}
                        alt={`${cs.client_name} product screenshot`}
                        fill
                        className="object-cover object-top transition-transform duration-slow ease-standard group-hover:scale-[1.06]"
                        sizes="(max-width: 768px) 100vw, 440px"
                      />
                    </div>
                  </BrowserFrame>
                </Link>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand">{cs.tagline}</p>
                  <h3 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
                    {cs.client_name}
                  </h3>
                  <p className="mt-4 text-foreground-muted">{cs.what_we_built}</p>
                  <Link
                    href={`/case-study/${cs.slug}`}
                    className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-foreground hover:text-brand"
                  >
                    View Case Study <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
