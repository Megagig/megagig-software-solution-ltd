import type { Metadata } from "next";
import { LeadForm } from "@/components/lead-form";
import { getServiceBySlug } from "@/lib/services";

export const metadata: Metadata = {
  title: "Start a Project",
  description: "Tell us what you're building — we'll reply within 24 hours with next steps.",
};

// Primary conversion form per project-requirements.md §5.6 — full
// LeadForm variant (CreateLeadSchema's complete field set). `?service=`
// pre-fills the project-type dropdown when arriving from a Services
// detail page or a pricing card CTA, via the defaultProjectType prop
// already anticipated in library-docs.md's "one LeadForm" convention.
// Lead.Create is still protected-only until Phase 6 (rate limiting/spam
// mitigation) — this form builds and validates correctly but will 401 on
// submit until then, same accepted forward-reference pattern used
// throughout Phase 4.
export default async function StartProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const { service } = await searchParams;
  const defaultProjectType = service ? getServiceBySlug(service)?.title : undefined;

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <div className="mx-auto max-w-xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand">Start a project</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
              Let&apos;s build something your team actually uses
            </h1>
            <p className="mt-4 text-lg text-foreground-muted">
              Tell us what you&apos;re building — we&apos;ll reply within 24 hours with next steps.
            </p>
          </div>
          <div className="mt-10">
            <LeadForm source="start-project" variant="full" defaultProjectType={defaultProjectType} />
          </div>
        </div>
      </div>
    </section>
  );
}
