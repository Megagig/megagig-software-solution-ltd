import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCvHref } from "@/lib/job-openings";

// Closing call to action for job seekers — replaces the client-facing quote
// band, which is wrong for this audience. The single "Send your CV" CTA on
// the page: a mailto to the Site Settings contact email (no upload, out of
// scope for v1), or the contact page when no email is configured.
export function CvBand({ contactEmail }: { contactEmail?: string | null }) {
  return (
    <section className="bg-brand">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) text-center md:py-(--space-section-y)">
        <h2 className="text-3xl font-bold tracking-tight text-brand-foreground md:text-4xl">
          Don&apos;t see the right role?
        </h2>
        <p className="mx-auto mt-4 max-w-[65ch] text-lg text-brand-foreground/80">
          Send us your CV and tell us what you&apos;d like to work on. Include a link to something you&apos;ve built if
          you can.
        </p>
        <div className="mt-8 flex justify-center">
          <a href={getCvHref(contactEmail)}>
            <Button size="lg" className="bg-brand-foreground text-brand hover:shadow-none hover:translate-y-0">
              Send your CV
            </Button>
          </a>
        </div>
        {contactEmail && (
          <p className="mt-6 text-sm text-brand-foreground/80">
            <a href={`mailto:${contactEmail}`} className="inline-flex items-center gap-1.5 hover:text-brand-foreground">
              <Mail className="h-4 w-4" aria-hidden="true" /> {contactEmail}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
