# Memory — Phase 0 completion, Phase 1 (content resources), Phase 2 (admin polish), review fixes, login rebrand

Last updated: 2026-09-17

## What was built

**Phase 0 (closed out):**
- Verified Docker infra healthy (Postgres/Redis/MinIO/Mailhog).
- Fixed a font bug: Inter's `next/font` variable was bound to an unused `--font-display` CSS var instead of `--font-sans` in both `apps/web/app/layout.tsx` and `apps/admin/app/layout.tsx` — Inter was downloading but never actually rendering (silent fallback to system sans-serif). Fixed both.

**Phase 1 — core content resources:**
- Generated via `grit generate resource`: `TeamMember`, `CaseStudy`, `Testimonial`, `Product`, `JobOpening`, `FAQ`, `Lead` (model/service/handler/shared-schema/shared-type/admin-page for each).
- Extended the pre-existing `Blog` resource into the full `BlogPost` field set (added `author_id`→TeamMember, `tags` string_array, `seo_title`, `seo_description`) instead of generating a duplicate resource.
- Hand-built the `SiteSettings` singleton: `apps/api/internal/models/site_settings.go`, `internal/services/site_settings.go` (get-or-create), `internal/handlers/site_settings.go`, public `GET /api/v1/site-settings` + admin-only `PUT`, shared schema/type, dedicated admin page at `apps/admin/app/(dashboard)/site-settings/page.tsx` (sidebar-linked, admin-gated).
- Added a new `"tags"` admin field/column type (`apps/admin/lib/resource.ts`, `apps/admin/components/forms/fields/tags-field.tsx`, wired into `form-builder.tsx`/`cell-renderers.tsx`) — Grit's generator was mapping every `string_array` field to an image-upload widget, which is wrong for plain-text tags.
- Seeded demo data: `internal/database/site_settings_seeder.go` (placeholder contact/hero copy), `internal/database/demo_content_seeder.go` (2 case studies, 2 products, 1 testimonial — PharmacyCopilot/BusinessCopilot placeholders).

