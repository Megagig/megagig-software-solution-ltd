import type { Metadata } from "next";
import { SectionHeading } from "@/components/ui/section-heading";
import { ProductCard } from "@/components/product-card";
import { getPublishedProducts } from "@/lib/products";

export const metadata: Metadata = {
  title: "Products",
  description: "PharmacyCopilot, BusinessCopilot, and Megagig's other own shipped products.",
};

export default async function ProductsIndexPage() {
  const products = await getPublishedProducts();

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="Built by us, running in production" title="Our products" align="center" />
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
