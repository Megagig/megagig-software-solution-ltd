import { Mail, Phone, MapPin } from "lucide-react";
import { LeadForm } from "@/components/lead-form";

interface ContactBlockProps {
  contactEmail?: string | null;
  contactPhone?: string | null;
  address?: string | null;
}

// Single solid-`bg-brand` panel per the user's reference — replaces the
// earlier plain two-column section-on-surface layout. Our own token pair
// (brand panel / accent submit button) stands in for the reference site's
// bright-panel-plus-contrasting-button technique.
export function ContactBlock({ contactEmail, contactPhone, address }: ContactBlockProps) {
  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <div className="grid gap-10 overflow-hidden rounded-3xl bg-brand p-8 md:grid-cols-2 md:gap-16 md:p-14">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-foreground/70">Get in touch</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-brand-foreground md:text-5xl">
              Let&apos;s build something <span className="italic">that works</span>.
            </h2>
            <p className="mt-4 max-w-[45ch] text-brand-foreground/80">
              Tell us what you&apos;re building — we&apos;ll reply within 24 hours with next steps.
            </p>
            <div className="mt-8 space-y-4">
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="flex min-w-0 items-center gap-3 font-medium text-brand-foreground/90 hover:text-brand-foreground"
                >
                  <Mail className="h-5 w-5 shrink-0" /> <span className="break-all">{contactEmail}</span>
                </a>
              )}
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="flex min-w-0 items-center gap-3 font-medium text-brand-foreground/90 hover:text-brand-foreground"
                >
                  <Phone className="h-5 w-5 shrink-0" /> <span className="break-all">{contactPhone}</span>
                </a>
              )}
              {address && (
                <p className="flex min-w-0 items-center gap-3 font-medium text-brand-foreground/90">
                  <MapPin className="h-5 w-5 shrink-0" /> <span className="break-all">{address}</span>
                </p>
              )}
            </div>
          </div>
          <LeadForm source="home" tone="onBrand" />
        </div>
      </div>
    </section>
  );
}
