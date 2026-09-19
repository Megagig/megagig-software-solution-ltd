import { SectionHeading } from "@/components/ui/section-heading";
import { AboutSection, type SectionTone } from "./about-section";

// Founding story — admin-managed long-form text (SiteSettings
// founding_story). Paragraphs are separated by a blank line.
export function AboutStory({ story, tone }: { story: string; tone: SectionTone }) {
  const paragraphs = story
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  if (paragraphs.length === 0) return null;

  return (
    <AboutSection tone={tone}>
      <div className="mx-auto max-w-2xl">
        <SectionHeading eyebrow="Our story" title="How Megagig began" />
        <div className="mt-6 space-y-5 text-lg leading-relaxed text-foreground-muted">
          {paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </div>
    </AboutSection>
  );
}
