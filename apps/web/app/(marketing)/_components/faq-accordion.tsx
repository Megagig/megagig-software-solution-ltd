import type { FAQ } from "@repo/shared/types";
import { SectionHeading } from "@/components/ui/section-heading";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

interface FaqAccordionProps {
  faqs: FAQ[];
}

// Pulls published FAQs; renders nothing if none are published yet
// (real FAQ content is Phase 5 — an empty accordion shell would look
// broken, not intentional, so the section is skipped entirely until
// there's real content).
export function FaqAccordion({ faqs }: FaqAccordionProps) {
  if (faqs.length === 0) return null;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-2xl px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="FAQ" title="Common questions" align="center" />
        <Accordion type="single" collapsible className="mt-10">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>{faq.answer}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