**Phase 2 — admin panel polish:**
- Dashboard (`apps/admin/app/(dashboard)/dashboard/page.tsx`): added a "Megagig overview" stat row (new leads this week via `?created_since=7d`, published case studies/products via `?published=true`) on top of the pre-existing generic per-resource widgets (which already give every resource a free Total + 30-day sparkline + Latest-N once registered in `resource_stats_dispatch.go`).
- Lead status badge (`apps/admin/components/tables/lead-status-badge.tsx`, using `--color-status-*` tokens), status filter dropdown, status field upgraded from free-text to `select`.
- `apps/admin/app/robots.ts` — disallow-all (admin is internal-only, must never be indexed).
- Backend: added `published` query-param filtering to `CaseStudy`/`Product` list handlers and `status` filtering to `Lead` (none of these existed before — the admin table's own "Published" filter checkbox was silently non-functional).

**`/review` pass — 4 real issues found and fixed (not caught by prior build/smoke tests):**
1. `CaseStudy.testimonial_id` was a dead field — added in Phase 1 as a "follow-up" but never actually wired into `Create`/`Update`/`Patch` handlers or `Preload()`d anywhere. Fixed all three write paths + Preload on List/GetByID/Create/Update/Patch.
2. `Testimonial.Create` still hard-required `case_study_id`/`avatar_id` in the handler despite model/schema/form all being optional. Removed `binding:"required"` from both; fixed the shared schema/type/admin-form for `avatar_id` too (same gap `case_study_id` had already had fixed).
3. `Blog.Author` was never `Preload()`ed anywhere in `blog_service.go` — `author_id` saved fine, the joined author object never did. Added `Preload("Author")` to all 5 read/write methods.
4. `--color-status-*` tokens had no `.dark` override — added dark-mode values to both `packages/shared/themes/tokens.css` and `context/ui-tokens.md`.

**Login page rebrand:**
- `packages/shared/themes.ts` — the `atlas` auth theme (separate token system from `tokens.css`, drives only the `(auth)` login/signup pages) had Grit's default indigo `#4f46e5` for `accent`/`heroBg`. Changed to Megagig's actual brand hex values: `accent` → `#16a34a`, `heroBg` → `#2563eb` (primary already coincidentally matched).
- `apps/admin/components/auth/AtlasAuthShell.tsx` — replaced "Built with Grit — Go + React framework" with a dynamic `© {year} {brand.name} Ltd.` line.
- `apps/admin/app/layout.tsx` — cleaned up leftover Grit-branded page title/meta description.

## Decisions made

- Left the full Grit "kitchen sink" enterprise module set (SSO/SAML/2FA/tickets/backups/feature-flags/webhooks/GDPR/GORM-Studio/Pulse/Sentinel) completely untouched and dormant — **explicit user instruction: no deletions without approval.** Don't revisit this without asking again.
- `grit generate resource` never creates public/published-only read routes (only protected + admin). This is a known, accepted gap for Phase 4 to fill per-resource (mirror Blog's existing hand-built `ListPublished`/`GetBySlug` pattern), not something to fix speculatively now.
- Set `DisableForeignKeyConstraintWhenMigrating: true` globally in `apps/api/internal/database/database.go` — the two-way `CaseStudy`↔`Testimonial` belongs_to relation broke GORM's AutoMigrate table-creation ordering. Referential integrity is already enforced at the service layer everywhere, so this was never load-bearing.
- `string_array` fields (`category_tags`, `tech_stack`, `feature_bullets`, `tags`) use the real `string_array` GORM/Zod type, not build-plan.md's literal (but stale) `string` type — matches the actual data model and ui-rules.md's tag/bullet rendering.
- The `(auth)` login-page theme engine (`themes.ts`) is a separate, parallel token system from `tokens.css`/`ui-tokens.md` — kept visually consistent by reusing the exact same hex values, but they are **not structurally wired together**. A future brand-color change needs updating both files.

## Problems solved

- Systemic admin-resource-generation bug: every `belongs_to:Upload` relationship (`hero_image`, `photo`, `avatar`, `screenshots`) referenced a `.name` display field that doesn't exist on `Upload` (it's `original_name`) — fixed across TeamMember/CaseStudy/Testimonial/Product.
- Diagnosed via `/recover`: an `EADDRINUSE` failure on the user's `grit start` was caused by my own leftover background dev-server processes from verification work, not a code bug. Lesson: stop leaving background dev servers running across turns; clean them up before handing control back.
- Confirmed (via reading the real handler code, not the unused `internal/services/case_study.go`-style dead files) that the actual generated `List` handlers use the `paginate.List[T]` pattern and DO call `.Preload()` correctly — an earlier progress-tracker note claiming otherwise was wrong and has been retracted in the doc.

## Current state

- API (`apps/api`), `apps/web`, `apps/admin` all build/type-check clean.
- All fixes from the `/review` pass verified live against the running dev API (created/linked/unlinked/deleted real test records via curl), demo data restored afterward.
- Login page verified live: hero panel renders `#2563eb`, no "Built with Grit" text remains anywhere.
- `context/progress-tracker.md` and `context/ui-registry.md` are both fully up to date through Phase 2 + the review fixes + the login rebrand — read those first for the authoritative phase-by-phase state, this file is a supplement not a replacement.
- Known, accepted gaps (tracked in progress-tracker.md, not blocking): no public/published-only routes yet for CaseStudy/Product/Testimonial/TeamMember/FAQ (Phase 4 work).

## Next session starts with

Phase 3 — public site global chrome, per `context/build-plan.md`:
1. `(marketing)` group layout: navbar (logo, nav links, theme toggle, "Start a project" CTA, sticky-on-scroll) + footer (sitemap columns, socials, contact line).
2. Persistent WhatsApp floating action button, sourced from `SiteSettings.WhatsAppNumber`.
3. Shared UI primitives per `ui-rules.md`: Button variants, Card variants, Badge, SectionHeading, Accordion, Carousel, StatCallout, TechIcon strip item — log each in `ui-registry.md` as built.
4. Confirm dark/light theme toggle works end-to-end against `tokens.css`.

Do not start Phase 4 page work until these primitives exist (per build-plan.md's sequencing rule).

## Open questions

- None blocking. `context/design-style-guide.md` (named in `AGENTS.md`'s read order) still does not exist in the repo — being treated as permanently merged into `ui-tokens.md`/`ui-rules.md`, per the prior session's resolution. Revisit only if the user raises it.
