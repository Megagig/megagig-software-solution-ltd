import Link from "next/link";
import { MessageCircle, Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QuoteCtaBandProps {
  whatsAppNumber?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
}

export function QuoteCtaBand({ whatsAppNumber, contactEmail, contactPhone }: QuoteCtaBandProps) {
  const whatsappDigits = whatsAppNumber?.replace(/[^\d]/g, "");

  return (
    <section className="bg-brand">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        <h2 className="text-3xl font-bold tracking-tight text-brand-foreground md:text-4xl">
          Ready to start your project?
        </h2>
        <p className="mx-auto mt-4 max-w-[65ch] text-lg text-brand-foreground/80">
          Tell us what you're building — we'll get back to you within 24 hours with next steps.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/start-project">
            <Button
              size="lg"
              className="bg-brand-foreground text-brand hover:shadow-none hover:translate-y-0"
            >
              Request a Quote
            </Button>
          </Link>
          {whatsappDigits && (
            <a
              href={`https://wa.me/${whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-brand-foreground/30 px-6 py-3 text-sm font-semibold text-brand-foreground hover:bg-brand-foreground/10"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp us
            </a>
          )}
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-sm text-brand-foreground/80">
          {contactEmail && (
            <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 hover:text-brand-foreground">
              <Mail className="h-4 w-4" /> {contactEmail}
            </a>
          )}
          {contactPhone && (
            <a href={`tel:${contactPhone}`} className="flex items-center gap-1.5 hover:text-brand-foreground">
              <Phone className="h-4 w-4" /> {contactPhone}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
