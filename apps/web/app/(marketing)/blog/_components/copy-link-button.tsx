"use client";

import { useState } from "react";
import { Check, Link2 } from "lucide-react";

// The one interactive bit of the share row: copies the post URL. Falls back
// silently (the other share links still work) if the clipboard is blocked.
export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable — nothing to do */
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Link copied" : "Copy link to this post"}
      className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-raised px-3 text-sm font-medium text-foreground-muted transition-colors duration-fast ease-standard hover:border-brand/40 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      {copied ? <Check className="h-4 w-4 text-success" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
