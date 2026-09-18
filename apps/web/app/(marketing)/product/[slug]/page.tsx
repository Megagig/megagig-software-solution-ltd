import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, ArrowUpRight, FileText } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrowserFrame } from "@/components/ui/browser-frame";
import { TabletFrame } from "@/components/ui/tablet-frame";
import { getPublishedProducts, getPublishedProductBySlug } from "@/lib/products";
import { getScreenshotsForSlug, getMobileScreenshotsForSlug } from "@/lib/product-screenshots";

export async function generateStaticParams() {
  const products = await getPublishedProducts();
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.tagline,
  };
}

// DB-backed detail page — generateStaticParams pre-renders known slugs at
// build time, ISR (revalidate: 60, via lib/products.ts) keeps them fresh
// and picks up new products added in the admin without a redeploy
// (Next's default dynamicParams renders any slug missing at build time
// on first request, then caches it).
export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getPublishedProductBySlug(slug);
  if (!product) notFound();

  const screenshots = getScreenshotsForSlug(product.slug);
  const mobileScreenshots = getMobileScreenshotsForSlug(product.slug);

  return (
    <>
      <section className="bg-background">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="mx-auto max-w-3xl text-center">
            {product.platforms?.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                {product.platforms.map((platform) => (
                  <Badge key={platform} variant="neutral">
                    {platform}
                  </Badge>
                ))}
              </div>
            )}
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground md:text-5xl">{product.name}</h1>
            <p className="mt-4 text-lg text-foreground-muted">{product.tagline}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href={product.live_url} target="_blank" rel="noopener noreferrer">
                <Button size="lg">
                  Explore product <ArrowUpRight className="h-4 w-4" />
                </Button>
              </Link>
              {product.docs_url && (
                <Link href={product.docs_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary" size="lg">
                    <FileText className="h-4 w-4" /> Documentation
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {(screenshots.length > 0 || mobileScreenshots.length > 0) && (
        <section className="bg-surface">
          <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
            {screenshots.length > 0 && (
              <div className={`mx-auto grid max-w-5xl gap-8 ${screenshots.length > 1 ? "sm:grid-cols-2" : "max-w-3xl"}`}>
                {screenshots.map((screenshot) => (
                  <BrowserFrame
                    key={screenshot}
                    url={product.live_url.replace(/^https?:\/\//, "")}
                    tone="dark"
                    bezel="thick"
                  >
                    <div className="relative aspect-[16/10] w-full overflow-hidden">
                      <Image
                        src={screenshot}
                        alt={`${product.name} screenshot`}
                        fill
                        className="object-cover object-top"
                        sizes="(max-width: 768px) 100vw, 600px"
                      />
                    </div>
                  </BrowserFrame>
                ))}
              </div>
            )}

            {mobileScreenshots.length > 0 && (
              <div className={screenshots.length > 0 ? "mt-16" : ""}>
                <p className="text-center text-xs font-semibold uppercase tracking-wide text-brand">On mobile</p>
                <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-start justify-center gap-8">
                  {mobileScreenshots.map((screenshot) => (
                    <div key={screenshot} className="w-44 sm:w-52">
                      <TabletFrame>
                        <div className="relative aspect-[9/20] w-full overflow-hidden">
                          <Image
                            src={screenshot}
                            alt={`${product.name} mobile screenshot`}
                            fill
                            className="object-cover object-top"
                            sizes="220px"
                          />
                        </div>
                      </TabletFrame>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-background">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="mx-auto max-w-3xl">
            <SectionHeading eyebrow="What it is" title={`About ${product.name}`} />
            <p className="mt-6 text-lg leading-relaxed text-foreground-muted">{product.description}</p>
            {product.feature_bullets?.length > 0 && (
              <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                {product.feature_bullets.map((bullet) => (
                  <li key={bullet} className="flex items-start gap-2.5 text-sm text-foreground-muted">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    {bullet}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="bg-brand">
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
          <h2 className="text-3xl font-bold tracking-tight text-brand-foreground md:text-4xl">
            Need something like {product.name}?
          </h2>
          <p className="mx-auto mt-4 max-w-[55ch] text-brand-foreground/80">
            We built this one for ourselves — we can build the equivalent for your business too.
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
