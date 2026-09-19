import type { Metadata } from "next";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { LeadForm } from "@/components/lead-form";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with Megagig Software Solution — email, phone, WhatsApp, or send us a message.",
};

// Primary contact page per project-requirements.md §5.7 — same lead form
// as /start-project (full CreateLeadSchema variant) tagged source: contact,
// plus direct-contact info. Reuses ContactBlock's exact single bg-brand
// panel visual language (Home) rather than a new layout, per the user's
// explicit choice for consistency. Embedded map is explicitly "optional,
// v2" in the spec — not built. WhatsApp deep link added here (ContactBlock
// doesn't have one) using the same wa.me pattern as WhatsAppFab.
export default async function ContactUsPage() {
  const settings = await getSiteSettings();
  const whatsappDigits = settings?.whatsapp_number?.replace(/[^\d]/g, "");

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <div className="grid gap-10 overflow-hidden rounded-3xl bg-brand p-8 md:grid-cols-2 md:gap-16 md:p-14">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-foreground/70">Get in touch</p>
            <h2 className="mt-3 text-4xl font-bold tracking-tight text-brand-foreground md:text-5xl">
              Let&apos;s talk about your project
            </h2>
            <p className="mt-4 max-w-[45ch] text-brand-foreground/80">
              Reach out directly, or send us the details below — we&apos;ll reply within 24 hours.
            </p>
            <div className="mt-8 space-y-4">
              {settings?.contact_email && (
                <a
                  href={`mailto:${settings.contact_email}`}
                  className="flex min-w-0 items-center gap-3 font-medium text-brand-foreground/90 hover:text-brand-foreground"
                >
                  <Mail className="h-5 w-5 shrink-0" /> <span className="break-all">{settings.contact_email}</span>
                </a>
              )}
              {settings?.contact_phone && (
                <a
                  href={`tel:${settings.contact_phone}`}
                  className="flex min-w-0 items-center gap-3 font-medium text-brand-foreground/90 hover:text-brand-foreground"
                >
                  <Phone className="h-5 w-5 shrink-0" /> <span className="break-all">{settings.contact_phone}</span>
                </a>
              )}
              {whatsappDigits && (
                <a
                  href={`https://wa.me/${whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-3 font-medium text-brand-foreground/90 hover:text-brand-foreground"
                >
                  <MessageCircle className="h-5 w-5 shrink-0" /> <span className="break-all">Chat on WhatsApp</span>
                </a>
              )}
              {settings?.address && (
                <p className="flex min-w-0 items-center gap-3 font-medium text-brand-foreground/90">
                  <MapPin className="h-5 w-5 shrink-0" /> <span className="break-all">{settings.address}</span>
                </p>
              )}
            </div>
          </div>
          <LeadForm source="contact" tone="onBrand" variant="full" />
        </div>
      </div>
    </section>
  );
}
