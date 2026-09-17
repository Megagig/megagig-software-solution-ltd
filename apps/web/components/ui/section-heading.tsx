import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subhead?: string;
  align?: "left" | "center";
  className?: string;
}

// Section anatomy per ui-rules.md §2: eyebrow -> heading -> subhead,
// subhead capped at ~65ch regardless of the section's own width.
export function SectionHeading({
  eyebrow,
  title,
  subhead,
  align = "left",
  className,
}: SectionHeadingProps) {
  const centered = align === "center";

  return (
    <div className={cn(centered && "text-center", className)}>
      {eyebrow && (
        <p className="mb-3 text-xs font-medium uppercase tracking-wide text-brand">
          {eyebrow}
        </p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        {title}
      </h2>
      {subhead && (
        <p
          className={cn(
            "mt-4 max-w-[65ch] text-lg text-foreground-muted",
            centered && "mx-auto"
          )}
        >
          {subhead}
        </p>
      )}
    </div>
  );
}
