import type { Metadata } from "next";
import { Users } from "lucide-react";
import { getSiteSettings } from "@/lib/site-settings";
import { getPublishedStats } from "@/lib/stats";
import { getPublishedTeamMembers } from "@/lib/team-members";
import { QuoteCtaBand } from "../_components/quote-cta-band";
import { TeamHero } from "./_components/team-hero";
import { TeamStory } from "./_components/team-story";
import { TeamMemberCard } from "./_components/team-member-card";

export const metadata: Metadata = {
  title: "Team",
  description:
    "Meet the Nigerian engineers behind Megagig Software Solution — the people who design, build and support the software we ship.",
};

// project-requirements.md §5.8 — Team. Everything on the page is
// admin-managed (TeamMember, Stat, and SiteSettings mission/address/story);
// nothing is hard-coded. Optional blocks (hero description, location, stats,
// founding story) simply hide when their data is empty, and the section
// background tones are assigned by position so the alternation holds either way.
export default async function TeamPage() {
  const [members, settings, stats] = await Promise.all([
    getPublishedTeamMembers(),
    getSiteSettings(),
    getPublishedStats(),
  ]);

  const hasStory = Boolean(settings?.founding_story?.trim());

  return (
    <>
      <TeamHero missionStatement={settings?.mission_statement} location={settings?.address} stats={stats} />

      {hasStory && <TeamStory story={settings?.founding_story ?? ""} />}

      {/* Hero is bg-background; the story (when shown) is bg-surface, so the
          team section takes whichever tone keeps the alternation. */}
      <section id="team" className={`scroll-mt-24 ${hasStory ? "bg-background" : "bg-surface"}`}>
        <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
          <div className="mx-auto max-w-2xl text-center">
            <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
              <Users className="h-4 w-4" aria-hidden="true" /> Our team
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              The people building software for Nigerian businesses
            </h2>
            <p className="mt-4 text-lg text-foreground-muted">
              Engineers and builders who design, ship and support everything we deliver.
            </p>
          </div>

          {members.length > 0 ? (
            // Flex-wrap + fixed column widths (not a grid) so an odd number
            // of members stays centred instead of hugging the left edge.
            <div className="mt-12 flex flex-wrap justify-center gap-6">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="w-full max-w-sm sm:w-[calc(50%-0.75rem)] sm:max-w-none lg:w-[calc(25%-1.125rem)]"
                >
                  <TeamMemberCard member={member} />
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-12 text-center text-lg text-foreground-muted">Our team profiles are coming soon.</p>
          )}
        </div>
      </section>

      <QuoteCtaBand
        whatsAppNumber={settings?.whatsapp_number}
        contactEmail={settings?.contact_email}
        contactPhone={settings?.contact_phone}
      />
    </>
  );
}
