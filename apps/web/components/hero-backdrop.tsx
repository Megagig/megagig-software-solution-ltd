// Restrained hero backdrop (ui-rules.md §1): a faint dot grid faded out
// toward the edges over the same low-opacity brand/accent glow Home's hero
// uses — token colors via color-mix/var, so it flips correctly in dark mode.
// Place it as the first child of a `relative overflow-hidden` section.
const GLOW_STYLE: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(55% 50% at 50% 0%, color-mix(in srgb, var(--color-brand) 14%, transparent), transparent 70%), " +
    "radial-gradient(35% 35% at 88% 18%, color-mix(in srgb, var(--color-accent) 12%, transparent), transparent 70%)",
};

const DOTS_STYLE: React.CSSProperties = {
  backgroundImage: "radial-gradient(var(--color-border) 1px, transparent 1px)",
  backgroundSize: "24px 24px",
  maskImage: "radial-gradient(ellipse 70% 65% at 50% 40%, black, transparent)",
  WebkitMaskImage: "radial-gradient(ellipse 70% 65% at 50% 40%, black, transparent)",
};

export function HeroBackdrop() {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={GLOW_STYLE} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={DOTS_STYLE} />
    </>
  );
}
