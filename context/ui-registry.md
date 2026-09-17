# ui-registry.md — Megagig Website Component Registry

> **Living document. Starts empty.** This file is auto-updated (by the imprint/coding-agent skill, or manually if no such skill is running) every time a new reusable UI component is built. Its job: so that a new coding-agent session — or a human — can check here *first* before building a component, and reuse or extend what already exists instead of reinventing it. Do not pre-populate this file with imagined components; only add a row once the component actually exists in the codebase and has been verified to render.

## How to update this file

After building or materially changing a shared component:
1. Add (or update) one row in the relevant table below.
2. Keep the "Used by" column current — it's what tells the next session whether a change is safe to make.
3. If a component is deleted/replaced, remove its row rather than leaving a stale entry.

## Shared primitives (`apps/web/components/ui/`)

| Component | Path | Variants/Props | Used by | Notes |
|---|---|---|---|---|
| Button | `apps/web/components/ui/button.tsx` | `variant`: primary/secondary/ghost; `size`: sm/md/lg | Navbar CTA, Phase 4 pages | Hand-built with CVA (not shadcn CLI — see note below), matches ui-rules.md §4 exactly |
| Card | `apps/web/components/ui/card.tsx` | `interactive` bool; subcomponents `CardHeader`/`CardTitle`/`CardDescription`/`CardContent`/`CardFooter` | Phase 4 (service/product/case-study/testimonial/team cards will compose this) | Base structural card only — content-specific card anatomy (ui-rules.md §5) is Phase 4 work |
| Badge | `apps/web/components/ui/badge.tsx` | `variant`: brand/accent/success/warning/danger/info/neutral; `uppercase` bool | Phase 4 (category tags, status badges) | Soft-tint (`bg-<color>/10`) per ui-rules.md §6, same convention as `TagsField`'s chips (admin) |
| SectionHeading | `apps/web/components/ui/section-heading.tsx` | `eyebrow?`, `title`, `subhead?`, `align`: left/center | Phase 4 (every marketing section) | Subhead capped `max-w-[65ch]` per ui-rules.md §2 |
| Accordion | `apps/web/components/ui/accordion.tsx` | Radix-based: `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` | Home FAQ (Phase 4) | Wraps `@radix-ui/react-accordion` (new dependency) for real keyboard/ARIA behavior; single-expand via `type="single" collapsible"` at usage site; animation keyframes registered in `apps/web/app/globals.css`, not tokens.css (web-only motion) |
| Carousel | `apps/web/components/ui/carousel.tsx` | `children: ReactNode` (any number of slides — normalized via `Children.toArray`), `autoAdvanceMs` (default 6000) | Home testimonials (Phase 4) | Hand-built (no Radix/shadcn equivalent) — auto-advance, pause on hover/focus, prev/next + dot controls, per ui-rules.md §9. Fixed a real bug caught by its own test suite: originally typed `children: ReactNode[]` and called `.map()` directly, which throws for exactly one child (React only array-wraps 2+ JSX children) |
| StatCallout | `apps/web/components/ui/stat-callout.tsx` | `value`, `label`, `tone`: brand/foreground, `size`: md/lg | Phase 4 (Our Story, closing CTA stats) | |
| TechIcon / TechStackStrip | `apps/web/components/ui/tech-icon.tsx` | `TechIcon({icon, label})`; `TechStackStrip({items})` | Home tech stack strip (Phase 4) | Grayscale-to-color hover per ui-rules.md §11 |

**Note on build approach:** `library-docs.md` calls for adding primitives via the shadcn CLI. Checked before building — this project's `ui-tokens.md` token vocabulary (`--color-brand`, `--color-surface`, `--radius-md`, no `--color-primary`/`--destructive`/`--ring`/single `--radius`) doesn't match shadcn's default component classes at all, so CLI-generated files would need a full class-by-class rewrite regardless. Decided against running it: hand-built Button/Card/Badge directly with the already-installed CVA/clsx/tailwind-merge stack (shadcn's own dependency stack, just without its scaffolding step), and installed the one dependency genuinely worth having from Radix — `@radix-ui/react-accordion` — for real accessible accordion behavior. Carousel/SectionHeading/StatCallout/TechIcon have no shadcn equivalent and were always going to be hand-built.

