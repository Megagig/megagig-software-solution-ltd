import { Linkedin, MessageCircle, Twitter } from "lucide-react";
import { CopyLinkButton } from "./copy-link-button";

const buttonClass =
  "inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface-raised px-3 text-sm font-medium text-foreground-muted transition-colors duration-fast ease-standard hover:border-brand/40 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

// Share row: WhatsApp first (the dominant channel for our audience), then X
// and LinkedIn as plain outbound links, plus copy-link. Only the copy button
// needs client JavaScript.
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);

  const links = [
    { href: `https://wa.me/?text=${t}%20${u}`, label: "WhatsApp", icon: MessageCircle },
    { href: `https://twitter.com/intent/tweet?url=${u}&text=${t}`, label: "X", icon: Twitter },
    { href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`, label: "LinkedIn", icon: Linkedin },
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-sm font-medium text-foreground">Share</span>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Share on ${link.label}`}
          className={buttonClass}
        >
          <link.icon className="h-4 w-4" aria-hidden="true" />
          {link.label}
        </a>
      ))}
      <CopyLinkButton url={url} />
    </div>
  );
}
