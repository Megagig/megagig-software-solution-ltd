import Image from "next/image";
import { Palette } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { TechStackStrip } from "@/components/ui/tech-icon";
import { TECH_LOGOS } from "@/lib/tech-logos";

// Static per project-requirements.md §5.1 — not admin-editable in v1.
// Real brand logos (provided in apps/web/public/) for every tech with one
// available; Tailwind has no logo file yet, so it keeps the generic Lucide
// stand-in rather than fabricating a mark.
// unoptimized: these are already tiny (1-7KB) source files — routing them
// through Next's resize/recompress pipeline for a ~40px display size
// introduced visible blur/artifacts on their fine linework. Serving the
// original bytes and letting the browser downscale looks sharp instead.
const logo = (src: string, alt: string) => (
  <Image src={src} alt={alt} width={160} height={148} unoptimized className="h-full w-full object-contain" />
);

const STACK = [
  ...Object.entries(TECH_LOGOS).map(([label, src]) => ({ icon: logo(src, label), label })),
  { icon: <Palette className="h-full w-full" />, label: "Tailwind" },
];

export function TechStack() {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-(--space-section-y-mobile) md:py-(--space-section-y)">
        <SectionHeading eyebrow="Under the hood" title="The stack we build with" align="center" />
        <div className="mt-10">
          <TechStackStrip items={STACK} />
        </div>
      </div>
    </section>
  );
}