## Marketing chrome (`apps/web/components/`)

| Component | Path | Purpose | Used by | Notes |
|---|---|---|---|---|
| Navbar | `apps/web/components/navbar.tsx` | Sticky nav — logo, links, theme toggle, "Start a project" CTA | `(marketing)/layout.tsx` | Transparent at the very top of Home only, solid/blurred everywhere else and once scrolled, per ui-rules.md §3. Full rebuild, replacing Grit's demo navbar (dead classes, "Built with Grit" copy) |
| Footer | `apps/web/components/footer.tsx` | Sitemap (Services/Products/Resources/Company columns), social links, contact line, copyright, back-to-top | `(marketing)/layout.tsx` | Contact email/phone/social links passed down from `SiteSettings` (server-fetched in the layout), never hardcoded |
| BackToTop | `apps/web/components/back-to-top.tsx` | Scroll-to-top button | `Footer` | Extracted as its own client leaf so `Footer` itself stays a server component |
| ThemeToggle | `apps/web/components/theme-toggle.tsx` | Flips `.dark` class, persists to `localStorage("megagig-theme-mode")` | `Navbar` (desktop + mobile) | Deliberately duplicated from `apps/admin`'s `DarkModeToggle` rather than shared, per code-standards.md §3 (apps/web and apps/admin never cross-import) |
| WhatsAppFab | `apps/web/components/whatsapp-fab.tsx` | Persistent bottom-right WhatsApp deep link | `(marketing)/layout.tsx` | Number sourced from `SiteSettings.whatsapp_number` (server-fetched); renders nothing if settings fetch fails or number unset, rather than a broken link |

## Page-specific components (colocated under each route's `_components/`)

| Component | Route | Purpose | Notes |
|---|---|---|---|
| _(none yet)_ | | | |

## Admin components (`apps/admin/`)

| Component | Path | Purpose | Used by | Notes |
|---|---|---|---|---|
| TagsField | `apps/admin/components/forms/fields/tags-field.tsx` | Free-text chip/tag input bound to a `string[]` field (Enter or `,` commits a tag) | `CaseStudy.category_tags`/`tech_stack`, `Product.feature_bullets`, `Blog.tags` | New `"tags"` `FieldType`/`ColumnFormat` added to `lib/resource.ts`, wired into `form-builder.tsx` and `cell-renderers.tsx` (table shows badge chips, +N overflow). Distinct from `CheckboxGroupField`, whose options are a fixed predefined set — this is for open-ended text tags. Added because Grit's generator maps every `string_array` field to `type: "images"` (an image-upload dropzone), which is wrong for plain-text tags. |
| SiteSettings page | `apps/admin/app/(dashboard)/site-settings/page.tsx` | Single-record settings form (not a DataTable) for the SiteSettings singleton — contact info, hero copy, social links | Sidebar nav (admin-only, above the resources list) | Hand-built per `build-plan.md` step 1.10; uses `apps/admin/hooks/use-site-settings.ts` (React Query get/update against `/api/site-settings`) |
| LeadStatusBadge | `apps/admin/components/tables/lead-status-badge.tsx` | Soft-tint pill for `Lead.Status`, using `--color-status-*` tokens 1:1 per ui-rules.md §13 | `leads.ts` table `status` column (via `cell:`) | Plain function returning `ReactNode` (same pattern as `StackedCell`), not a JSX component — keeps the resource definition file as `.ts`. Distinct from the generic `BadgeCell` in `cell-renderers.tsx`, whose color palette doesn't cover this specific 5-value enum. |

## Icon usage

