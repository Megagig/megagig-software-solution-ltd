import { cn } from "@/lib/utils";

interface TabletFrameProps {
  children: React.ReactNode;
  ring?: "brand" | "accent" | "none";
  /** Adds a hover lift + shadow transition — only for frames that are
   * themselves wrapped in a link (CaseStudyPreview, FeaturedProjects'
   * main slide). Decorative/non-clickable frames (peek devices,
   * HeroShowcase) should leave this off — a hover effect on something
   * that isn't clickable is misleading. */
  interactive?: boolean;
  className?: string;
}

// Thick device-bezel wrapper for the tilted hero device composition —
// distinct from BrowserFrame's thin border + fake chrome bar (used for
// screenshots inline in cards/carousels elsewhere). This one reads as a
// physical tablet: a heavy uniform bezel, no added chrome bar (several of
// the real screenshots already carry their own window/browser chrome).
// The colored ring on the two "back" tablets uses our own brand/accent
// tokens rather than the reference's literal pink/purple hues — same
// "match the technique, not the exact color" approach used elsewhere.
//
// Bezel thickness (p-3.5) increased at the user's request, matching the
// reference image's visibly chunkier device border more closely than the
// original p-2.5.
export function TabletFrame({ children, ring = "none", interactive = false, className }: TabletFrameProps) {
  return (
    <div
      className={cn(
        "rounded-[28px] p-3.5 shadow-2xl transition-all duration-standard ease-standard",
        interactive && "hover:-translate-y-1 hover:shadow-[0_24px_48px_-12px_rgb(0_0_0_/_0.35)]",
        ring === "brand" && "bg-gradient-to-br from-brand to-accent",
        ring === "accent" && "bg-gradient-to-br from-accent to-brand",
        ring === "none" && "bg-[#0b0f19]",
        className
      )}
    >
      <div className="overflow-hidden rounded-[20px] bg-[#0b0f19]">{children}</div>
    </div>
  );
}
