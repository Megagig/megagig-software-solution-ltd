# progress-tracker.md — Megagig Website Build Progress

> **Living document.** Checkboxes mirror `build-plan.md` exactly, phase for phase, feature for feature. Auto-updated after each feature ships (check the box the moment it's done and verified, not before). A new session should be able to read only this file and `build-plan.md` and know precisely where the project stands — no scrollback required.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done & verified

---

## Phase 0 — Scaffold & infrastructure
- [x] `grit new megagig-site --triple --next` run
- [x] `.env` configured from `.env.example`
- [x] `docker compose up -d` verified healthy — Postgres (`healthy`), Redis (`healthy`), MinIO (`/minio/health/live` → 200), Mailhog (UI → 200)
- [x] Base `User`/auth model confirmed — matches `architecture.md` §6 (`admin` role sufficient for v1). `apps/api/internal/models/user.go` carries the full Grit "kitchen sink" scaffold (`RoleAdmin`/`RoleEditor`/`RoleUser`, Session/2FA/SSO/SAML/tickets/backups/feature-flags/webhooks/GDPR/access-reviews) — left in place, dormant, toggleable via `MODULE_*` env flags per explicit user decision: no deletions without approval. Nothing here blocks or conflicts with `project-requirements.md`'s single-admin-role v1 scope.
- [x] `ui-tokens.md` values wired into `packages/shared/themes` — `packages/shared/themes/tokens.css`, Tailwind v4 CSS-first `@theme`, imported by both `apps/web` and `apps/admin` (single source of truth). Both apps upgraded `tailwindcss`/`postcss` config to v4 (`@tailwindcss/postcss`) as part of this. Admin's prior Grit boilerplate multi-theme system (`[data-theme]` atlas/aurora/pulse/midnight, doubled-up classes like `bg-bg-secondary`) was fully renamed across 98 files to the ui-tokens.md-named utilities (`bg-brand`, `bg-surface`, `text-foreground-muted`, etc.); admin's separate `(auth)` login-page theme engine (`packages/shared/themes.ts`) is untouched/out of scope.
- [x] Global fonts + base Tailwind config set — Inter + JetBrains Mono loaded via `next/font/google` in both `apps/web/app/layout.tsx` and `apps/admin/app/layout.tsx`. Fixed a wiring bug found during this verification pass: Inter's `next/font` variable was named `--font-display` (unused anywhere), so the `font-sans` utility was silently falling back to `tokens.css`'s static system-font list instead of rendering the actual self-hosted Inter — renamed to `--font-sans` in both layouts to match how JetBrains Mono was already correctly wired to `--font-mono`.
- [x] Dev servers verified: API `:8080` (`/api/health` → 200, `/studio` → 200), Web `:3000` (→ 200), Admin `:3001` (→ 200) — all three already running from a prior session; confirmed live rather than restarted.

## Phase 1 — Core content resources
- [x] Upload — confirmed already present from base scaffold, unchanged
- [x] TeamMember resource generated + verified (`grit generate resource`)
- [x] Testimonial resource generated + verified — `case_study_id` made nullable (optional) to match `architecture.md`'s "CaseStudy, nullable" spec; generated `binding:"required"` removed
- [x] CaseStudy resource generated + verified — `category_tags`/`tech_stack` typed `string_array`; nullable `testimonial_id` (belongs_to Testimonial) added by hand as a follow-up field (Grit has no CLI for adding a field to an existing resource — 5-layer manual edit: model, schema, type, admin resource, per the grit skill's documented pattern)
- [x] Product resource generated + verified — `feature_bullets` typed `string_array`; `screenshots:many_to_many:Upload` added (architecture.md calls for multiple screenshots; build-plan.md's literal generate command omitted any image field entirely)
- [x] JobOpening resource generated + verified
- [x] FAQ resource generated + verified
- [x] BlogPost resource generated + verified — extended the **existing** `Blog` resource (already shipped pre-Phase-1: model/service/handler/admin, own hand-rolled `/api/admin/blogs` endpoint) rather than generating a parallel resource. Added `author_id` (belongs_to TeamMember), `tags` (string_array), `seo_title`, `seo_description` across model + handler (hand-rolled request DTOs, not auto-bound) + shared schema/type + admin resource. Kept the existing `Image` (string URL) and `Content` field names as-is rather than converting to `cover_image_id`/`Body` — avoids reworking a working feature for a naming-only gain; noted here as the deliberate divergence from architecture.md's exact field names.
- [x] Lead resource generated + verified — status/source/project_type/budget_range left as plain strings (matches the existing `User.Role` convention: app-level Go constants, not DB enums). Status badge coloring is explicitly Phase 2 scope, not done here.
- [x] SiteSettings singleton hand-built + verified — model, service (get-or-create), handler, public `GET /api/v1/site-settings` + admin-only `PUT`, shared schema/type, dedicated non-DataTable admin page at `/site-settings` (added to sidebar nav, admin-gated)
- [x] Seed data added — admin user/blogs already existed and were skipped (idempotent); added `SeedSiteSettings` (placeholder contact info/hero copy/pricing blurbs) and `SeedDemoContent` (2 case studies, 2 products, 1 testimonial — PharmacyCopilot/BusinessCopilot placeholders, real content is Phase 5). Verified via `go run ./cmd/seed`.
- [x] End-to-end verification — Go API builds clean; `apps/admin` and `apps/web` both `tsc --noEmit` clean; all 7 new protected list endpoints return 401 (unauthenticated) confirming registration; public `/api/v1/site-settings` returns seeded data; all 9 relevant admin pages return 200

**Known gaps carried forward (not blocking Phase 1, tracked for later phases):**
- No public/published-only read routes exist yet for CaseStudy, Product, Testimonial, TeamMember, FAQ (only Blog has one, hand-built pre-Phase-1). `grit generate resource` never creates these — Phase 4 (when `apps/web` pages actually need to fetch this content) must hand-add a `ListPublished`/`GetBySlug`-style public route + service method per resource, mirroring Blog's existing pattern, per `architecture.md` rule #8.
- ~~Generated services never call `.Preload()`~~ — **corrected in Phase 2**: this was wrong, based on inspecting unused `internal/services/*.go` files. The actual generated `List` handlers (`paginate.List[T]` pattern) do Preload correctly. See Phase 2 notes below.
- Found and fixed a systemic admin-resource generation bug while verifying: every `belongs_to:Upload` relationship (`hero_image`, `photo`, `avatar`, `screenshots`) referenced a `.name` display field that doesn't exist on the `Upload` model (it's `original_name`) — fixed across TeamMember, CaseStudy, Testimonial, Product.
- Added a new `"tags"` admin field/column type (`apps/admin/lib/resource.ts`, `TagsField` component, `form-builder.tsx`, `cell-renderers.tsx`) since no free-text array/tag input existed — the generator had been mapping every `string_array` field to `type: "images"` (an actual image-upload dropzone), which would have made `category_tags`/`tech_stack`/`feature_bullets`/`tags` fields unusable. Log this in `ui-registry.md`.
- Set `DisableForeignKeyConstraintWhenMigrating: true` in `apps/api/internal/database/database.go` — the genuine two-way `CaseStudy` ↔ `Testimonial` belongs_to relation broke GORM's AutoMigrate ordering ("relation does not exist"). Referential integrity is already enforced at the service layer for every model, so this wasn't previously load-bearing.

**`/review` pass (2026-09-17) found and fixed 4 real issues** — the manual "5-layer" field addition for `CaseStudy.testimonial_id` was incomplete when first done; caught by a dedicated review before Phase 3, not caught by the build/type-check/smoke-test verification used throughout Phase 1 (those checks confirm the code runs, not that every field is wired end-to-end):
1. **[Critical, fixed]** `CaseStudy.testimonial_id` was a dead field — `Create`/`Update`/`Patch` handlers never read it from the request body, and no handler method ever `Preload("Testimonial")`d it. Fixed all three write paths + added `Preload("Testimonial")` to `List`/`GetByID`/`Create`/`Update`/`Patch`. Verified live: set via `PUT`, confirmed both `testimonial_id` and the nested `testimonial` object round-trip correctly.
2. **[Important, fixed]** `Testimonial.Create` still had `binding:"required"` on `case_study_id` *and* `avatar_id` in the handler's request struct, independent of the model/schema/form all being marked optional — creating a "general" testimonial not tied to a case study or avatar failed with a 422. Removed both `required` tags; also fixed the shared Zod schema, TS type, and admin form field for `avatar_id` (same nullable spec in `architecture.md`, previously only `case_study_id` had been addressed). Verified live: testimonial now creates successfully with both fields omitted.
3. **[Important, fixed]** `Blog.Author` was never `Preload()`ed anywhere in `blog_service.go` (`List`, `ListPublished`, `GetByID`, `GetBySlug`, `Update`) — `author_id` saved correctly but the nested author object (used by the admin table's `author.name` column) was always empty. Added `Preload("Author")` to all five methods.
4. **[Minor, fixed]** `--color-status-*` tokens (used by the new `LeadStatusBadge`) were only defined in `:root`, never overridden for `.dark` — added dark-mode values to both `tokens.css` and `ui-tokens.md`, following the same brightening pattern as the other semantic colors (success/warning/danger/info).

## Phase 2 — Admin panel polish
- [x] Dashboard stats/chart/activity widgets built — added a "Megagig overview" row (New leads this week, Published case studies, Published products) above the existing generic per-resource widgets. The generic "By resource" section (pre-existing, `ResourceStatCard`/`ResourceLatestTable`) already gives every new resource a free Total + 30-day sparkline + Latest-N once registered in `resource_stats_dispatch.go` (auto-injected by `grit generate`) — satisfies the "ChartWidget (leads over 30 days)" and "ActivityWidget (latest 10 leads)" asks without new bespoke widgets. Only the 3 site-specific numbers (7-day window, published-only filters) needed hand-building, reusing existing `paginate` package query params (`?created_since=7d`, `?published=true`) — zero new endpoints.
- [x] Leads resource UI polish — status badge coloring (`LeadStatusBadge`, using `--color-status-*` tokens 1:1 per ui-rules.md §13), status filter dropdown (table + form), status field upgraded from free-text to a `select` (prevents a typo silently breaking the badge/filter mapping). Internal-notes textarea was already present from Phase 1 generation, no change needed.
- [x] Admin routes confirmed behind auth — `AdminLayout` (`components/layout/admin-layout.tsx`) already redirects to `/login` on `isError` or no user; pre-existing, verified not rebuilt.
- [x] Admin subdomain + `robots.txt` disallow configured — added `apps/admin/app/robots.ts` (Next.js Metadata API route, disallow-all). Actual subdomain DNS/hosting is Phase 8 deployment work, correctly out of scope here.

**Backend fixes made in support of the above (not resource-specific, so noted here):**
- `CaseStudy`/`Product` list handlers didn't support `?published=true` filtering at all (the admin table's own "Published" filter checkbox — generated in Phase 1 — was silently non-functional server-side). Added `.With("published", ...)` to both.
- `Lead` list handler had no status filter support. Added `.With("status", c.Query("status"))`.
- **Correction to a Phase 1 note**: progress-tracker previously claimed "generated services never call `.Preload()` on belongs_to relations." That was based on inspecting the unused `internal/services/*.go` files. The actual generated `List` handlers (`paginate.List[T]` pattern) *do* call `.Preload()` correctly (confirmed: `CaseStudy` preloads `HeroImage`, `Product` preloads `Screenshots`) — the `internal/services/case_study.go`-style files are dead code from an older/unused code path, not what's actually wired in `routes.go`. No cross-cutting Preload gap exists; retracting that item.

## Phase 3 — Public site: global chrome
- [x] `(marketing)` navbar + footer layout built — retrofitted `apps/web` into a literal `app/(marketing)/` route group per `architecture.md` §4 (previously flat `app/page.tsx` + `app/blog/`, chrome applied via a pathname-check `AppChrome.tsx`); moved `page.tsx`/`blog/` in, deleted `AppChrome.tsx`, chrome now lives in `(marketing)/layout.tsx`. Also deleted the unused `app/(auth)/` route group (Grit's default customer-account scaffold — confirmed out of scope, no public visitor accounts, per `project-requirements.md` §7).
- [x] WhatsApp floating action button built — `WhatsAppFab`, number sourced from `SiteSettings.whatsapp_number` via a server-side fetch in `(marketing)/layout.tsx` (plain `fetch`, not the client-only axios instance in `lib/api.ts`). Renders nothing if the fetch fails or the number is unset.
- [x] Shared UI primitives built (Button, Card, Badge, SectionHeading, Accordion, Carousel, StatCallout, TechIcon/TechStackStrip) — all in `apps/web/components/ui/`, logged in `ui-registry.md` with full class-level detail via `/imprint`. Hand-built with the already-installed CVA/clsx/tailwind-merge stack rather than the shadcn CLI `library-docs.md` calls for — see the note in `ui-registry.md` for why (token vocabulary mismatch makes the CLI's output require a full rewrite anyway). Installed `@radix-ui/react-accordion` as the one genuinely-worth-it new dependency, for real keyboard/ARIA accordion behavior.
- [x] Dark/light theme toggle verified end-to-end — `ThemeToggle` (mirrors `apps/admin`'s `DarkModeToggle` pattern, duplicated rather than shared per code-standards.md §3), flips `.dark` on `<html>`, persists to `localStorage`. Verified live against the running dev server: navbar/footer/FAB render real seeded `SiteSettings` data (WhatsApp number, contact email/phone, social links), `/blog` and `/` correctly get chrome, `/forms/[token]` correctly stays chromeless, `/services` etc. correctly 404 (Phase 4 not started yet). `tsc --noEmit` and `next build` both clean.

**Rebuilt from scratch (not patched):** the pre-existing `navbar.tsx`/`footer.tsx`/root `layout.tsx` metadata were 100% unmigrated Grit demo scaffold — "Built with Grit" copy, links to Grit's docs/GitHub, an "Admin" nav link, and CSS classes (`text-text-secondary`, `bg-bg-tertiary`) that don't exist in `ui-tokens.md`'s token set at all. Full rebuild against `ui-rules.md` §3, not a diff.

**Known gap carried forward (not blocking Phase 3):** `apps/web/app/page.tsx`'s Home content (now `(marketing)/page.tsx`) is untouched Grit demo content (framework marketing copy, `usePublicBlogs` recent-posts section) — moving it into the new route group didn't fix its content, since rebuilding Home itself is explicitly Phase 4.1 scope, not Phase 3 chrome work. Root `not-found.tsx`/`error.tsx` also still use pre-existing raw shadcn-default classes (`text-primary`, `bg-red-500/10`) not in `ui-tokens.md` — pre-existing debt, untouched here since it's outside chrome/primitives scope; worth a pass whenever those files are next touched.

## Phase 4 — Public site: pages
- [ ] Home (`/`)
- [ ] Services index + detail (`/services`, `/services/[slug]`)
- [ ] Products index + detail (`/products`, `/product/[slug]`)
- [ ] Case studies index + detail (`/case-studies`, `/case-study/[slug]`)
- [ ] Pricing (`/pricing`)
- [ ] Start a project (`/start-project`)
- [ ] Contact (`/contact-us`)
- [ ] About (`/about-us`)
- [ ] Team (`/team`)
- [ ] Careers (`/careers`)
- [ ] Blog index + detail (`/blog`, `/blog/[slug]`)
- [ ] Legal pages (`/privacy`, `/legal`)

## Phase 5 — Real content population
- [ ] PharmacyCopilot case study written + published
- [ ] BusinessCopilot case study written + published
- [ ] PharmacyCopilot + BusinessCopilot Product entries created
- [ ] SiteSettings filled with real contact details (placeholders removed)
- [ ] Initial FAQ set published
- [ ] Team member(s) added
- [ ] Careers/Blog empty-states verified to look intentional

## Phase 6 — Lead pipeline wiring
- [ ] `lead-notify.html` + `lead-confirm.html` email templates built
- [ ] All three lead entry points wired to `POST /api/v3/leads` with correct `source`
- [ ] Rate limiting on the public leads route
- [ ] Basic spam mitigation (honeypot or equivalent)
- [ ] Full loop manually verified (submit → DB row → 2 emails → visible + status-editable in admin)

## Phase 7 — SEO, performance, accessibility pass
- [ ] Per-page metadata across all public routes
- [ ] `sitemap.xml` + `robots.txt` (web: allow; admin: disallow)
- [ ] Image optimization audit
- [ ] Lighthouse pass (Home, one case study, one product, Pricing) — all green
- [ ] Keyboard/screen-reader pass (navbar, forms, accordion, carousel)

## Phase 8 — Deployment
- [ ] Production Postgres/Redis/S3-compatible storage stood up
- [ ] `apps/api` deployed
- [ ] `apps/web` deployed to Vercel
- [ ] `apps/admin` deployed to Vercel (own subdomain)
- [ ] DNS + SSL verified on all hosts
- [ ] Production lead pipeline smoke-tested (real Resend delivery)

## Phase 9 — Post-launch backlog (not started; tracked, not built)
- [ ] File attachment on quote form
- [ ] Case-study filter chips
- [ ] Multi-role admin (editor vs admin)
- [ ] Blog scheduled publishing
- [ ] `/brand` page with logo kit
- [ ] Analytics integration
- [ ] i18n / multi-language

---

## Session log

> One line per work session — what shipped, what's next. Newest entry on top. Keep entries short; detail belongs in commit messages, not here.

- 2026-09-17: Ran `/review` against Phase 3, then fixed everything it found. **[Critical]** `lib/site-settings.ts`'s fetch had no revalidation strategy and the code comment claiming "Next respects the origin's Cache-Control header" was factually wrong — Next's Data Cache only honors `fetch()`'s own `cache`/`next.revalidate` options. Confirmed via `next build` output (`○ Static` for `/` and `/blog`, no revalidate) that `SiteSettings` was being frozen at build time, meaning admin edits to the WhatsApp number/contact info would never appear without a redeploy — directly contradicting `library-docs.md`'s revalidate convention and `project-requirements.md` §6. Fixed with `next: { revalidate: 60 }`; rebuilt and confirmed the build output now shows `Revalidate: 1m`. **[Important]** Discovered the review flagged that most new primitives were never exercised at runtime — while addressing this, also found the pre-existing `__tests__/navbar.test.tsx`/`footer.test.tsx` were fake stubs testing locally-defined mock components, not the real ones (one assertion was already failing independent of anything this session touched). Rewrote both against the real components and added a real test file for every other Phase 3 component (Button, Card, Badge, SectionHeading, Accordion, Carousel, StatCallout, TechIcon, ThemeToggle, WhatsAppFab, BackToTop) — 13 files, 34 tests. This caught a genuine bug: `Carousel` was typed `children: ReactNode[]` and called `.map()` directly, which throws for exactly one slide (React only array-wraps 2+ JSX children, a single child arrives bare) — fixed with `Children.toArray()`. **[Minor]** Navbar's scroll-based background state initialized to `false` and only corrected in a post-mount `useEffect`, causing a one-frame flash of the transparent/top-of-page style when Home is reloaded already scrolled down — fixed by switching to an isomorphic `useLayoutEffect` (runs before paint client-side, falls back to `useEffect` during actual server rendering to avoid the SSR warning). All 34 tests pass, `tsc --noEmit` and `next build` both clean, re-verified live against the running API.
- 2026-09-17: Closed out Phase 3 — public site global chrome. Retrofitted `apps/web` into a literal `(marketing)` route group (architecture.md §4), deleted the unused `(auth)` customer-account scaffold and the old pathname-based `AppChrome.tsx`, and rebuilt Navbar/Footer from scratch (previous versions were unmigrated Grit demo branding using CSS classes that don't exist in `ui-tokens.md`). Built 8 shared UI primitives (Button/Card/Badge/SectionHeading/Accordion/Carousel/StatCallout/TechIcon) hand-rolled with CVA rather than the shadcn CLI `library-docs.md` names — the token vocabulary mismatch made the CLI not worth running; installed `@radix-ui/react-accordion` as the one real new dependency. Built `WhatsAppFab` and `ThemeToggle` (mirrors admin's `DarkModeToggle`). Verified live end-to-end against the running dev API with real seeded `SiteSettings` data; `tsc`/`next build` both clean. Logged full class-level detail in `ui-registry.md` via `/imprint`. Next: Phase 4 — public site pages, starting with Home (currently still Grit demo placeholder content) once the primitives above are consumed page by page.
- 2026-09-17: Rebranded the admin login/auth pages — the `(auth)` theme engine (`packages/shared/themes.ts`, separate from `tokens.css`/ui-tokens.md and explicitly out of scope until now) had Grit's default indigo (`#4f46e5`) for the hero panel and social-button accent. Changed `atlas` theme's `accent`/`heroBg` to match Megagig's actual brand tokens (`--color-accent` green, `--color-brand` blue) — `primary` already matched by coincidence. Replaced the "Built with Grit — Go + React framework" footer line with a dynamic copyright (`© {year} {brand.name} Ltd.`, using `brand.config.ts`'s name so a future rebrand stays in sync), and fixed the admin app's leftover Grit meta title/description. Verified live: hero panel now renders `#2563eb`, no more Grit branding text anywhere on the login page.

- 2026-09-17: Ran `/review` against Phase 1 + Phase 2 before starting Phase 3. Found 4 real issues by reading actual handler code and testing live against the running API rather than trusting prior smoke tests: `CaseStudy.testimonial_id` was completely dead (never bound in Create/Update/Patch, never Preloaded — the Phase 1 "follow-up field" claim was wrong), `Testimonial.Create` still hard-required `case_study_id`/`avatar_id` despite being designed optional, `Blog.Author` was never Preloaded anywhere, and `--color-status-*` had no dark-mode values. Fixed all 4, verified each live (created/linked/unlinked/deleted real test records via curl), restored demo data afterward. Next: Phase 3 — public site global chrome (navbar/footer, WhatsApp FAB, shared UI primitives, theme toggle).
- 2026-09-17: Closed out Phase 2. Added Megagig-specific dashboard stats (new leads this week, published case studies/products) alongside the pre-existing generic per-resource widgets; built Lead status badge coloring + status filter (table + form, upgraded from free-text to select); added `apps/admin/app/robots.ts` (disallow-all). Fixed two real backend gaps found while wiring this up: `CaseStudy`/`Product` list handlers didn't support `?published=true` (their admin table's own Published filter was silently non-functional), and `Lead` had no status filter at all — both fixed via the existing `paginate` package's `.With()` mechanism, verified live against the running API (created/filtered/deleted a test lead). Corrected a wrong Phase 1 note: generated handlers do Preload correctly (`paginate.List[T]` pattern), the earlier claim was based on inspecting dead/unused service files. Confirmed admin auth-gating and robots.txt were the only structural asks; auth-gating was already solid pre-existing. Next: Phase 3 — public site global chrome (navbar/footer, WhatsApp FAB, shared UI primitives, theme toggle).
- 2026-09-17: Closed out Phase 1. Generated TeamMember, CaseStudy, Testimonial, Product, JobOpening, FAQ, Lead via `grit generate`; extended the existing `Blog` resource into the full `BlogPost` field set instead of duplicating it; hand-built the `SiteSettings` singleton (model/service/handler/routes/admin page). Fixed several real bugs surfaced during verification: a broken `.name` display field on every Upload relationship (should be `original_name`), a missing tag-input field type (string_array fields were rendering as image-upload dropzones), and a GORM AutoMigrate failure from the two-way CaseStudy↔Testimonial relation (fixed via `DisableForeignKeyConstraintWhenMigrating`). Seeded placeholder SiteSettings + demo CaseStudy/Product/Testimonial rows. All builds/type-checks clean; all endpoints and admin pages smoke-tested. Next: Phase 2 — admin panel polish (dashboard widgets, Lead status badges/filter, auth-gating confirmation, subdomain + robots.txt).
- 2026-09-16: Closed out Phase 0. Verified Docker infra healthy (Postgres/Redis/MinIO/Mailhog), confirmed the auth model matches `architecture.md` §6 (kept the full Grit enterprise module set dormant/untouched per explicit no-delete-without-approval decision), fixed a font-wiring bug (Inter was bound to an unused `--font-display` var instead of `--font-sans`, so it never actually rendered) in both `apps/web` and `apps/admin` layouts, and confirmed all three dev servers + GORM Studio respond 200. Next: start Phase 1 — generate the core content resources (TeamMember, Testimonial, CaseStudy, Product, JobOpening, FAQ, BlogPost, Lead, SiteSettings).
- 2026-09-16: Wired `ui-tokens.md` into `packages/shared/themes/tokens.css` (Tailwind v4 CSS-first), upgraded `apps/web` + `apps/admin` to Tailwind v4, and renamed admin's entire legacy multi-theme class system (98 files) to match. Both dev servers smoke-tested (200 OK, correct tokens in compiled CSS, no console errors). Next: finish remaining Phase 0 items (docker services, fonts decision, API dev server) before starting Phase 1 resources.
