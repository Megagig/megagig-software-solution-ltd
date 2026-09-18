import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subhead?: string;
  align?: "left" | "center";
  /** For a section with a hardcoded dark panel background (e.g.
   * FeaturedProjects) that doesn't follow the site's own light/dark theme
   * token — swaps title/subhead to explicit white so they stay legible
   * against that fixed dark bg regardless of the site's active theme. */
  invert?: boolean;
  className?: string;
}

// Section anatomy per ui-rules.md §2: eyebrow -> heading -> subhead,
// subhead capped at ~65ch regardless of the section's own width.
export function SectionHeading({
  eyebrow,
  title,
  subhead,
  align = "left",
  invert = false,
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
      <h2
        className={cn(
          "text-3xl font-bold tracking-tight md:text-4xl",
          invert ? "text-white" : "text-foreground"
        )}
      >
        {title}
      </h2>
      {subhead && (
        <p
          className={cn(
            "mt-4 max-w-[65ch] text-lg",
            invert ? "text-white/60" : "text-foreground-muted",
            centered && "mx-auto"
          )}
        >
          {subhead}
        </p>
      )}
    </div>
  );
}