| Icon | Library | Used for |
|---|---|---|
| Sun / Moon | lucide-react | Theme toggle (light/dark state), both apps — `ThemeToggle` (web), `DarkModeToggle` (admin) |
| Menu / X | lucide-react | Navbar mobile hamburger open/close (web) |
| ChevronDown | lucide-react | Accordion trigger (web) |
| ChevronLeft / ChevronRight | lucide-react | Carousel prev/next controls (web) |
| MessageCircle | lucide-react | WhatsApp FAB (web) — filled (`fill="currentColor" strokeWidth={0}`), not outline |
| Mail / Phone | lucide-react | Footer contact line (web) |
| Github / Linkedin / Youtube / Facebook / Twitter | lucide-react | Footer social links (web), keyed off `SiteSettings.social_links` |
| ArrowUp | lucide-react | Footer back-to-top control (web) |

## Visual pattern reference (`/imprint`)

> Exact Tailwind classes for admin components built so far, so the next component matches without re-reading source. The tables above answer "what exists and where" — this section answers "what classes exactly."

### LeadStatusBadge

File: `apps/admin/components/tables/lead-status-badge.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | inline `color-mix(in srgb, var(--color-status-{status}) 12%, transparent)` — soft-tint, not a static class |
| Border | none |
| Border radius | `rounded-full` |
| Text | `text-xs font-medium`, color = inline `var(--color-status-{status})` |
| Spacing | `px-2.5 py-0.5` |
| Hover state | none (static pill) |
| Shadow | none |
| Accent usage | one of 5 `--color-status-*` tokens, chosen by `status` value |

**Pattern notes:** Same soft-tint-background/full-opacity-text pill shape as ui-rules.md §6's generic badge spec, but built as a plain function (not JSX component) so it can be called from a `.ts` resource-definition file — same reasoning as `StackedCell`. Any future single-enum status badge (e.g. a "won/lost" outcome elsewhere) should follow this exact shape: `rounded-full`, `px-2.5 py-0.5`, `text-xs font-medium`, 12%-tint background via `color-mix`.

### TagsField

File: `apps/admin/components/forms/fields/tags-field.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | container: none (transparent, border-only); chip: `bg-brand/10` |
| Border | container: `border` + `border-danger` (error) / `border-border` (default) |
| Border radius | container `rounded-xl`; chip `rounded-full` |
| Text — primary | label `text-sm font-medium text-foreground`; input `text-sm text-foreground` |
| Text — secondary | description/placeholder `text-xs text-foreground-subtle`; chip `text-xs font-medium text-brand` |
| Spacing | container `px-3 py-2`, `gap-1.5`; chip `px-2.5 py-0.5`, `gap-1` |
| Hover state | chip remove button `hover:bg-brand/20` |
| Shadow | none |
| Accent usage | `bg-brand/10 text-brand` for chips |

**Pattern notes:** Container radius (`rounded-xl`) matches `CheckboxGroupField`'s container, establishing `rounded-xl` as the convention for multi-value form-field containers, distinct from `rounded-lg` (single-value text/number inputs) and `rounded-2xl` (cards/sections). Required-field asterisk is `text-danger`, matching every other field component.

### Settings page pattern (SiteSettings — `SettingsCard` / `Field` / text input)

