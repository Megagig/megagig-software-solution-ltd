import { getSiteSettings } from "@/lib/site-settings";
import { getPublishedCaseStudies } from "@/lib/case-studies";
import { getPublishedProducts } from "@/lib/products";
import { getPublishedTestimonials } from "@/lib/testimonials";
import { getPublishedFAQs } from "@/lib/faqs";

import { Hero } from "./_components/hero";
import { FeaturedProjects } from "./_components/featured-projects";
import { CaseStudyPreview } from "./_components/case-study-preview";
import { TechStack } from "./_components/tech-stack";
import { ServicesGrid } from "./_components/services-grid";
import { ProductsSection } from "./_components/products-section";
import { SelectedWork } from "./_components/selected-work";
import { PricingTeaser } from "./_components/pricing-teaser";
import { QuoteCtaBand } from "./_components/quote-cta-band";
import { TestimonialsCarousel } from "./_components/testimonials-carousel";
import { FounderSpotlight } from "./_components/founder-spotlight";
import { OurStory } from "./_components/our-story";
import { FaqAccordion } from "./_components/faq-accordion";
import { ContactBlock } from "./_components/contact-block";
import { ClosingCta } from "./_components/closing-cta";

// Server Component — every section's data is fetched here and passed
// down as props, per library-docs.md's "server components for
// SEO-critical content" rule. Next dedupes the getSiteSettings() call
// against the identical one already made in (marketing)/layout.tsx.
export default async function HomePage() {
  const [settings, caseStudies, products, testimonials, faqs] = await Promise.all([
    getSiteSettings(),
    getPublishedCaseStudies(),
    getPublishedProducts(),
    getPublishedTestimonials(),
    getPublishedFAQs(),
  ]);

  return (
    <>
      <Hero headline={settings?.hero_headline} subhead={settings?.hero_subhead} />
      <FeaturedProjects caseStudies={caseStudies} />
      <CaseStudyPreview caseStudies={caseStudies} />
      <TechStack />
      <ServicesGrid />
      <ProductsSection products={products} />
      <SelectedWork caseStudies={caseStudies} />
      <PricingTeaser />
      <QuoteCtaBand
        whatsAppNumber={settings?.whatsapp_number}
        contactEmail={settings?.contact_email}
        contactPhone={settings?.contact_phone}
      />
      <TestimonialsCarousel testimonials={testimonials} />
      <FounderSpotlight />
      <OurStory />
      <FaqAccordion faqs={faqs} />
      <ContactBlock
        contactEmail={settings?.contact_email}
        contactPhone={settings?.contact_phone}
        address={settings?.address}
      />
      <ClosingCta />
    </>
  );
}
