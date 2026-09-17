import { cn } from "@/lib/utils";

interface StatCalloutProps {
  value: string;
  label: string;
  tone?: "brand" | "foreground";
  size?: "md" | "lg";
  className?: string;
}

// Per ui-rules.md §10: large number + short uppercase label beneath.
// Used sparingly (2-4 per section), real numbers only.
export function StatCallout({
  value,
  label,
  tone = "brand",
  size = "md",
  className,
}: StatCalloutProps) {
  return (
    <div className={cn("text-center", className)}>
      <p
        className={cn(
          "font-bold tracking-tight",
          size === "lg" ? "text-5xl" : "text-4xl",
          tone === "brand" ? "text-brand" : "text-foreground"
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm uppercase tracking-wide text-foreground-muted">
        {label}
      </p>
    </div>
  );
}
