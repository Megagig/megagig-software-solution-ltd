import { SectionHeading } from "@/components/ui/section-heading";
import { splitParagraphs } from "@/lib/text";

// Centred long-form block under the hero — the founding story, shared with
// /about-us (SiteSettings founding_story, admin-managed). Hidden when empty
// rather than filled with invented copy.
export function TeamStory({ story }: { story: string }) {
  const paragraphs = splitParagraphs(story);
  if (paragraphs.length === 0) return null;

  return (
    <section className="bg-surface">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="Our story" title="How Megagig began" align="center" />
        <div className="mx-auto mt-8 max-w-3xl space-y-5 text-center text-lg leading-relaxed text-foreground-muted">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
