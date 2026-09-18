import Image from "next/image";
import Link from "next/link";
import { CheckCircle2, ArrowRight } from "lucide-react";
import type { Product } from "@repo/shared/types";
import { Card } from "@/components/ui/card";
import { BrowserFrame } from "@/components/ui/browser-frame";
import { getScreenshotForSlug } from "@/lib/product-screenshots";

interface ProductCardProps {
  product: Product;
}

// Shared by Home's ProductsSection and the /products index — extracted
// once a second real consumer needed the identical card, per
// code-standards.md §3. The screenshot/title link internally to
// /product/[slug] (Phase 4.3); "Explore product" stays the distinct
// outbound link to the live product site, per ui-rules.md §5.
export function ProductCard({ product }: ProductCardProps) {
  const screenshot = getScreenshotForSlug(product.slug);

  return (
    <Card className="group overflow-hidden p-0 transition-colors duration-standard ease-standard hover:border-brand/40">
      {screenshot && (
        <Link href={`/product/${product.slug}`} className="block p-4 pb-0">
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
        </Link>
      )}
      <div className="p-6">
        <Link href={`/product/${product.slug}`}>
          <h3 className="text-xl font-semibold text-foreground hover:text-brand">{product.name}</h3>
        </Link>
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
}
