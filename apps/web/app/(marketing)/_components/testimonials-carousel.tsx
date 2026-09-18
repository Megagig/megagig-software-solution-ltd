import type { Testimonial } from "@repo/shared/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { Carousel } from "@/components/ui/carousel";

interface TestimonialsCarouselProps {
  testimonials: Testimonial[];
}

// Per ui-rules.md §5: quote text large, avatar + author/role/company,
// company name is a real outbound link — omitted (never faked) if a
// testimonial has no verifiable company URL.
export function TestimonialsCarousel({ testimonials }: TestimonialsCarouselProps) {
  if (testimonials.length === 0) return null;

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="What clients say" title="Testimonials" align="center" />
        <div className="mx-auto mt-10 max-w-2xl">
          <Carousel>
            {testimonials.map((t) => (
              <div key={t.id} className="px-4 text-center">
                <p className="text-lg leading-snug text-foreground">&ldquo;{t.quote_text}&rdquo;</p>
                <div className="mt-6 flex flex-col items-center gap-1">
                  <p className="font-semibold text-foreground">{t.author_name}</p>
                  <p className="text-sm text-foreground-muted">
                    {t.author_role}
                    {t.company_name ? `, ${t.company_name}` : ""}
                  </p>
                  {t.company_url && (
                    <a
                      href={t.company_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 text-sm text-brand hover:underline"
                    >
                      Visit {t.company_name}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
