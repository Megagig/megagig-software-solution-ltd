import Image from "next/image";
import Link from "next/link";
import type { Blog } from "@repo/shared/types";

// Shown under a post only when an author (a TeamMember) is assigned; a post
// credited to the company gets no box. Links to /team.
export function AuthorBox({ author }: { author: Blog["author"] }) {
  if (!author?.name) return null;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-surface-raised p-5">
      {author.photo_url ? (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-brand/10 ring-2 ring-surface-raised">
          <Image src={author.photo_url} alt={author.name} fill unoptimized className="object-cover object-top" sizes="64px" />
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">Written by</p>
        <p className="mt-0.5 font-semibold text-foreground">{author.name}</p>
        {author.role && <p className="text-sm text-foreground-muted">{author.role}</p>}
        <Link href="/team" className="mt-1 inline-block text-sm font-medium text-brand hover:underline">
          Meet the team
        </Link>
      </div>
    </div>
  );
}
