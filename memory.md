# Memory — Phase 4 public site: Home + Services/Products/Case studies/Pricing/Start-project/Contact built

Last updated: 2026-09-19

## What was built

**Home (`/`) is complete** (all §5.1 sections, redesigned several times against the desishub.com reference, using our own colors). Components live in `apps/web/app/(marketing)/_components/`.

**Phase 4 pages shipped** (each got its own `/architect` pass; detail in `context/progress-tracker.md` Phase 4.2–4.6 notes and `context/ui-registry.md`):
- `/services`, `/services/[slug]` — static catalog in `lib/services.ts` (9 services incl. Accounting Software Automations), shared `components/service-card.tsx`, `lib/tech-logos.ts`.
- `/products`, `/product/[slug]` — shared `components/product-card.tsx`; desktop gallery + "On mobile" phone-framed gallery via `lib/product-screenshots.ts`.
- `/case-studies`, `/case-study/[slug]` — shared `components/case-study-card.tsx`; detail page redesigned to numbered 01/02/03 sections + sticky sidebar (Live Site button, Tech Stack).
- `/pricing` — custom-quote cards, reuses `TestimonialsCarousel`/`QuoteCtaBand`; shared `lib/pricing.ts`, `lib/trust-stats.ts`.
- `/start-project` — `LeadForm variant="full"` (phone, company, project-type + budget dropdowns with NGN↔USD display toggle via `lib/budget-ranges.ts`, services-interested checkboxes). `?service=<slug>` pre-fills project type.
- `/contact-us` — same `bg-brand` panel as Home's `ContactBlock`, full `LeadForm` (`source="contact"`), WhatsApp row.
- Sitewide fixes: footer/contact email overflow, `ContactBlock`/`Footer`/`ServicesGrid`/`TechStack` redesigns, tech-stack now uses real logos.

**Backend/schema additions** (each done across model → handlers → shared Zod schema/TS type → admin resource): `Product.Platforms`, `CaseStudy.LiveURL`, `Lead.ServicesInterested`. Public read routes for case-studies/products/testimonials/faqs live under `/api/v1/public/*`.

## Decisions made

- **Custom-quote only, no fixed prices** (user confirmed even after seeing the reference site uses real fixed tiers). Never invent prices, stats, domains, screenshots, or copy specifics — anti-fabrication is applied throughout; conditional-render anything without real data (empty `docs_url`, MegaPro ERP `live_url`, no Key Results stats).
- **`Lead.Create` stays protected-only until Phase 6** (rate limiting + spam mitigation + emails). User explicitly chose to wait — forms build and validate but submit returns 401. Not a bug.
- Extract a shared component/data file only when a second real consumer appears (ServiceCard, ProductCard, CaseStudyCard, lib/pricing, lib/trust-stats).
- `CaseStudy.tech_stack` renders as plain text badges (free-form text; don't match against TECH_LOGOS).
- Budget-range submitted value is a canonical key; currency toggle only changes labels. USD rate (~₦1,600/$) in `lib/budget-ranges.ts` is a placeholder for the user to adjust.
- User manages their own dev servers — don't start/stop them.

## Problems solved

- **Tailwind v4:** `px-[--token]` compiled to invalid CSS (no `var()`); must use `px-(--token)`. Fixed in 17 files.
- **Next 16:** dynamic route `params` is a Promise — must `await` (passes `next build` but throws under `next dev`).
- **New nested dynamic route folders** aren't hot-detected by Turbopack dev — need a dev-server restart.
- **Seeder:** `FirstOrCreate(&x, struct)` matched on the whole struct and duplicated rows; fixed with `.Where(...).Attrs(struct).FirstOrCreate(&x)`. Seeders never update existing rows — backfill existing dev-DB rows with direct SQL (`docker exec -i ... psql -c`; `-i` is required).
- `CaseStudy.testimonial_id` was never set by the seeder (only the reverse FK) — now synced every seed run.
- Go API `air` watcher can silently die — a Go change with no effect means check whether `air` is running.
- **Do NOT run `rm -rf .next && next build` while the user's `next dev` is running** — it wipes their cache and caused Google-font 500s on every page. Verify with `tsc --noEmit` + `vitest run` instead.
- Native `<select>` options are white-on-white on the `onBrand` tone; fixed with `[&>option]:bg-surface-raised [&>option]:text-foreground`.
- Admin `/resources/*` 404s were a stale admin dev server (routes exist and compile), not a code bug.

## Current state

- `tsc --noEmit` clean (web + admin), 35 vitest tests pass, `go build` clean as of last check. Last full `next build` (before `/contact-us` edits settled) was clean.
- **All Phase 4 work is uncommitted** in git (last commit is Phase 3 chrome).
- Phase 4 checklist in `context/progress-tracker.md`: Home, Services, Products, Case studies, Pricing, Start a project, Contact are `[x]`. Remaining: **About, Team, Careers, Blog, Legal**.
- Known gaps: Home section components and Phase 4 pages have no unit tests (verified via curl/tsc only) and Home hasn't had its `/review` pass; `/blog` and `/blog/[slug]` are still unmigrated Grit scaffold using dead token classes (`bg-bg-hover`, `text-text-muted`) and client-side fetch; root `not-found.tsx`/`error.tsx` use raw non-token classes; no FAQs seeded; all 4 products have empty `docs_url`; `/product/[slug]?service=` select pre-fill is code-verified but not browser-verified (curl can't see it).

## Next session starts with

Run `/architect` for **About (`/about-us`)** per `context/build-plan.md` order (About → Team → Careers → Blog → Legal). About is static founding story + stats — check `project-requirements.md` §5.8 and reuse `OurStory`/`FounderSpotlight`/`lib/trust-stats.ts` real content instead of inventing new facts. Consider a browser check of the `/start-project` dropdown pre-fill and a `/review` pass before Phase 4 is closed.

## Open questions

- Should the USD exchange-rate placeholder in `lib/budget-ranges.ts` be replaced with a real figure?
- Blog pages need a full migration to design tokens/server components — confirm approach when Blog's turn comes.
- Phase 6 must still resolve the compact contact form vs. required Lead fields conflict (see progress-tracker Phase 4 notes).
