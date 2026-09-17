"use client";

import { ArrowUp } from "lucide-react";

export function BackToTop() {
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      className="inline-flex items-center gap-1.5 text-xs text-foreground-subtle hover:text-foreground transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
    >
      <ArrowUp className="h-3.5 w-3.5" />
      Back to top
    </button>
  );
}
