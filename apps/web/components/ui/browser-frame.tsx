import { cn } from "@/lib/utils";

interface BrowserFrameProps {
  url?: string;
  children: React.ReactNode;
  tone?: "surface" | "dark";
  /** "thick" gives a chunkier bezel + chrome bar — used where the frame
   * itself is the focal point of the section (CaseStudyPreview) rather
   * than a supporting visual inside an already-bordered Card. */
  bezel?: "thin" | "thick";
  className?: string;
}

// A lightweight fake-browser-chrome wrapper around a screenshot — traffic
// lights + optional URL bar, rounded corners, shadow. Used consistently
// wherever a real product screenshot appears (showcase strip, case study
// cards, product cards, featured projects) so imagery reads as "real
// product, framed" rather than a bare bordered box.
export function BrowserFrame({ url, children, tone = "surface", bezel = "thin", className }: BrowserFrameProps) {
  const dark = tone === "dark";
  const thick = bezel === "thick";

  return (
    <div
      className={cn(
        "overflow-hidden shadow-xl",
        thick ? "rounded-[28px] border-[3px]" : "rounded-2xl border",
        dark ? "border-white/10 bg-[#0b0f19]" : "border-border bg-surface-raised",
        className
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2 border-b",
          thick ? "px-4 py-3" : "px-3 py-2",
          dark ? "border-white/10" : "border-border"
        )}
      >
        <span className={cn("rounded-full bg-danger/60", thick ? "h-3 w-3" : "h-2.5 w-2.5")} />
        <span className={cn("rounded-full bg-warning/60", thick ? "h-3 w-3" : "h-2.5 w-2.5")} />
        <span className={cn("rounded-full bg-success/60", thick ? "h-3 w-3" : "h-2.5 w-2.5")} />
        {url && (
          <span
            className={cn(
              "ml-2 truncate rounded-full px-3 py-0.5 text-xs",
              dark ? "bg-white/5 text-white/50" : "bg-surface text-foreground-subtle"
            )}
          >
            {url}
          </span>
        )}
      </div>
      <div className={cn("relative", thick && "p-3")}>
        <div className={cn(thick && "overflow-hidden rounded-lg")}>{children}</div>
      </div>
    </div>
  );
}
