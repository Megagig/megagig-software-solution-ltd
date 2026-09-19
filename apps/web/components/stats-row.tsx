import type { Stat } from "@repo/shared/types";
import { StatCallout } from "@/components/ui/stat-callout";
import { cn } from "@/lib/utils";

// Static class strings so Tailwind can see them — a dynamic
// `sm:grid-cols-${n}` would never be generated.
const COLUMNS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

// ui-rules.md §10: 2-4 stats per section, real numbers only. The stats are
// admin-managed (Stat resource, lib/stats.ts); this only decides how many
// to show. Renders nothing when there are none, so an empty list never
// leaves a blank gap.
export function StatsRow({
  stats,
  max = 4,
  className,
}: {
  stats: Stat[];
  max?: number;
  className?: string;
}) {
  const shown = stats.slice(0, Math.min(max, 4));
  if (shown.length === 0) return null;

  return (
    <div className={cn("mx-auto grid max-w-3xl grid-cols-2 gap-8", COLUMNS[shown.length], className)}>
      {shown.map((stat) => (
        <StatCallout key={stat.id} value={stat.value} label={stat.label} />
      ))}
    </div>
  );
}
