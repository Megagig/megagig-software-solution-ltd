import Image from "next/image";
import { Palette } from "lucide-react";
import { SectionHeading } from "@/components/ui/section-heading";
import { TechStackStrip } from "@/components/ui/tech-icon";

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
  { icon: logo("/nextjslogo.png", "Next.js"), label: "Next.js" },
  { icon: logo("/reactlogo.png", "React"), label: "React" },
  { icon: logo("/nodejslogo.png", "Node.js"), label: "Node.js" },
  { icon: logo("/golanglogo.jfif", "Go"), label: "Go" },
  { icon: logo("/postgres_mongodb_logo.jfif", "MongoDB and PostgreSQL"), label: "MongoDB / PostgreSQL" },
  { icon: logo("/electronjs.png", "Electron"), label: "Electron" },
  { icon: logo("/expo_logo.png", "Expo"), label: "Expo" },
  { icon: logo("/wailslogo.jfif", "Wails"), label: "Wails" },
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
