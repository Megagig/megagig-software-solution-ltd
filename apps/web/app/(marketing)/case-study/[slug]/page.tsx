import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrowserFrame } from "@/components/ui/browser-frame";
import { getPublishedCaseStudies, getPublishedCaseStudyBySlug } from "@/lib/case-studies";
import { getScreenshotForSlug } from "@/lib/product-screenshots";

export async function generateStaticParams() {
  const caseStudies = await getPublishedCaseStudies();
  return caseStudies.map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const caseStudy = await getPublishedCaseStudyBySlug(slug);
  if (!caseStudy) return {};
  return {
    title: caseStudy.client_name,
    description: caseStudy.tagline,
  };
}

const SECTIONS = (caseStudy: { problem: string; what_we_built: string; result: string }) => [
  { number: "01", title: "The Challenge", body: caseStudy.problem },
  { number: "02", title: "Our Solution", body: caseStudy.what_we_built },
  { number: "03", title: "The Result", body: caseStudy.result },
];

// DB-backed detail page — generateStaticParams + the existing
// revalidate: 60 ISR pattern (lib/case-studies.ts), same approach as
// Products. Redesigned per a user-provided reference: large pale numbered
// sections (01/02/03) in a two-column layout with a sticky sidebar (Live
// Site button + Tech Stack card), replacing the earlier plain
// single-column stack. tech_stack still renders as plain text badges
// (free-form admin-typed text, not the same fixed vocabulary as Services'
// curated `stack`) — matching it against TECH_LOGOS would silently miss
// real values. The reference's "Key Results" stat numbers were
// deliberately not replicated: we have no real figures for these case
// studies, and inventing them would break the anti-fabrication approach
// used everywhere else on this site.
export default async function CaseStudyDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const caseStudy = await getPublishedCaseStudyBySlug(slug);
  if (!caseStudy) notFound();

  const screenshot = getScreenshotForSlug(caseStudy.slug);
  const testimonial = caseStudy.testimonial;

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="mx-auto max-w-3xl text-center">
            <div className="flex flex-wrap items-center justify-center gap-2">
              {caseStudy.category_tags?.map((tag) => (
                <Badge key={tag} variant="neutral">
                  {tag}
                </Badge>
              ))}
              <Badge variant="accent">{caseStudy.status_badge}</Badge>
            </div>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              {caseStudy.client_name}
            </h1>
            <p className="mt-4 text-lg text-foreground-muted">{caseStudy.tagline}</p>
          </div>

          {screenshot && (
            <div className="mx-auto mt-12 max-w-2xl">
              <BrowserFrame tone="dark" bezel="thick">
                <div className="relative aspect-[16/10] w-full overflow-hidden">
                  <Image
                    src={screenshot}
                    alt={`${caseStudy.client_name} screenshot`}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 640px"
                  />
                </div>
              </BrowserFrame>
            </div>
          )}
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="grid gap-12 lg:grid-cols-3 lg:gap-16">
            <div className="order-2 space-y-14 lg:order-1 lg:col-span-2">
              {SECTIONS(caseStudy).map((section) => (
                <div key={section.number} className="flex gap-5 sm:gap-8">
                  <span className="shrink-0 text-5xl font-bold text-brand/15 sm:text-6xl">{section.number}</span>
                  <div className="pt-1">
                    <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                      {section.title}
                    </h2>
                    <p className="mt-4 text-lg leading-relaxed text-foreground-muted">{section.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="order-1 space-y-6 lg:order-2 lg:sticky lg:top-24 lg:self-start">
              {caseStudy.live_url && (
                <Link href={caseStudy.live_url} target="_blank" rel="noopener noreferrer" className="block">
                  <Button size="lg" className="w-full">
                    Visit Live Site <ArrowUpRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}

              {caseStudy.tech_stack?.length > 0 && (
                <div className="rounded-lg border border-border bg-surface-raised p-6">
                  <h3 className="text-sm font-semibold text-foreground">Tech Stack</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {caseStudy.tech_stack.map((tech) => (
                      <Badge key={tech} variant="brand">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {testimonial && (
        <section className="bg-background">
          <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-lg leading-snug text-foreground">&ldquo;{testimonial.quote_text}&rdquo;</p>
              <div className="mt-6 flex flex-col items-center gap-1">
                <p className="font-semibold text-foreground">{testimonial.author_name}</p>
                <p className="text-sm text-foreground-muted">
                  {testimonial.author_role}
                  {testimonial.company_name ? `, ${testimonial.company_name}` : ""}
                </p>
                {testimonial.company_url && (
                  <a
                    href={testimonial.company_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 text-sm text-brand hover:underline"
                  >
                    Visit {testimonial.company_name}
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="bg-brand">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
          <h2 className="text-3xl font-bold tracking-tight text-brand-foreground md:text-4xl">
            Want results like this?
          </h2>
          <p className="mx-auto mt-4 max-w-[55ch] text-brand-foreground/80">
            Tell us what you&apos;re building — we&apos;ll reply within 24 hours with next steps.
          </p>
          <Link href="/start-project" className="mt-8 inline-block">
            <Button size="lg" className="bg-brand-foreground text-brand hover:shadow-none hover:translate-y-0">
              Get a quote
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