File: `apps/admin/app/(dashboard)/site-settings/page.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Card background | `bg-surface-raised` |
| Card border | `border border-border` |
| Card radius | `rounded-2xl` |
| Card header separator | `border-b border-border`, `px-6 py-4` |
| Card body spacing | `px-6 py-5` |
| Icon chip | `h-8 w-8 rounded-lg bg-brand/10 text-brand` |
| Text — card title | `text-sm font-semibold text-foreground` |
| Text — card description | `text-xs text-foreground-subtle` |
| Text — field label | `text-xs font-semibold uppercase tracking-wide text-foreground-subtle` |
| Input | `rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-foreground-subtle focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand` |
| Input (error) | same, with `border-danger/50` and `focus:border-danger focus:ring-danger` |
| Primary button | `rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:brightness-90 disabled:opacity-50` |
| Success message | `text-sm font-medium text-success` |
| Section spacing | `mb-6` between cards |

**Pattern notes:** `SettingsCard`'s shape (`rounded-2xl border border-border bg-surface-raised`, header with `border-b` + icon chip) is byte-for-byte identical to `ProfileCard` in `apps/admin/app/(dashboard)/profile/page.tsx` — confirmed consistent, not drifted. **Flagging one duplication**: the `inputClass`/`errorInputClass` strings are copy-pasted verbatim between `profile/page.tsx` and `site-settings/page.tsx`. Not a visual inconsistency (they match exactly), but worth extracting into a shared `apps/admin/components/forms/text-input-classes.ts` (or similar) next time either file is touched, so the two can't silently drift apart later.

### Button (`apps/web`)

File: `apps/web/components/ui/button.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | `bg-brand` (primary only) — secondary/ghost are transparent |
| Border | `border border-border` (secondary only) |
| Border radius | `rounded-md` |
| Text | `text-sm font-semibold`; primary `text-brand-foreground`, secondary `text-foreground`, ghost `text-brand` |
| Spacing | `sm: h-9 px-4`, `md: h-11 px-6`, `lg: h-12 px-8 text-base`; ghost resets to `h-auto p-0` via `compoundVariants` regardless of size |
| Hover state | primary: `shadow-glow-brand` + `-translate-y-0.5`; secondary: `bg-surface`; ghost: `underline underline-offset-4` |
| Shadow | primary only — `shadow-sm` at rest |
| Focus ring | `focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2` — same ring recipe reused by every interactive web primitive below |
| Accent usage | `bg-brand`/`text-brand` — never `accent` (accent is reserved for "live/success" semantics per ui-tokens.md) |

**Pattern notes:** Never more than one Primary button visible in the same viewport section (ui-rules.md §4) — Phase 4 pages must default to `secondary`/`ghost` for any second CTA. The focus-ring recipe here (`outline-2 outline-brand outline-offset-2`) is the canonical one for apps/web — every other custom interactive element (Carousel controls, ThemeToggle, BackToTop, WhatsApp FAB) reuses it verbatim rather than inventing a new focus style.

### Card (`apps/web`)

File: `apps/web/components/ui/card.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | `bg-surface-raised` |
| Border | `border border-border` |
| Border radius | `rounded-lg` |
| Text — title | `CardTitle`: `text-xl font-semibold text-foreground` |
| Text — description | `CardDescription`: `text-sm text-foreground-muted` |
| Spacing | `CardHeader`/`CardContent`: `p-6`/`px-6 pb-6`; `CardFooter`: `flex items-center px-6 pb-6` |
| Hover state | only when `interactive`: `hover:-translate-y-0.5 hover:shadow-md` |
| Shadow | `shadow-sm` at rest always; `shadow-md` on hover only if `interactive` |

**Pattern notes:** This is the *base* structural card only (ui-rules.md §5's generic "Base card" spec) — content-specific anatomy (image position, badge overlay, feature bullets) is composed on top of it per card type in Phase 4, not baked in here. Static/non-clickable cards must pass `interactive={false}` (the default) — no lift/shadow-shift, per ui-rules.md §5's explicit "static info cards don't need hover lift."

### Badge (`apps/web`)

File: `apps/web/components/ui/badge.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | `bg-{variant}/10` (10% tint) — variants: brand/accent/success/warning/danger/info/neutral |
| Border | none |
| Border radius | `rounded-full` |
| Text | `text-xs font-medium`, color = `text-{variant}` (full opacity), `uppercase tracking-wide` if `uppercase` prop set |
| Spacing | `px-2.5 py-0.5` |
| Hover state | none (static pill) |
| Shadow | none |

**Pattern notes:** Same soft-tint shape as admin's `LeadStatusBadge` (`rounded-full`, `px-2.5 py-0.5`, `text-xs font-medium`, ~10-12% tint bg), but implemented with static Tailwind `/10` opacity modifiers per variant rather than inline `color-mix` — `LeadStatusBadge` needed `color-mix` because its color is picked dynamically from a 5-value enum at runtime; this Badge's variants are a fixed, known set, so plain utility classes are simpler and sufficient. `neutral` variant uses `foreground-subtle`/`foreground-muted` instead of a color token — for category tags with no semantic meaning.

