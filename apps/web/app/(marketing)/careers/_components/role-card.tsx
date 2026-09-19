import { Building2, ChevronDown, MapPin } from "lucide-react";
import type { JobOpening } from "@repo/shared/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getApplyHref } from "@/lib/job-openings";
import { splitParagraphs } from "@/lib/text";

interface RoleCardProps {
  role: JobOpening;
  contactEmail?: string | null;
  /** Start expanded — used when there is only one open role. */
  defaultOpen?: boolean;
}

// One open role, expanding in place (no per-role page — JobOpening has no
// slug). A native <details>/<summary> gives keyboard- and screen-reader-
// correct disclosure with no client JavaScript, so this stays a Server
// Component. Apply goes to the role's own apply_url, or falls back to the
// general CV email (lib/job-openings.ts getApplyHref).
export function RoleCard({ role, contactEmail, defaultOpen = false }: RoleCardProps) {
  const paragraphs = splitParagraphs(role.description ?? "");
  const applyHref = getApplyHref(role, contactEmail);
  const isExternal = /^https?:\/\//i.test(applyHref);

  return (
    <details
      open={defaultOpen}
      className="group rounded-xl border border-border bg-surface-raised shadow-sm transition-colors duration-standard ease-standard open:border-brand/40 hover:border-brand/40"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-xl p-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:p-6 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h3 className="text-lg font-semibold text-foreground sm:text-xl">{role.title}</h3>
            <Badge variant="brand">{role.employment_type}</Badge>
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-foreground-muted">
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-4 w-4" aria-hidden="true" /> {role.department}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4" aria-hidden="true" /> {role.location}
            </span>
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-brand">
          <span className="hidden sm:inline group-open:hidden">View details</span>
          <span className="hidden group-open:sm:inline">Hide details</span>
          <ChevronDown
            className="h-5 w-5 transition-transform duration-standard ease-standard group-open:rotate-180"
            aria-hidden="true"
          />
        </span>
      </summary>

      <div className="border-t border-border px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
        {paragraphs.length > 0 && (
          <div className="max-w-[65ch] space-y-4 leading-relaxed text-foreground-muted">
            {paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        )}
        <a
          href={applyHref}
          {...(isExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className={paragraphs.length > 0 ? "mt-6 inline-block" : "inline-block"}
        >
          <Button>Apply for this role</Button>
        </a>
      </div>
    </details>
  );
}
