import Image from "next/image";
import { Github, Linkedin, Twitter } from "lucide-react";
import type { TeamMember } from "@repo/shared/types";
import { Badge } from "@/components/ui/badge";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

// One admin-managed team member: a circular portrait inside a dashed
// "orbit" ring over a soft brand/accent wash, name, role pill, and
// icon-only social buttons. Every social is optional — a button renders
// only for links that are set — and a member with no photo gets an
// initials fallback instead of a broken image. Lives with the /team route
// until a second page needs it (code-standards.md §3).
export function TeamMemberCard({ member }: { member: TeamMember }) {
  const socials = [
    { href: member.github_url, icon: Github, label: "GitHub" },
    { href: member.linkedin_url, icon: Linkedin, label: "LinkedIn" },
    { href: member.twitter_url, icon: Twitter, label: "X" },
  ].filter((social) => social.href);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-surface-raised shadow-sm transition-all duration-standard ease-standard hover:-translate-y-1 hover:border-brand/40 hover:shadow-lg">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-28 bg-gradient-to-br from-brand/15 via-brand/5 to-accent/15"
      />

      <div className="relative flex flex-1 flex-col items-center px-6 pb-6 pt-9 text-center">
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute -inset-2 rounded-full border border-dashed border-brand/40 transition-transform duration-slow ease-standard group-hover:rotate-45"
          />
          <div className="relative h-32 w-32 overflow-hidden rounded-full bg-brand/10 shadow-md ring-4 ring-surface-raised sm:h-36 sm:w-36">
            {member.photo_url ? (
              // unoptimized: an uploaded photo lives on the storage origin,
              // which next/image would need allow-listing in next.config
              // for — and a small portrait doesn't need resizing.
              <Image
                src={member.photo_url}
                alt={`${member.name}, ${member.role}`}
                fill
                unoptimized
                className="object-cover object-top"
                sizes="144px"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-full w-full items-center justify-center text-4xl font-bold text-brand"
              >
                {initials(member.name)}
              </div>
            )}
          </div>
        </div>

        <h3 className="mt-6 text-lg font-semibold text-foreground">{member.name}</h3>
        <Badge variant="brand" className="mt-2">
          {member.role}
        </Badge>

        {socials.length > 0 && (
          <div className="mt-auto w-full pt-5">
            <div className="flex items-center justify-center gap-1 border-t border-border pt-4">
              {socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${member.name} on ${social.label}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-foreground-muted transition-colors duration-fast ease-standard hover:bg-brand/10 hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <social.icon className="h-4 w-4" />
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
