import Image from "next/image";
import Link from "next/link";
import type { CaseStudy } from "@repo/shared/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TabletFrame } from "@/components/ui/tablet-frame";
import { getScreenshotForSlug } from "@/lib/product-screenshots";
import { cn } from "@/lib/utils";

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
  /** Alternates the tilt direction and gradient ring color, matching the
   * Hero device showcase's own alternating pattern — purely a `% 2` index,
   * not tied to any per-card meaning. */
  index?: number;
}

// Shared by SelectedWork and the /case-studies index (moved here from
// (marketing)/_components/ once a second route-level consumer needed the
// identical card — per code-standards.md §3, same rule already applied to
// ServiceCard/ProductCard). Per ui-rules.md §5: category tags overlaid
// top-left, status badge, whole card clickable.
// Screenshot treatment matches HeroShowcase exactly (user request): a
// tilted TabletFrame with a brand/accent gradient ring, straightening out
// on hover — same primitive, same rotation/ring language as the hero.
export function CaseStudyCard({ caseStudy, index = 0 }: CaseStudyCardProps) {
  if (!caseStudy.published) return null;

  const screenshot = getScreenshotForSlug(caseStudy.slug);
  const tags = caseStudy.category_tags?.slice(0, 2) ?? [];
  const alt = index % 2 === 1;

  return (
    <Link href={`/case-study/${caseStudy.slug}`} className="group block">
      <Card interactive className="h-full overflow-hidden">
        <div className="relative p-6 pb-0">
          {screenshot ? (
            <div
              className={cn(
                "transition-transform duration-standard ease-standard group-hover:rotate-0",
                alt ? "rotate-2" : "-rotate-2"
              )}
            >
              <TabletFrame ring={alt ? "accent" : "brand"}>
                <div className="relative aspect-[4/3] w-full">
                  <Image
                    src={screenshot}
                    alt={`${caseStudy.client_name} product screenshot`}
                    fill
                    className="object-cover object-top"
                    sizes="(max-width: 768px) 100vw, 400px"
                  />
                </div>
              </TabletFrame>
            </div>
          ) : (
            <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-border bg-surface">
              <span className="text-3xl font-bold text-foreground-subtle/40">
                {caseStudy.client_name.charAt(0)}
              </span>
            </div>
          )}
          {tags.length > 0 && (
            <div className="absolute left-3 top-3 flex gap-2">
              {tags.map((tag) => (
                <Badge key={tag} variant="neutral">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div className="p-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xl font-semibold text-foreground">{caseStudy.client_name}</h3>
            <Badge variant="accent">{caseStudy.status_badge}</Badge>
          </div>
          <p className="text-sm text-foreground-muted">{caseStudy.tagline}</p>
        </div>
      </Card>
    </Link>
  );
}
