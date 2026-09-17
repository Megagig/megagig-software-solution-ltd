import { cn } from "@/lib/utils";

interface TechIconProps {
  icon: React.ReactNode;
  label: string;
  className?: string;
}

// Per ui-rules.md §11: grayscale/muted at rest, full color on hover,
// monospace label. A single strip item — TechStackStrip below lays out
// the full row.
export function TechIcon({ icon, label, className }: TechIconProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 text-foreground-subtle opacity-70 grayscale transition-all duration-standard ease-standard hover:text-foreground hover:opacity-100 hover:grayscale-0",
        className
      )}
    >
      <div className="flex h-9 w-9 items-center justify-center sm:h-10 sm:w-10">
        {icon}
      </div>
      <span className="font-mono text-sm">{label}</span>
    </div>
  );
}

interface TechStackStripProps {
  items: { icon: React.ReactNode; label: string }[];
  className?: string;
}

// Wraps to multiple rows on mobile rather than horizontally scrolling,
// per ui-rules.md §11.
export function TechStackStrip({ items, className }: TechStackStripProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-center gap-x-10 gap-y-6",
        className
      )}
    >
      {items.map((item) => (
        <TechIcon key={item.label} icon={item.icon} label={item.label} />
      ))}
    </div>
  );
}
