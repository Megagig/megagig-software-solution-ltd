import Link from "next/link";
import { Github, Linkedin, Youtube, Facebook, Twitter, Mail, Phone } from "lucide-react";
import { brand } from "@repo/shared/brand";
import type { SocialLinks } from "@repo/shared/types";
import { BackToTop } from "@/components/back-to-top";

interface FooterProps {
  contactEmail?: string | null;
  contactPhone?: string | null;
  socialLinks?: SocialLinks | null;
}

const sitemap = [
  {
    heading: "Services",
    links: [
      { href: "/services", label: "Services" },
      { href: "/case-studies", label: "Case Studies" },
    ],
  },
  {
    heading: "Products",
    links: [
      { href: "/products", label: "Products" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/privacy", label: "Privacy" },
      { href: "/legal", label: "Legal" },
    ],
  },
  {
    heading: "Company",
    links: [
      { href: "/about-us", label: "About Us" },
      { href: "/team", label: "Team" },
      { href: "/careers", label: "Careers" },
      { href: "/contact-us", label: "Contact" },
    ],
  },
];

const socialIcons: Record<keyof SocialLinks, typeof Github> = {
  github: Github,
  linkedin: Linkedin,
  youtube: Youtube,
  facebook: Facebook,
  twitter: Twitter,
};

// Present on every marketing page per project-requirements.md §5.11.
// Social links + contact info come from SiteSettings (admin-editable), not
// hardcoded, per architecture.md rule #5.
export function Footer({ contactEmail, contactPhone, socialLinks }: FooterProps) {
  const socialEntries = socialLinks
    ? (Object.entries(socialLinks) as [keyof SocialLinks, string | undefined][]).filter(
        ([, url]) => !!url
      )
    : [];

  return (
    <footer className="relative bg-surface">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand/50 to-transparent" />
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-20">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-5 lg:gap-8">
          <div className="col-span-2 lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand to-accent shadow-sm">
                <span className="text-brand-foreground font-mono font-bold text-sm">
                  {brand.logo.text}
                </span>
              </div>
              <span className="text-base font-bold tracking-tight text-foreground">
                {brand.name}
              </span>
            </Link>
            <div className="mt-5 space-y-3 text-sm">
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="group flex min-w-0 items-center gap-2.5 text-foreground-muted transition-colors hover:text-foreground"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                    <Mail className="h-4 w-4" />
                  </span>
                  <span className="break-all">{contactEmail}</span>
                </a>
              )}
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="group flex min-w-0 items-center gap-2.5 text-foreground-muted transition-colors hover:text-foreground"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                    <Phone className="h-4 w-4" />
                  </span>
                  <span className="break-all">{contactPhone}</span>
                </a>
              )}
            </div>
            {socialEntries.length > 0 && (
              <div className="mt-6 flex items-center gap-3">
                {socialEntries.map(([key, url]) => {
                  const Icon = socialIcons[key];
                  if (!Icon || !url) return null;
                  return (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={key}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised border border-border text-foreground-muted transition-all duration-standard ease-standard hover:-translate-y-0.5 hover:border-transparent hover:bg-brand hover:text-brand-foreground"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {sitemap.map((column) => (
            <div key={column.heading}>
              <h3 className="relative pl-3 text-xs font-semibold uppercase tracking-wide text-foreground-subtle before:absolute before:left-0 before:top-0.5 before:h-3 before:w-0.5 before:rounded-full before:bg-brand">
                {column.heading}
              </h3>
              <ul className="mt-4 space-y-3">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-foreground-muted transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-border pt-6 sm:flex-row sm:justify-between">
          <p className="text-xs text-foreground-subtle">
            &copy; {new Date().getFullYear()} {brand.name} Ltd. All rights reserved.
          </p>
          <BackToTop />
        </div>
      </div>
    </footer>
  );
}
