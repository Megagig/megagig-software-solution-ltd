# ui-rules.md — Megagig Website Design System

> How the UI behaves, in writing. Pairs with `ui-tokens.md` (the raw values) — this file is the *rules for using them*. Aesthetic direction: confident, engineering-led software studio — dark-first, generous whitespace, real product screenshots over stock illustration, subtle motion, no cartoonish gradients.

## 1. Overall visual language

- **Dark-first, light-available.** Default to system preference; both themes must be fully designed, not just inverted colors — verify contrast and shadow legibility in each explicitly.
- **Evidence over decoration.** Every major section should be anchored by something real: a product screenshot, a named client, a specific stat, a verifiable link — not abstract icon illustrations standing in for proof.
- **Restrained motion.** Fade/slide-up on scroll-into-view for section content (once, not on every scroll), smooth hover states, an auto-scrolling logo/tech marquee. No parallax gimmicks, no bouncing icons.
- **"No cartoonish gradients" means no loud, high-saturation, multi-hue gradients used as decoration for its own sake** (rainbow blends, novelty-app color washes). It does not forbid a subtle, low-opacity (roughly 5–10%) radial glow in the existing `--color-brand`/`--color-accent` tokens behind a hero section, used once, with no hard visible edge — that's restrained use of the existing palette, not a decorative gradient. When in doubt: if it could read as a brand color choice, it's fine; if it looks like a gradient generator's default output, it isn't.

## 2. Layout

- Marketing pages are a stack of full-width `<section>`s, each internally constrained to `--space-container-max` and centered, alternating background between `--color-background` and `--color-surface` to create visual rhythm without hard dividers.
- Section anatomy, top to bottom: optional eyebrow label (uppercase, `--text-xs`, `--tracking-wide`, `--color-brand`) → heading (`--text-3xl md:--text-4xl`, `font-bold`, `--tracking-tight`) → optional subhead (`--text-lg`, `--color-foreground-muted`, max-width ~65ch) → content grid/list.
- Grids: services and products use a responsive bento/card grid (`1 col` mobile → `2 col` tablet → `3 col` desktop); case studies use the same grid but allow a "featured" first card that spans 2 columns on desktop for the most recent/flagship project.
- Forms are single-column, max-width ~32rem, generous field spacing (`space-y-5`), never a cramped multi-column layout on mobile.

## 3. Navbar

