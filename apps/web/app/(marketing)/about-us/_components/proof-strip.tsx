import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CaseStudy, Product } from "@repo/shared/types";
import { CaseStudyCard } from "@/components/case-study-card";
import { ProductCard } from "@/components/product-card";
import { SectionHeading } from "@/components/ui/section-heading";
import { AboutSection, type SectionTone } from "./about-section";

// Evidence over decoration (ui-rules.md §1): the About page's claims are
// backed by the same real, admin-managed products and case studies the rest
// of the site uses — no new content. Each half hides when it has nothing.
export function ProofStrip({
  products,
  caseStudies,
  tone,
}: {
  products: Product[];
  caseStudies: CaseStudy[];
  tone: SectionTone;
}) {
  if (products.length === 0 && caseStudies.length === 0) return null;

  return (
    <AboutSection tone={tone}>
      <SectionHeading
        eyebrow="Our work"
        title="Built and running in production"
        subhead="The products we operate ourselves and the client work we've shipped."
        align="center"
      />

      {products.length > 0 && (
        <div className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-xl font-semibold text-foreground">Our products</h3>
            <ViewAll href="/products" label="All products" />
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}

      {caseStudies.length > 0 && (
        <div className="mt-16">
          <div className="flex items-end justify-between gap-4">
            <h3 className="text-xl font-semibold text-foreground">Client work</h3>
            <ViewAll href="/case-studies" label="All case studies" />
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((caseStudy, index) => (
              <CaseStudyCard key={caseStudy.id} caseStudy={caseStudy} index={index} />
            ))}
          </div>
        </div>
      )}
    </AboutSection>
  );
}

function ViewAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="group inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand hover:underline">
      {label} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}
