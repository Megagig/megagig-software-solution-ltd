import Image from "next/image";
import { TabletFrame } from "@/components/ui/tablet-frame";

// Tilted, overlapping 5-device composition directly under the hero CTAs —
// matches the reference site's device-mockup treatment exactly. Real
// screenshots only (ui-rules.md §1 — evidence over decoration).
//
// Simplified to a single centered frame below md: the tilted/overlapping
// composition only reads well at desktop width.
const DEVICES = [
  { src: "/BusinessCopilot.PNG", alt: "BusinessCopilot dashboard", ring: "accent" as const, size: 190, pos: "left-0 top-16", rotate: "-rotate-12", z: "z-10" },
  { src: "/SocietyLedgerLogin.PNG", alt: "SocietyLedger marketing site", ring: "brand" as const, size: 220, pos: "left-16 top-0", rotate: "-rotate-6", z: "z-20" },
  { src: "/pharmacyCopilotPC.PNG", alt: "PharmacyCopilot desktop dashboard", ring: "none" as const, size: 300, pos: "left-1/2 top-2 -translate-x-1/2", rotate: "rotate-0", z: "z-30" },
  { src: "/YazzyosAccount.PNG", alt: "Yazzy OS accounting overview", ring: "brand" as const, size: 220, pos: "right-16 top-0", rotate: "rotate-6", z: "z-20" },
  { src: "/SocietyLedger.PNG", alt: "SocietyLedger accounting dashboard", ring: "accent" as const, size: 190, pos: "right-0 top-16", rotate: "rotate-12", z: "z-10" },
];

export function HeroShowcase() {
  return (
    <div className="relative mx-auto mt-14 hidden h-[440px] w-full max-w-5xl md:block">
      {DEVICES.map((device) => (
        <div
          key={device.src}
          className={`absolute ${device.pos} ${device.rotate} ${device.z}`}
          style={{ width: device.size }}
        >
          <TabletFrame ring={device.ring}>
            <div className="relative aspect-[4/3] w-full">
              <Image
                src={device.src}
                alt={device.alt}
                fill
                className="object-cover object-top"
                sizes={`${device.size}px`}
                priority={device.ring === "none"}
              />
            </div>
          </TabletFrame>
        </div>
      ))}
    </div>
  );
}