- Sticky, `backdrop-blur` + semi-transparent background once scrolled (`--color-surface` at ~85% opacity), solid/transparent at the very top of Home only.
- Logo left, nav links center/left-of-CTA on desktop, hidden behind a slide-in sheet on mobile (hamburger trigger).
- Right side: theme toggle, then the primary "Start a project" button (always `--color-brand` filled, never demoted to an outline button in the nav — it's the one CTA that must never lose visual priority).
- Active route gets a subtle underline or `--color-brand` text treatment, not a filled pill (keeps the nav visually calm).

## 4. Buttons

Three variants, consistent across both apps:

| Variant | Use | Style |
|---|---|---|
| **Primary** | The one main action per section ("Start a project", "Submit", "Get a Free Quote") | Filled `--color-brand` background, `--color-brand-foreground` text, `--radius-md`, `--shadow-sm` at rest → `--shadow-glow-brand` + slight lift on hover |
| **Secondary** | Supporting action alongside a primary ("See our work", "View Case Study") | Outline: 1px `--color-border`, transparent background, `--color-foreground` text; on hover, background shifts to `--color-surface` |
| **Ghost/Link** | Low-emphasis inline actions ("Explore product →", "Read the case study") | No border/background, `--color-brand` text, arrow suffix, underline appears on hover only |

Rules: never more than one Primary button visible in the same viewport section (exception: navbar CTA + a section's own CTA can coexist since the navbar is persistent chrome, not part of the section). Every button has a visible focus ring (`outline: 2px solid var(--color-brand); outline-offset: 2px`) for keyboard accessibility — never `outline: none` without a replacement.

## 5. Cards

- **Base card**: `--color-surface-raised` background, 1px `--color-border`, `--radius-lg`, `--shadow-sm` at rest → `--shadow-md` + 1–2px lift on hover (only on cards that are themselves links/clickable — static info cards don't need hover lift).
- **Service card**: icon (or small illustrative graphic) top-left, title (`--text-xl`, `font-semibold`), 1–2 line description (`--color-foreground-muted`), no visible button — the whole card is the click target, cursor `pointer`, entire card gets the hover treatment.
- **Product card**: screenshot/image top (16:9 or product-appropriate ratio, rounded top corners matching card radius), name + tagline below, 3–4 feature bullets (checkmark icon + `--text-sm`), "Explore product →" ghost link bottom-right.
- **Case study card**: image top, category tag(s) as small Badges overlaid top-left of the image, client name (`--text-xl font-semibold`) + one-line tagline below, "Live in production" status Badge, whole card clickable to the detail page.
- **Testimonial card**: quote text large (`--text-lg`, `--leading-snug`), avatar + author name/role/company at the bottom, company name is a real outbound link ("Visit [Company]") — never fabricated, never a dead link; if a testimonial has no verifiable company URL yet, omit the link rather than fake one.
- **Team member card**: photo (square, `--radius-lg`), name (`font-semibold`), role (`--color-foreground-muted`, `--text-sm`), small row of social icon links.
- **Pricing category card**: category label + icon, "Custom quote" as the price line (`--text-2xl font-bold`), no feature list required — this is a teaser card, not a comparison table (there is no fixed-tier pricing table on this site, per `project-overview.md`).

## 6. Badges

- Pill-shaped (`--radius-full`), `--text-xs`, `font-medium`, `--tracking-wide` if uppercase.
- Status badges (`"Live in production"`, `"New"`, category tags) use a soft-tint background of the relevant semantic/brand color at ~12% opacity with full-opacity text of that same color (e.g. accent-green tint background, accent-green text) — never a solid-fill badge, which reads too heavy at this size.
- Admin-only lead-status badges use the `--color-status-*` tokens 1:1 with the `Lead.Status` enum values.

## 7. Forms

- Inputs: `--radius-md`, 1px `--color-border`, `--color-surface` background, focus state = 2px `--color-brand` border + subtle glow, never a red border by default (only after a field has been touched and failed validation).
- Labels always visible above the field (no placeholder-as-label pattern) — required for accessibility and because placeholder text disappears the moment someone starts typing, which hurts form completion on a lead-gen form specifically.
- Inline error text: `--text-sm`, `--color-danger`, appears directly below the field, announced via `aria-describedby`.
- Submit button shows a loading state (spinner + disabled) during submission — never a double-submittable form.
- Success state: replace the form with a confirmation message + icon (not just a toast that can be missed) — this is the conversion moment, it deserves an unmissable acknowledgment.

## 8. Accordion (FAQ)

- One item open at a time by default (single-expand), chevron rotates 180° on open, smooth height transition using `--duration-standard`/`--ease-standard`.
- Question row is the full click target, not just the chevron icon.

## 9. Carousel (testimonials, client showcase)

- Auto-advance every ~6s, pauses on hover/focus, always has visible prev/next controls and dot indicators — never an auto-advance-only carousel with no manual control (accessibility + control expectation).
- Client-logo marquee (if used on Home) is a separate, faster, continuous auto-scroll strip — treated as decorative/supplementary, not the same component as the testimonial carousel.

## 10. Stats / trust callouts

- Large number (`--text-4xl` or `--text-5xl`, `font-bold`, `--color-brand` or `--color-foreground` depending on section background) + short label beneath (`--text-sm`, `--color-foreground-muted`, uppercase, `--tracking-wide`).
- Used sparingly — 2–4 per section max — real numbers only (see `project-overview.md`/`build-plan.md` Phase 5 for sourcing real figures; never a placeholder stat left in production copy).

## 11. Tech stack strip

- Row of icon + label pairs (monospace label, `--text-sm`), grayscale/muted at rest, full color on hover — mirrors the reference site's stack showcase. Icons sourced as SVGs, consistent size (e.g. 32–40px), evenly spaced, wraps to multiple rows on mobile rather than horizontally scrolling.

## 12. Founder / About sections

- Founder spotlight: portrait photo, a single pull-quote (`--text-2xl`, `font-medium`, `--leading-snug`), then 2–3 short paragraphs of bio, then link row (Portfolio/GitHub/LinkedIn) as Ghost buttons.
- "Our story" stat pair: two `StatCallout`s side-by-side (or stacked on mobile) — not a wall of paragraph text; keep the narrative short (founding year, mission line) and let the stats + product proof do the persuading.

## 13. Admin panel specifics (`apps/admin`)

- Follows Grit's default Filament-like admin visual pattern — collapsible left sidebar (icon + label, Lucide icons), top navbar with theme toggle and user menu, DataTables with sort/filter/pagination/row-selection exactly as Grit generates them.
- The one deviation from generated defaults worth calling out: the Leads DataTable's `Status` column always renders as the colored badge described in §6, not the raw enum string — this is a small polish item worth hand-tuning after generation, not something to relitigate the whole DataTable component over.
- Image fields (hero images, screenshots, photos) use a drag-and-drop upload zone wired to the presigned-URL flow in `library-docs.md`, with a live thumbnail preview after upload — never a bare file input with no preview.

## 14. Accessibility baseline (non-negotiable, applies everywhere)

- Color contrast meets WCAG AA for all text/background combinations in both themes — verify tokens in `ui-tokens.md` against this, don't assume.
- All interactive elements are reachable and operable by keyboard alone, with a visible focus state (§4).
- All images have meaningful `alt` text (product screenshots describe what's shown; decorative images use `alt=""`).
- Form fields are properly labeled and errors are programmatically associated (§7).
