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
| SectionHeading | `apps/web/components/ui/section-heading.tsx` | `eyebrow?`, `title`, `subhead?`, `align`: left/center, `invert?` bool | Phase 4 (every marketing section) | Subhead capped `max-w-[65ch]` per ui-rules.md §2. `invert` added for `FeaturedProjects`' hardcoded-dark-panel section (swaps title/subhead to explicit white so they stay legible against a fixed dark bg regardless of the site's active theme) |
| BrowserFrame | `apps/web/components/ui/browser-frame.tsx` | `url?`, `tone`: surface/dark, `bezel`: thin/thick | CaseStudyCard, ProductsSection, CaseStudyPreview | Fake browser-chrome wrapper (traffic lights + optional URL bar) around real screenshots inline in cards — added in the Home visual-redesign pass to replace plain bordered image boxes and letter-placeholder avatars. `ShowcaseStrip` (an earlier user of this component) was deleted; `FeaturedProjects`/`HeroShowcase` use `TabletFrame` instead (thicker device bezel, no chrome bar). `bezel="thick"` added for `CaseStudyPreview` (matching the reference site's own frame treatment): thicker outer border, chunkier chrome-bar padding/radius, and real dark "matting" padding around the screenshot (the reference's image doesn't touch the frame's edges) |
| Accordion | `apps/web/components/ui/accordion.tsx` | Radix-based: `Accordion`/`AccordionItem`/`AccordionTrigger`/`AccordionContent` | Home FAQ (Phase 4) | Wraps `@radix-ui/react-accordion` (new dependency) for real keyboard/ARIA behavior; single-expand via `type="single" collapsible"` at usage site; animation keyframes registered in `apps/web/app/globals.css`, not tokens.css (web-only motion) |
| Carousel | `apps/web/components/ui/carousel.tsx` | `children: ReactNode` (any number of slides — normalized via `Children.toArray`), `autoAdvanceMs` (default 6000), `onIndexChange?`, `hideDots?`, `index?` | Home testimonials, `FeaturedProjects` (Phase 4) | Hand-built (no Radix/shadcn equivalent) — auto-advance, pause on hover/focus, prev/next + dot controls, per ui-rules.md §9. Fixed a real bug caught by its own test suite: originally typed `children: ReactNode[]` and called `.map()` directly, which throws for exactly one child (React only array-wraps 2+ JSX children). `onIndexChange`/`hideDots` added for `FeaturedProjects`' name-pill list (syncs to the active slide, doesn't drive it — `hideDots` lets that caller substitute its own position indicator while prev/next arrows still satisfy ui-rules.md §9). `index` added next: the pills were meant to be display-only, but the user explicitly wanted them clickable — passing `index` externally jumps the carousel to that slide without making it a fully controlled component (auto-advance/arrows still own `index` the rest of the time). Covered by a dedicated test (`__tests__/carousel.test.tsx`) using a small controlled wrapper mirroring `FeaturedProjects`' actual usage. |
| StatCallout | `apps/web/components/ui/stat-callout.tsx` | `value`, `label`, `tone`: brand/foreground, `size`: md/lg | Phase 4 (Our Story, closing CTA stats) | |
| TechIcon / TechStackStrip | `apps/web/components/ui/tech-icon.tsx` | `TechIcon({icon, label})`; `TechStackStrip({items})` | Home tech stack strip (Phase 4) | Grayscale-to-color hover per ui-rules.md §11 |
| TabletFrame | `apps/web/components/ui/tablet-frame.tsx` | `ring`: brand/accent/none; `interactive?` bool | `HeroShowcase`, `FeaturedProjects`, `CaseStudyPreview` | Thick device-bezel wrapper (rounded-[28px], `p-3.5` bezel — increased from the original `p-2.5` at the user's request to match the reference image's chunkier border) — distinct from `BrowserFrame`'s thin border + fake chrome bar used elsewhere. Colored ring on "back"/peek tablets uses a `bg-gradient-to-br from-brand to-accent` two-tone (our own tokens, not the reference's literal pink/purple hues). `interactive` adds a hover lift + shadow transition — only set it on frames that are themselves wrapped in a `Link` (a hover effect on a non-clickable decorative frame, like HeroShowcase's or the FeaturedProjects peek devices, would be misleading) |

**Note on build approach:** `library-docs.md` calls for adding primitives via the shadcn CLI. Checked before building — this project's `ui-tokens.md` token vocabulary (`--color-brand`, `--color-surface`, `--radius-md`, no `--color-primary`/`--destructive`/`--ring`/single `--radius`) doesn't match shadcn's default component classes at all, so CLI-generated files would need a full class-by-class rewrite regardless. Decided against running it: hand-built Button/Card/Badge directly with the already-installed CVA/clsx/tailwind-merge stack (shadcn's own dependency stack, just without its scaffolding step), and installed the one dependency genuinely worth having from Radix — `@radix-ui/react-accordion` — for real accessible accordion behavior. Carousel/SectionHeading/StatCallout/TechIcon have no shadcn equivalent and were always going to be hand-built.

