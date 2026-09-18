import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { Product } from "@repo/shared/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { Card } from "@/components/ui/card";
import { BrowserFrame } from "@/components/ui/browser-frame";
import { getScreenshotForSlug } from "@/lib/product-screenshots";

interface ProductsSectionProps {
  products: Product[];
}

// Megagig's own shipped products, per project-requirements.md §5.1/§5.3.
export function ProductsSection({ products }: ProductsSectionProps) {
  if (products.length === 0) return null;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="Built by us, running in production" title="Our products" align="center" />
        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {products.map((product) => {
            const screenshot = getScreenshotForSlug(product.slug);
            return (
              <Card
                key={product.id}
                className="group overflow-hidden p-0 transition-colors duration-standard ease-standard hover:border-brand/40"
              >
                {screenshot && (
                  <div className="p-4 pb-0">
                    <BrowserFrame
                      url={product.live_url.replace(/^https?:\/\//, "")}
                      tone="dark"
                      bezel="thick"
                      className="transition-all duration-standard ease-standard group-hover:-translate-y-1 group-hover:shadow-2xl"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden">
                        <Image
                          src={screenshot}
                          alt={`${product.name} screenshot`}
                          fill
                          className="object-cover object-top transition-transform duration-slow ease-standard group-hover:scale-[1.06]"
                          sizes="(max-width: 768px) 100vw, 500px"
                        />
                      </div>
                    </BrowserFrame>
                  </div>
                )}
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-foreground">{product.name}</h3>
                  <p className="mt-1 text-sm text-foreground-muted">{product.tagline}</p>
                  <ul className="mt-4 space-y-2">
                    {product.feature_bullets?.slice(0, 4).map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm text-foreground-muted">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={product.live_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
                  >
                    Explore product <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