### SectionHeading (`apps/web`)

File: `apps/web/components/ui/section-heading.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Text — eyebrow | `text-xs font-medium uppercase tracking-wide text-brand`, `mb-3` |
| Text — title | `text-3xl font-bold tracking-tight text-foreground md:text-4xl` |
| Text — subhead | `mt-4 max-w-[65ch] text-lg text-foreground-muted` |
| Spacing | title has no top margin (first element); subhead `mt-4` |
| Alignment | `align="center"` adds `text-center` on the wrapper and `mx-auto` on the subhead only |

**Pattern notes:** `max-w-[65ch]` is a deliberate one-off arbitrary value (prose measure, not a spacing token) — ui-tokens.md's spacing scale governs layout rhythm, not paragraph line length, so this doesn't violate the no-hardcoded-values rule.

### Accordion (`apps/web`)

File: `apps/web/components/ui/accordion.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Border | `AccordionItem`: `border-b border-border` |
| Text — trigger | `text-base font-semibold text-foreground`, `hover:text-brand` |
| Text — content | `text-sm text-foreground-muted` |
| Spacing | trigger `py-5`; content `pb-5 pt-0` |
| Icon | `ChevronDown`, `h-4 w-4 text-foreground-muted`, rotates 180deg via `[&[data-state=open]>svg]:rotate-180` |
| Motion | `data-[state=open]:animate-accordion-down` / `data-[state=closed]:animate-accordion-up`, keyframes + `--animate-*` registered in `apps/web/app/globals.css` (not tokens.css — web-only motion), duration/easing pulled from `--duration-standard`/`--ease-standard` |

**Pattern notes:** Built on `@radix-ui/react-accordion` for real keyboard/ARIA behavior. Single-expand is a usage-site choice (`type="single" collapsible`), not hardcoded into the component, so a future multi-expand use case isn't blocked.

### Carousel (`apps/web`)

File: `apps/web/components/ui/carousel.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | none (transparent, wraps caller's slide content) |
| Border | controls: `border border-border` |
| Border radius | controls: `rounded-full`; active dot: `rounded-full` |
| Spacing | dots row `mt-6 gap-2`; controls offset `-translate-x-4`/`translate-x-4` outside the slide track |
| Hover state | controls `hover:bg-surface`; inactive dot `hover:bg-foreground-subtle` |
| Shadow | controls `shadow-sm` |
| Motion | slide track `transition-transform duration-slow ease-standard`; dot width/color `transition-all duration-fast ease-standard` |
| Accent usage | active dot `bg-brand` + `w-6` (vs. inactive `bg-border` + `w-2`) |

**Pattern notes:** Auto-advances every 6s by default, pauses on `mouseenter`/`focus` (ui-rules.md §9 — never auto-advance-only). Controls use the same circular-button shape (`h-10 w-10 rounded-full border-border bg-surface-raised`) as `ThemeToggle`'s square variant, scaled up and made circular for touch-target size on a marketing page.

### StatCallout (`apps/web`)

File: `apps/web/components/ui/stat-callout.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Text — value | `font-bold tracking-tight`, `text-4xl` (md) or `text-5xl` (lg); color `text-brand` or `text-foreground` via `tone` prop |
| Text — label | `mt-2 text-sm uppercase tracking-wide text-foreground-muted` |
| Alignment | always `text-center` |

**Pattern notes:** `tone="foreground"` exists for use on a `--color-brand`-tinted or dark hero background where brand-colored text would lose contrast — pick per-section, not globally.

### TechIcon / TechStackStrip (`apps/web`)

