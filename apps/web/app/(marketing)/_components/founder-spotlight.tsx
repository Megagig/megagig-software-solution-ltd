import Image from "next/image";
import { Github, Linkedin, Twitter } from "lucide-react";
import type { SiteSettings } from "@repo/shared/types";
import { Button } from "@/components/ui/button";
import { splitParagraphs } from "@/lib/text";

type FounderSettings = Pick<
  SiteSettings,
  | "founder_name"
  | "founder_role"
  | "founder_quote"
  | "founder_bio"
  | "founder_photo_url"
  | "founder_github_url"
  | "founder_linkedin_url"
  | "founder_twitter_url"
>;

/** True when there is anything to show — pages use this to decide the
 * section's position (and so its background tone) before rendering it. */
export function hasFounderContent(founder: FounderSettings | null | undefined): boolean {
  if (!founder) return false;
  return Boolean(founder.founder_name || founder.founder_quote || splitParagraphs(founder.founder_bio).length > 0);
}

// Founder profile is admin-managed (SiteSettings "About & founder" card) —
// nothing is hard-coded here. Every part is conditional so a blank field
// hides its piece instead of leaving an empty gap; the whole section hides
// when there is no name, quote or bio at all.
export function FounderSpotlight({
  founder,
  tone = "background",
}: {
  founder: FounderSettings | null | undefined;
  /** Home always uses the default; /about-us picks by position so the
   * page's background/surface alternation survives hidden sections. */
  tone?: "background" | "surface";
}) {
  if (!founder || !hasFounderContent(founder)) return null;

  const paragraphs = splitParagraphs(founder.founder_bio);

  const links = [
    { href: founder.founder_github_url, icon: Github, label: "GitHub" },
    { href: founder.founder_linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { href: founder.founder_twitter_url, icon: Twitter, label: "X" },
  ].filter((link) => link.href);

  return (
    <section className={tone === "surface" ? "bg-surface" : "bg-background"}>
      <div className="mx-auto grid max-w-(--space-container-max) gap-10 px-(--space-container-x) py-(--space-section-y-mobile) md:grid-cols-[minmax(0,280px)_1fr] md:items-start md:py-(--space-section-y)">
        {founder.founder_photo_url && (
          <div className="relative mx-auto aspect-square w-48 overflow-hidden rounded-lg border border-border md:w-full">
            {/* unoptimized: an uploaded photo lives on the storage origin,
                which next/image would otherwise need allow-listing in
                next.config for — and a single portrait doesn't need resizing. */}
            <Image
              src={founder.founder_photo_url}
              alt={
                founder.founder_name
                  ? `${founder.founder_name}${founder.founder_role ? `, ${founder.founder_role}` : ""}`
                  : "Founder portrait"
              }
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 768px) 192px, 280px"
            />
          </div>
        )}

        <div className={founder.founder_photo_url ? undefined : "md:col-span-2"}>
          <p className="text-xs font-medium uppercase tracking-wide text-brand">Founder spotlight</p>
          {founder.founder_quote && (
            <p className="mt-3 text-2xl font-medium leading-snug text-foreground">
              &ldquo;{founder.founder_quote}&rdquo;
            </p>
          )}

          {paragraphs.length > 0 && (
            <div className="mt-6 space-y-4 text-foreground-muted">
              {paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          )}

          {founder.founder_name && (
            <p className="mt-6 font-semibold text-foreground">
              {founder.founder_name}
              {founder.founder_role && (
                <span className="block text-sm font-normal text-foreground-muted">{founder.founder_role}</span>
              )}
            </p>
          )}

          {links.length > 0 && (
            <div className="mt-5 flex items-center gap-2">
              {links.map((link) => (
                <a key={link.label} href={link.href} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" className="gap-1.5">
                    <link.icon className="h-4 w-4" /> {link.label}
                  </Button>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
