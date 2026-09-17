import type { ReactNode } from "react";

// Lead.Status enum -> ui-tokens.md's --color-status-* tokens, 1:1, per
// ui-rules.md §13. Distinct from the generic BadgeCell (cell-renderers.tsx),
// whose color palette (accent/success/danger/...) doesn't cover this specific
// 5-value enum — arbitrary-value Tailwind syntax reads the CSS var directly
// so no raw hex/color class is ever hard-coded here.
const STATUS_LABEL: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  quoted: "Quoted",
  won: "Won",
  lost: "Lost",
};

// Renders a soft-tint pill for a Lead's status, called directly from the
// leads resource definition's cell: callback — see StackedCell for why
// this stays a plain function instead of a component used via JSX.
export function LeadStatusBadge({ status }: { status: string }): ReactNode {
  const token = `--color-status-${status}`;
  const label = STATUS_LABEL[status] ?? status;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, var(${token}) 12%, transparent)`,
        color: `var(${token})`,
      }}
    >
      {label}
    </span>
  );
}