File: `apps/web/components/ui/tech-icon.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Text | `font-mono text-sm`, color `text-foreground-subtle` at rest → `text-foreground` on hover |
| Icon box | `h-9 w-9 sm:h-10 sm:w-10` |
| Spacing | item: `gap-2` (icon to label); strip: `gap-x-10 gap-y-6`, `flex-wrap` |
| Hover state | `grayscale opacity-70` → `grayscale-0 opacity-100` on hover |
| Motion | `transition-all duration-standard ease-standard` |

**Pattern notes:** Strip wraps to multiple rows on mobile (`flex-wrap`) rather than scrolling horizontally, per ui-rules.md §11.

### Navbar (`apps/web`)

File: `apps/web/components/navbar.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | scrolled or non-Home: `bg-surface/85 backdrop-blur-lg`; Home at top: `bg-transparent` |
| Border | scrolled or non-Home: `border-b border-border/50`; Home at top: `border-transparent` |
| Text — links | active: `font-medium text-brand`; inactive: `text-foreground-muted hover:text-foreground` |
| Spacing | `h-16`, container `max-w-[--space-container-max] px-[--space-container-x]` (per ui-tokens.md §2's documented arbitrary-value syntax) |
| Motion | `transition-colors duration-standard ease-standard` on the background/border swap |
| Logo mark | `h-8 w-8 rounded-lg bg-brand/15 border border-brand/20`, letter from `brand.logo.text` |

**Pattern notes:** The transparent-at-top-of-Home behavior is a scroll-position + pathname check (`scrolled || !isHome`), not a CSS-only trick — every other route is always in the "solid" state per ui-rules.md §3. Uses the same `bg-brand/15 border-brand/20` logo-chip shape in `Footer`, so the two never visually diverge.

### Footer (`apps/web`)

File: `apps/web/components/footer.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | `bg-surface` |
| Border | `border-t border-border` (outer); column separator `border-t border-border` above the copyright row |
| Text — heading | `text-xs font-semibold uppercase tracking-wide text-foreground-subtle` |
| Text — link | `text-sm text-foreground-muted hover:text-foreground` |
| Text — copyright | `text-xs text-foreground-subtle` |
| Spacing | outer `py-16`, grid `gap-8`, link list `space-y-3`, copyright row `mt-12 pt-6` |

**Pattern notes:** Contact email/phone and social icons are conditionally rendered — only shown if `SiteSettings` actually has that field set, never a placeholder value left visible in production. Sitemap columns are Services/Products/Resources/Company per architecture.md §4's folder-structure comment — keep this exact order/naming if columns are ever restructured.

### ThemeToggle (`apps/web`)

File: `apps/web/components/theme-toggle.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | `bg-surface-raised` |
| Border | `border border-border` |
| Border radius | `rounded-md` |
| Spacing | `h-9 w-9` |
| Hover state | `hover:bg-surface` |
| Icon | `Moon`/`Sun`, `h-4 w-4`, color `text-foreground-muted` |

**Pattern notes:** Deliberately mirrors `apps/admin`'s `DarkModeToggle` pixel-for-pixel (same localStorage pattern, same hydration-safe mount behavior) but is a separate file — apps/web and apps/admin never cross-import components (code-standards.md §3). If admin's toggle changes, check whether this one should too, but update both by hand.

### WhatsAppFab (`apps/web`)

File: `apps/web/components/whatsapp-fab.tsx`
Last updated: 2026-09-17

| Property | Class |
|---|---|
| Background | `bg-accent` |
| Border radius | `rounded-full` |
| Spacing | `h-14 w-14`, fixed `bottom-6 right-6` |
| Hover state | `hover:scale-105` |
| Shadow | `shadow-lg` |
| Accent usage | `bg-accent text-accent-foreground` — the only place outside `Button`'s primary variant that pairs a solid brand-family color with its `-foreground` counterpart |

**Pattern notes:** Uses `accent`/`accent-foreground`, not `success`/`success-foreground` — ui-tokens.md has no `--color-success-foreground` token (success is used for tinted feedback states, not solid fills), while `accent`/`accent-foreground` is an established pair designed for exactly this "solid color + readable icon in both themes" case. Renders `null` if `SiteSettings.whatsapp_number` is unavailable — never a dead/placeholder `wa.me` link.
