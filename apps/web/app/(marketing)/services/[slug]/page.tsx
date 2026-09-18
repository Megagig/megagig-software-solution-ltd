import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { BrowserFrame } from "@/components/ui/browser-frame";
import { SERVICES, getServiceBySlug } from "@/lib/services";
import { TECH_LOGOS } from "@/lib/tech-logos";
import { getScreenshotForSlug } from "@/lib/product-screenshots";
import { getPublishedCaseStudies } from "@/lib/case-studies";
import { getPublishedProducts } from "@/lib/products";

export function generateStaticParams() {
  return SERVICES.map((service) => ({ slug: service.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) return {};
  return {
    title: service.title,
    description: service.description,
  };
}

// Static detail page per project-requirements.md §5.2 — generateStaticParams
// since SERVICES is code-owned (no DB round-trip needed), unlike the
// DB-backed Product/CaseStudy detail pages. Evidence block only renders
// real CaseStudy/Product screenshots where `relatedWork` names a genuine
// match — never a generic illustration (ui-rules.md §1).
export default async function ServiceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const service = getServiceBySlug(slug);
  if (!service) notFound();

  const relatedWork = service.relatedWork ?? [];
  const [caseStudies, products] = relatedWork.length
    ? await Promise.all([getPublishedCaseStudies(), getPublishedProducts()])
    : [[], []];

  const evidence = relatedWork
    .map((rel) => {
      if (rel.type === "case-study") {
        const cs = caseStudies.find((c) => c.slug === rel.slug);
        if (!cs) return null;
        const screenshot = getScreenshotForSlug(cs.slug);
        if (!screenshot) return null;
        return { name: cs.client_name, tagline: cs.tagline, href: `/case-study/${cs.slug}`, screenshot };
      }
      const product = products.find((p) => p.slug === rel.slug);
      if (!product) return null;
      const screenshot = getScreenshotForSlug(product.slug);
      if (!screenshot) return null;
      return { name: product.name, tagline: product.tagline, href: `/product/${product.slug}`, screenshot };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10">
              <service.icon className="h-7 w-7 text-brand" />
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">{service.title}</h1>
            <p className="mt-4 text-lg text-foreground-muted">{service.description}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href={`/start-project?service=${service.slug}`}>
                <Button size="lg">
                  Get a quote for this <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/services">
                <Button variant="secondary" size="lg">
                  All services
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-surface">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="mx-auto grid max-w-4xl gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold text-foreground">What's included</h2>
              <ul className="mt-5 space-y-3">
                {service.whatsIncluded.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-foreground-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Typical stack</h2>
              <div className="mt-5 flex flex-wrap gap-x-8 gap-y-5">
                {service.stack.map((label) => {
                  const src = TECH_LOGOS[label];
                  return (
                    <div key={label} className="flex flex-col items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10">
                        {src ? (
                          <Image
                            src={src}
                            alt={label}
                            width={160}
                            height={148}
                            unoptimized
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-lg bg-brand/10 text-xs font-semibold text-brand">
                            {label.slice(0, 2)}
                          </div>
                        )}
                      </div>
                      <span className="font-mono text-xs text-foreground-muted">{label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {evidence.length > 0 && (
        <section className="bg-background">
          <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
            <SectionHeading eyebrow="Real, shipped work" title="Where we've done this" align="center" />
            <div className={`mx-auto mt-12 grid max-w-4xl gap-8 ${evidence.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {evidence.map((item) => (
                <Link key={item.href} href={item.href} className="group block">
                  <BrowserFrame
                    tone="dark"
                    bezel="thick"
                    className="transition-all duration-standard ease-standard group-hover:-translate-y-1 group-hover:shadow-2xl"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src={item.screenshot}
                        alt={`${item.name} screenshot`}
                        fill
                        className="object-cover object-top transition-transform duration-slow ease-standard group-hover:scale-[1.06]"
                        sizes="(max-width: 768px) 100vw, 500px"
                      />
                    </div>
                  </BrowserFrame>
                  <p className="mt-4 text-center font-semibold text-foreground">{item.name}</p>
                  <p className="text-center text-sm text-foreground-muted">{item.tagline}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="bg-brand">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
          <h2 className="text-3xl font-bold tracking-tight text-brand-foreground md:text-4xl">
            Ready to talk about {service.title.toLowerCase()}?
          </h2>
          <p className="mx-auto mt-4 max-w-[55ch] text-brand-foreground/80">
            Tell us what you're building — we'll reply within 24 hours with next steps.
          </p>
          <Link href={`/start-project?service=${service.slug}`} className="mt-8 inline-block">
            <Button size="lg" className="bg-brand-foreground text-brand hover:shadow-none hover:translate-y-0">
              Get a quote
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
}
