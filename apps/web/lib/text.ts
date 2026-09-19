/**
 * Splits admin-entered long text into paragraphs on blank lines, trimming
 * each and dropping empties. Used wherever a SiteSettings text field
 * (founder bio, founding story) is edited as one textarea but rendered as
 * separate paragraphs.
 */
export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}
