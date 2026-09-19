import Link from "next/link";
import { ArrowRight, Briefcase } from "lucide-react";
import type { JobOpening } from "@repo/shared/types";
import { PageSection, type SectionTone } from "@/components/page-section";
import { SectionHeading } from "@/components/ui/section-heading";
import { RoleCard } from "./role-card";

interface RolesSectionProps {
  roles: JobOpening[];
  contactEmail?: string | null;
  tone: SectionTone;
}

// The list of open roles — or, with none open, a designed empty state.
// The empty state is the expected launch state (build-plan.md: leave
// JobOpening empty at launch and verify it looks intentional), so it is a
// real panel with a next step, not a bare "nothing here" line.
export function RolesSection({ roles, contactEmail, tone }: RolesSectionProps) {
  return (
    <PageSection id="roles" tone={tone}>
      <SectionHeading
        eyebrow="Open roles"
        title={roles.length > 0 ? "Find your place on the team" : "No open roles right now"}
        subhead={
          roles.length > 0
            ? "Expand a role to see the details, then apply."
            : "We're not actively hiring at the moment, but we'd still like to hear from talented people."
        }
        align="center"
      />

      {roles.length > 0 ? (
        <div className="mx-auto mt-10 max-w-3xl space-y-4">
          {roles.map((role) => (
            <RoleCard key={role.id} role={role} contactEmail={contactEmail} defaultOpen={roles.length === 1} />
          ))}
        </div>
      ) : (
        <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center rounded-2xl border border-dashed border-border bg-surface-raised px-6 py-12 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand/10 text-brand">
            <Briefcase className="h-7 w-7" aria-hidden="true" />
          </span>
          <p className="mt-5 text-lg font-semibold text-foreground">Nothing open at the moment</p>
          <p className="mt-2 max-w-[48ch] text-foreground-muted">
            New roles are posted here as they open up. In the meantime, send us your CV below and tell us what
            you&apos;d like to work on.
          </p>
        </div>
      )}

      <p className="mt-8 text-center text-sm text-foreground-muted">
        Just starting out?{" "}
        <Link
          href="/services/it-training-internships"
          className="group inline-flex items-center gap-1 font-medium text-brand hover:underline"
        >
          Explore IT training &amp; internships
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </p>
    </PageSection>
  );
}