## Marketing chrome (`apps/web/components/`)

| Component | Path | Purpose | Used by | Notes |
|---|---|---|---|---|
| Navbar | `apps/web/components/navbar.tsx` | Sticky nav — logo, links, theme toggle, "Start a project" CTA | `(marketing)/layout.tsx` | Transparent at the very top of Home only, solid/blurred everywhere else and once scrolled, per ui-rules.md §3. Full rebuild, replacing Grit's demo navbar (dead classes, "Built with Grit" copy) |
| Footer | `apps/web/components/footer.tsx` | Sitemap (Services/Products/Resources/Company columns), social links, contact line, copyright, back-to-top | `(marketing)/layout.tsx` | Contact email/phone/social links passed down from `SiteSettings` (server-fetched in the layout), never hardcoded. Redesign pass ("more visually appealing" request): brand→transparent top hairline, gradient logo mark, contact rows in tinted circular icon badges, social icons as filled circular buttons with a hover lift, small accent tick before each column heading. Fixed a real overflow bug: the long real email address (`admin@megagigsoftwaresolution.com.ng`, no wrap points) had no `min-w-0`/`break-all`, so on a CSS Grid track sized by `minmax(0, 1fr)` it visually overflowed past its own column into the neighboring sitemap column instead of wrapping — same fix applied to `ContactBlock`'s panel, which has the identical pattern |
| BackToTop | `apps/web/components/back-to-top.tsx` | Scroll-to-top button | `Footer` | Extracted as its own client leaf so `Footer` itself stays a server component |
| ThemeToggle | `apps/web/components/theme-toggle.tsx` | Flips `.dark` class, persists to `localStorage("megagig-theme-mode")` | `Navbar` (desktop + mobile) | Deliberately duplicated from `apps/admin`'s `DarkModeToggle` rather than shared, per code-standards.md §3 (apps/web and apps/admin never cross-import) |
| WhatsAppFab | `apps/web/components/whatsapp-fab.tsx` | Persistent bottom-right WhatsApp deep link | `(marketing)/layout.tsx` | Number sourced from `SiteSettings.whatsapp_number` (server-fetched); renders nothing if settings fetch fails or number unset, rather than a broken link |
| LeadForm | `apps/web/components/lead-form.tsx` | Client-side lead-capture form, `source` prop tags the entry point, `tone`: surface/onBrand, `variant`: compact/full, `defaultProjectType` | Home's `ContactBlock` (compact), `/start-project` (full) | Compact (name/email/message, per project-requirements.md §5.1's Home spec) is untouched. **`variant="full"` (Phase 4.6, shipped)** adds phone/company/a `project_type` dropdown (options from `lib/services.ts`'s real catalog)/a `budget_range` dropdown (`lib/budget-ranges.ts`, with a client-side NGN↔USD display toggle — submitted value is always the same canonical band key)/an optional multi-select `services_interested` checkbox grid (same catalog, a distinct "anything else" question from `project_type`'s "main need")/message. `defaultProjectType` pre-fills `project_type` when arriving via `?service=` from a Services/Pricing CTA. Currently 401s on submit — `Lead.Create` is intentionally still protected-only until Phase 6. `tone="onBrand"` (added for `ContactBlock`'s redesign) swaps input/label/button styling to a tinted-overlay treatment for sitting directly on a solid `bg-brand` panel |
| ServiceCard | `apps/web/components/service-card.tsx` | Service bento card (tinted icon badge, hover arrow, optional accent highlight) | Home's `ServicesGrid`, `/services` index | Extracted from `services-grid.tsx` once `/services` (Phase 4.2) became a second real consumer needing the identical card — per code-standards.md §3, extracted on the second need, not preemptively. Data comes from `lib/services.ts`, not a local array |
| ProductCard | `apps/web/components/product-card.tsx` | Product card (`bezel="thick"` `BrowserFrame` screenshot, feature bullets, outbound "Explore product" link) | Home's `ProductsSection`, `/products` index | Same extraction pattern as `ServiceCard`, triggered by `/products` (Phase 4.3). Screenshot and title now link internally to `/product/[slug]`; "Explore product" stays the separate outbound link to `live_url`, per ui-rules.md §5 |
| StatsRow | `apps/web/components/stats-row.tsx` | Row of up to 4 `StatCallout`s from the `Stat` resource; grid sized to the count; renders nothing when empty | `ClosingCta`, `OurStory` (`max={2}`), `/pricing`, `/about-us` | Extracted at three consumers |
| CaseStudyCard | `apps/web/components/case-study-card.tsx` | Case study card (tilted `TabletFrame` w/ gradient ring, category tags, status badge) | `SelectedWork`, `/case-studies` index | Moved here from `(marketing)/_components/` once `/case-studies` (Phase 4.4) became the second route-level consumer its own code comment had pre-flagged — same rule as `ServiceCard`/`ProductCard` |

## Page-specific components (colocated under each route's `_components/`)

| Component | Route | Purpose | Notes |
|---|---|---|---|
| Hero | `(marketing)/page.tsx` | Headline/subhead (from `SiteSettings`), primary/secondary CTA, availability badge, `HeroShowcase` | Redesign pass: bigger/bolder type scale (up to `text-7xl`, `leading-[1.05]`), subtle radial-glow background (ui-rules.md §1). Fallback-only text gets 3-line mixed-color emphasis (brand-colored middle line) — the live `SiteSettings.hero_headline` already has real seeded content, so it renders big/bold but monochrome; a substring-matching hack to color-split arbitrary admin text was deliberately not built. The founding-year/location line ("Building since 2023 · Lagos, Nigeria") was removed at the user's request — the `location` prop was removed from `HeroProps` entirely rather than left unused |
| HeroShowcase | `(marketing)/page.tsx` | Tilted, overlapping 5-device screenshot composition directly under the hero CTAs | Per an explicit reference image from the user, matched exactly on request: 5 real screenshots (PharmacyCopilot, BusinessCopilot, SocietyLedger dashboard, SocietyLedger landing, Yazzy OS) in `TabletFrame`s at varying size/rotation/z-index, fanned out from a dominant center frame. Desktop-only (`hidden md:block`) — the overlapping/rotated composition doesn't hold up at mobile width. Originally 3 frames using `BrowserFrame` and 2 PharmacyCopilot screenshots (PC + POS) — revised per user feedback to `TabletFrame`'s thicker bezel and one PharmacyCopilot image only, once 3 new real screenshots were added to `apps/web/public/`. **Replaced `ShowcaseStrip`** (a single rotating-carousel screenshot section that used to sit right below Hero) — once Hero had its own strong device-showcase moment, a second near-identical screenshot carousel immediately after it was redundant, so `ShowcaseStrip` was deleted rather than left as dead/competing content |
| CaseStudyCard | `(marketing)/page.tsx` | Case study card (category tags, status badge, clickable) | Used only by `SelectedWork` now (`CaseStudyPreview` has its own bespoke row layout). Redesign pass fixed a real bug (category tags were independently `absolute`-positioned and rendered on top of each other with 2+ tags — now a `flex gap-2` row). Screenshot treatment now matches `HeroShowcase` exactly, per explicit user request with a reference image: a `TabletFrame` (not `BrowserFrame`) tilted `-rotate-2`/`rotate-2` and given a `brand`/`accent` gradient ring, alternating by an optional `index` prop (mirrors Hero's own alternating pattern) — straightens to `rotate-0` on hover. Letter-placeholder fallback kept for the rare case with no matching screenshot |
| CaseStudyPreview | `(marketing)/page.tsx` | Capped (3), alternating image-left/text-right (then reversed) list of real case studies, matched to the reference site's own "Recent Clients" section | Rebuilt from an initial small-tile card grid (matching that reference layout wasn't the original ask). Went through two column-sizing approaches before landing here: an equal `grid-cols-2` split rendered visibly larger than the reference on the user's actual browser (container-width-dependent, hard to verify by measurement alone) — replaced with an explicit `md:grid-cols-[440px_1fr]` (or `[1fr_440px]` on reversed rows, via `md:[&>*:first-child]:order-2`), pinning the image to a fixed, deterministic width regardless of viewport. `Link`-wrapped, `bezel="thick"` `BrowserFrame` screenshot (whole image clickable to `/case-study/[slug]`): frame gets a hover-lift + shadow transition, and the image itself gets a contained hover zoom (`group-hover:scale-[1.06]` inside an `overflow-hidden` wrapper) for a "good transition effect" per explicit user request. Section heading is explicitly centered (user request — the reference itself left-aligns it, a deliberate deviation). Only shows case studies with a matching real screenshot. `SelectedWork` further down Home keeps the small-tile grid — that one's still meant to be a grid, this one wasn't. Fixed alongside this: every marketing section's `px-[--space-container-x]`-style container padding was silently invalid CSS under Tailwind v4 (see progress-tracker.md's Phase 4 notes) — the real cause of this section (and every other) looking uncentered/full-bleed. |
| FeaturedProjects | `(marketing)/page.tsx` | Split dark/light-panel showcase of real shipped case studies, matched to the reference site's own "Featured Clients" section | Client component (needs the active-slide index for the pill list). Left panel: **clickable** name pills (a `Carousel` `index` prop lets a pill jump the carousel directly, not just wait for auto-advance — the pills were originally display-only per an earlier decision, reversed at the user's explicit request) synced both ways via `onIndexChange`. Right panel: `Carousel` (dots hidden, arrow controls remain) of `TabletFrame`-wrapped screenshots, each slide a `Link` to `/case-study/[slug]`, with the caption (numbered `Badge`, tagline, "Explore X") overlaid on the image via a compact bottom gradient scrim (`p-3`, single-color fade, no `via-` stop) rather than plain text below it; two dimmed/grayscale `TabletFrame`s peek from behind the active slide for depth, sized as **fixed widths** (`w-40`/`w-48`, not a percentage of the panel) so they read as clearly smaller and receded, not near-duplicate frames colliding with the main one. Split card has an explicit `md:min-h-[460px]` so the panel doesn't collapse to a cramped, squeezed box. Only shows case studies with a matching real screenshot. **Only the left panel is dark** (`bg-black`) — the outer `<section>` stays on the normal theme background; an earlier pass wrapped the whole section in a hardcoded dark bg + inverted heading, reading as one big black band rather than a light section with one dark panel inside it. Went through three build passes total (bare carousel → oversized/colliding split panel → this) — each flagged via `/recover` as an isolated, well-scoped gap rather than a foundational rethink. |
| TechStack | `(marketing)/page.tsx` | Static tech stack strip | Uses `TechStackStrip` primitive. Real brand logos now (user-supplied files in `apps/web/public/`) via `next/image` for every tech that has one; Tailwind still has no logo file so it keeps the Lucide `Palette` fallback. Logos render `unoptimized` — these source files are already tiny (1–7KB) and Next's resize/recompress pipeline visibly blurred them at ~40px display size |
| ServicesGrid | `(marketing)/page.tsx` | 9 static service cards, bento grid | Code-owned catalog, not DB-backed — links to `/services/[slug]` (Phase 4.2, shipped). Redesign pass ("professional/visually appealing" request): icon sits in a tinted rounded-square badge (`bg-brand/10`, `bg-white/15` on the highlighted card), an `ArrowUpRight` fades in bottom-right on hover, added a section subhead. The "AI Automation" card keeps its solid `bg-accent` fill from the earlier redesign. 9th card, **Accounting Software Automations**, added specifically so the 3-column grid divides evenly (8 left an unbalanced last row). Now a thin wrapper around `lib/services.ts` + `ServiceCard` — see those entries |
| ProductsSection | `(marketing)/page.tsx` | Megagig's own products, feature bullets, outbound "Explore product" link | Renders nothing if no published products. Screenshot frame matches `CaseStudyPreview`'s treatment exactly per user request: `bezel="thick"` dark `BrowserFrame`, hover-lift + shadow on the frame, contained hover-zoom (`group-hover:scale-[1.06]`) on the image. Now a thin wrapper around `ProductCard` — see that entry and the Products pages section below |
| SelectedWork | `(marketing)/page.tsx` | Exhaustive case study grid, `#selected-work` anchor target | First card spans 2 columns on desktop (featured slot) |
| PricingTeaser | `(marketing)/page.tsx` | Static pricing-category cards, "Custom quote" | No fixed-tier pricing table, per ui-rules.md §5. "AI Automation & Integration" gets the same solid-accent highlight treatment as `ServicesGrid`. Data now in shared `lib/pricing.ts`; each card links to its matching `/services/[slug]` page |
| QuoteCtaBand | `(marketing)/page.tsx` | Primary quote CTA + WhatsApp + direct contact | WhatsApp/contact info from `SiteSettings` |
| TestimonialsCarousel | `(marketing)/page.tsx` | Testimonial carousel | Company link omitted (never faked) if a testimonial has no `company_url` |
| FounderSpotlight | `(marketing)/page.tsx`, `/about-us` | Founder photo, pull-quote, bio, social links | Admin-managed (`SiteSettings` About & founder card) — every part conditional, hides entirely with no name/quote/bio. `tone` prop (default `background`) lets `/about-us` place it by position; exports `hasFounderContent()`. Photo renders `unoptimized` (uploaded photos live on the storage origin) |
| OurStory | `(marketing)/page.tsx` | Mission line (+ "Since {year}") + first 2 stats via `StatsRow` | Admin-managed (`SiteSettings` + `Stat`); renders nothing until there is a mission or stats |
| FaqAccordion | `(marketing)/page.tsx` | FAQ accordion | Renders nothing if no FAQs are published yet (none seeded as of Phase 4 — Phase 5 work) |
| ContactBlock | `(marketing)/page.tsx` | Contact info + `LeadForm` (source: `"home"`) | Redesigned into a single solid `bg-brand` rounded panel per a user-provided reference site, using our own token pair (brand panel + `accent`-filled submit button) rather than the reference's literal colors. `LeadForm` gets a new `tone="onBrand"` prop for this context. Fixed the same email-overflow bug as `Footer` (`min-w-0` + `break-all`, plus `overflow-hidden` on the panel as a hard backstop) |
| ClosingCta | `(marketing)/page.tsx` | 4 real trust stats + repeated CTAs | At the `ui-rules.md` §10 cap of 4 stats. Stats are the admin-managed `Stat` resource (`lib/stats.ts`), shown via shared `StatsRow`, reused by `/pricing` and `/about-us` |

## Services pages (Phase 4.2, shipped)

| Route | Purpose | Notes |
|---|---|---|
| `/services` | Index — full 9-card grid, no cap | Same `ServiceCard` + `lib/services.ts` data as Home's `ServicesGrid`, not a duplicate |
| `/services/[slug]` | Detail — hero, "what's included" bullets, "typical stack" logo row, real-evidence block (only where `lib/services.ts`'s `relatedWork` names a genuine `CaseStudy`/`Product` match), quote CTA to `/start-project?service=<slug>` | `generateStaticParams` (fully static — code-owned data, no DB round-trip). Hit a real Next.js 16 bug during build: `params` must be awaited (`Promise<{ slug: string }>`) — compiled clean and even passed `next build`, but `next dev` threw at runtime and 404'd every request until fixed. See progress-tracker.md Phase 4.2 notes |

`lib/services.ts` — the `SERVICES` catalog (title/description/icon/`whatsIncluded`/`stack`/`relatedWork`), extracted out of `services-grid.tsx` as the single shared source. `lib/tech-logos.ts` — the real brand-logo path map, extracted out of `tech-stack.tsx` for the same reason (both the Home tech-stack strip and each service detail page's stack row reference it now).

## Products pages (Phase 4.3, shipped)

| Route | Purpose | Notes |
|---|---|---|
| `/products` | Index — all published products, same `ProductCard` as Home | Server Component, fetches `getPublishedProducts()` directly (no props needed) |
| `/product/[slug]` | Detail — platform badges, screenshot gallery, description, feature bullets, Explore/Docs CTAs, quote CTA band | DB-backed (unlike Services): `generateStaticParams` fetches the product list at build time, `lib/products.ts`'s existing `revalidate: 60` keeps it fresh. `docs_url` link only renders when set (empty for all 4 products today — never faked) |

`Product.Platforms` — a real new field (`datatypes.JSONSlice[string]`, Go model → handlers → shared schema/type → admin `TagsField`), added specifically for this page rather than inferred/hardcoded, per explicit user decision. `lib/product-screenshots.ts`'s `getScreenshotsForSlug()` returns every real desktop/web screenshot for a slug (2 for PharmacyCopilot/BusinessCopilot; 1 for SocietyLedger/MedSafe) — the detail page's gallery, distinct from the single-shot lookup Home's card still uses. A second export, `getMobileScreenshotsForSlug()`, returns real mobile-app screenshots (currently PharmacyCopilot + BusinessCopilot, both 720×1600 portrait) rendered in a `TabletFrame` (plain device bezel, not `BrowserFrame`'s browser-chrome) under an "On mobile" sub-heading in the same gallery section. Adding these real mobile shots is what surfaced that BusinessCopilot's `Platforms` had been incorrectly Web-only — corrected to include Mobile once the evidence existed.

## Case studies pages (Phase 4.4, shipped)

| Route | Purpose | Notes |
|---|---|---|
| `/case-studies` | Index — flat grid, no filters (deferred per project-requirements.md §7), first card spans 2 columns on desktop | Same `CaseStudyCard` as `SelectedWork` |
| `/case-study/[slug]` | Detail — category tags/status badge/screenshot up top, then large pale numbered sections (`01 The Challenge`/`02 Our Solution`/`03 The Result`, mapping `Problem`/`WhatWeBuilt`/`Result`) in a two-column layout with a sticky sidebar (Live Site button + Tech Stack card), embedded testimonial (conditional), quote CTA band | DB-backed: `generateStaticParams` + the existing `revalidate: 60` ISR pattern, same approach as Products. Redesigned per a user-provided reference — sidebar moves above the narrative on mobile (`order-1 lg:order-2`) so the CTA isn't buried. `tech_stack` renders as plain text `Badge`s, not logo icons — free-form per-record text, not Services' fixed `stack` vocabulary. `CaseStudy.live_url` (new field, same pattern as `Product.docs_url`) gates the "Visit Live Site" button — empty for MegaPro ERP (no real domain known), never guessed |

Testimonial block reuses `TestimonialsCarousel`'s exact inner markup (quote, author, role/company, "Visit [Company]" link) without the `Carousel` wrapper — there's only ever one testimonial per case study, never several to rotate through. Fixed a real bug surfacing here: `CaseStudy.testimonial_id` (the case-study side of the two-way FK) had never actually been set by the seeder, so the testimonial never showed up despite being correctly linked from the `Testimonial` side — see progress-tracker.md's Phase 4.4 notes.

## Pricing page (Phase 4.5, shipped)

| Route | Purpose | Notes |
|---|---|---|
| `/pricing` | Full pricing page — hero, linked category cards, real trust stats, real testimonials, quote CTA band | Plain static route (no dynamic segment). Checked a user-provided reference site first (`WebFetch`) and found it uses real fixed-tier prices — flagged the conflict with this project's own locked custom-quote spec before building; user confirmed keep custom-quote, match the reference's structure/polish only, no invented prices. `TestimonialsCarousel` and `QuoteCtaBand` reused as-is, not rebuilt; stats come from the admin-managed `Stat` resource (`lib/stats.ts` via `StatsRow`) and category data from `lib/pricing.ts` (shared with Home's `PricingTeaser`) |

## Start a Project page (Phase 4.6, shipped)

| Route | Purpose | Notes |
|---|---|---|
| `/start-project` | Primary conversion form — full `LeadForm` variant | Dynamic route (reads `searchParams`), not static. `?service=<slug>` pre-fills `project_type` via `getServiceBySlug()` + `defaultProjectType` |

Every pricing card (Home's `PricingTeaser`, the full `/pricing` page) now links its primary "Get a Quote →" action straight to `/start-project?service=<slug>`, replacing "Custom quote" as the prominent text — per explicit user request that clicking a pricing category should let a visitor jump straight into requesting a quote. "See what's included →" remains as a smaller secondary link to the matching `/services/[slug]` page.

## Team page (Phase 4.8, shipped)

| Route | Purpose | Notes |
|---|---|---|
| `/team` | Icon-chip hero (mission line, location pill, stats), optional founding story, centred grid of published team members, quote CTA band | Admin-managed (`TeamMember`, `Stat`, `SiteSettings` mission/address/founding story; ISR revalidate 60). Redesigned 2026-09-19 against a user-supplied reference (an About page with an icon-chip headline and a people section), adapted to Nigeria. Every optional block hides when its data is empty; empty state when no member is published |

Components colocated in `team/_components/` until a second page needs them: `TeamHero` (headline with three tinted `rounded-full` icon chips — Users / Code2 / Sparkles — inline in the h1 and scaling `h-9`→`md:h-14`; faint dot grid masked toward the edges over Home's low-opacity brand/accent glow, all token colors via `color-mix`/`var`; location `MapPin` pill; primary "Start a project" + secondary "Meet the team" (`#team`) buttons; `StatsRow`), `TeamStory` (centred `SectionHeading` + paragraphs; hidden when `founding_story` is empty), and `TeamMemberCard` (`rounded-2xl` `<article>` with a `from-brand/15 via-brand/5 to-accent/15` wash, a circular `h-32 sm:h-36` portrait with `ring-4 ring-surface-raised` inside a dashed `border-brand/40` orbit ring that rotates 45° on hover, name, `Badge variant="brand"` role pill, then a `border-t` row of icon-only round GitHub/LinkedIn/X buttons with `aria-label="{name} on {network}"`, rendered only for links that are set; hover lifts `-translate-y-1`; `object-top` portrait or an initials fallback). The grid is a **flex-wrap, centred** row with fixed column widths (`sm` 2-up, `lg` 4-up) so an odd member count stays centred. Shared `lib/text.ts` `splitParagraphs()` now feeds `FounderSpotlight`, `AboutStory` and `TeamStory`.

## About page (Phase 4.7, shipped)

| Route | Purpose | Notes |
|---|---|---|
| `/about-us` | Mission hero, founding story, stats, values, timeline, founder spotlight, how-we-work steps, products + case-study proof strip, quote CTA band | Fully admin-managed (`SiteSettings`, `Stat`, `AboutItem`, plus existing Product/CaseStudy). Every section is optional and hides when empty; tones alternate by position, not fixed order |

Components live in `(marketing)/about-us/_components/`: `AboutSection` (shell + `SectionTone`), `AboutStory`, `ValuesGrid` (plain cards, brand accent bar, no icons), `Timeline` (vertical `border-l` rule + ring dots, free-text label above title), `ProcessSteps` (large pale `text-brand/15` 01/02/03 numerals, same treatment as case-study detail), `ProofStrip` (`ProductCard` row + up to 3 `CaseStudyCard`s with "All …" links).

## Admin components (`apps/admin/`)

| Component | Path | Purpose | Used by | Notes |
|---|---|---|---|---|
| TagsField | `apps/admin/components/forms/fields/tags-field.tsx` | Free-text chip/tag input bound to a `string[]` field (Enter or `,` commits a tag) | `CaseStudy.category_tags`/`tech_stack`, `Product.feature_bullets`, `Blog.tags` | New `"tags"` `FieldType`/`ColumnFormat` added to `lib/resource.ts`, wired into `form-builder.tsx` and `cell-renderers.tsx` (table shows badge chips, +N overflow). Distinct from `CheckboxGroupField`, whose options are a fixed predefined set — this is for open-ended text tags. Added because Grit's generator maps every `string_array` field to `type: "images"` (an image-upload dropzone), which is wrong for plain-text tags. |
| SiteSettings page (now incl. About & founder card) | `apps/admin/app/(dashboard)/site-settings/page.tsx` | Single-record settings form (not a DataTable) for the SiteSettings singleton — contact info, hero copy, social links | Sidebar nav (admin-only, above the resources list) | Hand-built per `build-plan.md` step 1.10; uses `apps/admin/hooks/use-site-settings.ts` (React Query get/update against `/api/site-settings`) |
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
