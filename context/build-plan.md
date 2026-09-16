# build-plan.md — Megagig Website — Phased Build Plan

> Sequenced so the coding agent never has to decide what's next. Complete a phase fully (including its checklist in `progress-tracker.md`) before starting the next one, unless a phase is explicitly marked parallelizable.
> Each feature line is written so it can be pasted, near-verbatim, as a `grit generate` command or an agent task.

---

## Phase 0 — Scaffold & infrastructure

1. `grit new megagig-site --triple --next`
2. Configure `.env` (DB, Redis, S3/MinIO, Resend API key, JWT secret) from `.env.example`.
3. `docker compose up -d` — verify Postgres, Redis, MinIO, Mailhog are healthy.
4. `grit generate resource User` confirm default auth model matches §6 in `architecture.md` (role enum limited to `admin` for v1).
5. Wire `ui-tokens.md` values into `packages/shared/themes` (CSS variables) — see that file for the exact token set.
6. Set global fonts and base Tailwind config per `ui-rules.md`.
7. Confirm dev servers boot: API `:8080`, Web `:3000`, Admin `:3001`, GORM Studio reachable at `:8080/studio`.

## Phase 1 — Core content resources (backend + shared + admin, no public UI yet)

Generate each as its own `grit generate resource` command, in this order (order matters where one resource references another via `belongs_to`):

1. `grit generate resource Upload` *(if not already part of Grit's base scaffold — confirm before generating a duplicate)*
2. `grit generate resource TeamMember --fields "name:string, role:string, photo_id:belongs_to:Upload, linkedin_url:string, github_url:string, published:bool, sort_order:int"`
3. `grit generate resource Testimonial --fields "quote_text:text, author_name:string, author_role:string, company_name:string, company_url:string, avatar_id:belongs_to:Upload, case_study_id:belongs_to:CaseStudy, published:bool, sort_order:int"` *(generate after CaseStudy in step 4 — reorder if the CLI requires the referenced model to exist first; otherwise generate CaseStudy without the back-reference first, then add it)*
4. `grit generate resource CaseStudy --fields "slug:string, client_name:string, tagline:string, category_tags:string, status_badge:string, hero_image_id:belongs_to:Upload, problem:text, what_we_built:text, result:text, tech_stack:string, published:bool, sort_order:int"`
5. `grit generate resource Product --fields "slug:string, name:string, tagline:string, description:text, feature_bullets:string, live_url:string, docs_url:string, published:bool, sort_order:int"`
6. `grit generate resource JobOpening --fields "title:string, department:string, location:string, employment_type:string, description:text, apply_url:string, is_open:bool"`
7. `grit generate resource FAQ --fields "question:string, answer:text, published:bool, sort_order:int"`
8. `grit generate resource BlogPost --fields "slug:string, title:string, excerpt:text, cover_image_id:belongs_to:Upload, body:text, author_id:belongs_to:TeamMember, tags:string, published_at:string, seo_title:string, seo_description:string"`
9. `grit generate resource Lead --fields "name:string, email:string, phone:string, company:string, project_type:string, budget_range:string, message:text, source:string, status:string, internal_notes:text"`
10. Hand-write `SiteSettings` as a **singleton** (not a standard list resource): one seeded row, a dedicated `GET/PUT /api/v3/site-settings` pair in `internal/handlers/site_settings.go`, and a dedicated single-record admin page (not a DataTable) at `apps/admin/app/(dashboard)/site-settings/page.tsx`.
11. Run `internal/cmd/seed` additions: seed one admin `User`, the `SiteSettings` singleton with placeholder Megagig contact info, and a handful of demo `CaseStudy`/`Product`/`Testimonial` rows for local development (real content — PharmacyCopilot, BusinessCopilot — added properly in Phase 5).
12. Verify: every resource above appears correctly in `packages/shared/schemas`, `packages/shared/types`, and as a generated DataTable + FormBuilder page in `apps/admin`.

## Phase 2 — Admin panel polish

1. Configure `apps/admin` dashboard (`app/page.tsx`): StatsCards (new leads this week, total published case studies, total published products), one ChartWidget (leads over last 30 days), ActivityWidget (latest 10 leads).
2. Add `Leads` resource-specific UI: status badge coloring (new/contacted/quoted/won/lost), an internal-notes textarea on the detail/edit view, filter-by-status control.
3. Restrict all `apps/admin` routes behind the auth middleware; confirm unauthenticated requests redirect to `/login`.
4. Set `apps/admin` deploy target to its own subdomain and add `robots.txt: Disallow: /` there (see `architecture.md` §8).

## Phase 3 — Public site: global chrome

1. Build `(marketing)` group layout: navbar (logo, nav links, theme toggle, "Start a project" button, sticky-on-scroll behavior) + footer (sitemap columns, socials, contact line, copyright).
2. Build the persistent WhatsApp floating action button, sourced from `SiteSettings.WhatsAppNumber`.
3. Build shared UI primitives per `ui-rules.md`: Button variants, Card variants, Badge, SectionHeading, Accordion (for FAQ), Carousel (for testimonials), StatCallout, TechIcon strip item.
4. Confirm dark/light theme toggle works end-to-end against the tokens in `ui-tokens.md`.

## Phase 4 — Public site: pages (build in this order — each depends on the shared primitives from Phase 3)

1. **Home (`/`)** — hero, showcase strip, client logos, case-study preview grid (pulls published `CaseStudy`, newest/`sort_order` first, capped), tech stack strip, services bento grid (static list linking to Phase 4.2 pages), products section (pulls published `Product`), full "selected work" grid, pricing teaser cards, quote CTA band, testimonials carousel (pulls published `Testimonial`), founder spotlight (static content, see `project-overview.md` for source facts), our-story section, FAQ accordion (pulls published `FAQ`), contact block + mini lead form, closing CTA band, footer.
2. **Services (`/services`, `/services/[slug]`)** — index grid (static service list — content owned in code/MDX, not a DB resource, per `project-overview.md` §5.2), detail pages with quote CTA pre-filling `project_type`.
3. **Products (`/products`, `/product/[slug]`)** — index + detail pulling the `Product` resource.
4. **Case studies (`/case-studies`, `/case-study/[slug]`)** — index + detail pulling `CaseStudy`, with the optional linked `Testimonial` rendered on the detail page if present.
5. **Pricing (`/pricing`)** — category cards sourced from `SiteSettings.PricingBlurbs`, quote CTA band.
6. **Start a project (`/start-project`)** — the primary lead form (`CreateLeadSchema`), success/thank-you state.
7. **Contact (`/contact-us`)** — secondary lead form (`source: contact`) + direct-contact cards from `SiteSettings`.
8. **About (`/about-us`)** — static founding story + stats (content-owned, not DB-backed, for v1).
9. **Team (`/team`)** — pulls published `TeamMember`.
10. **Careers (`/careers`)** — pulls open `JobOpening`; empty-state copy when none are open.
11. **Blog (`/blog`, `/blog/[slug]`)** — pulls published `BlogPost` (where `published_at` is not null and ≤ now).
12. **Legal (`/privacy`, `/legal`)** — static MDX pages.

## Phase 5 — Real content population

1. Write and publish the **PharmacyCopilot** case study (problem/build/result, tech stack, screenshots) using the real project history in `[[pharmacycopilot]]`.
2. Write and publish the **BusinessCopilot** case study using the real project history in `[[business-platform-proposal]]` (unified POS/inventory/accounting/CRM/HR/BI platform, Grit-framework-built).
3. Create the two `Product` entries (PharmacyCopilot, BusinessCopilot) with live URLs `pharmacycopilot.com.ng` and `businesscopilot.com.ng`.
4. Fill `SiteSettings` with real contact details (replace all placeholders).
5. Populate initial FAQ set (3–6 questions, see `project-overview.md` §5.1).
6. Add team member(s) — at minimum the founder.
7. Leave `JobOpening` and `BlogPost` empty at launch (empty-state UI must look intentional, not broken — verify this explicitly).

## Phase 6 — Lead pipeline wiring

1. Implement `internal/mail/templates/lead-notify.html` (internal team notification) and `lead-confirm.html` (visitor confirmation), send via Resend on `Lead` creation.
2. Wire both lead forms (`/start-project`, `/contact-us`, and the Home mini-form) to `POST /api/v3/leads`, each setting the correct `source`.
3. Add IP-based rate limiting to the public `leads` create route (Grit's Sentinel rate-limit middleware) to prevent spam.
4. Add basic honeypot or equivalent lightweight spam mitigation to the form (no full CAPTCHA required for v1 unless spam volume warrants it later).
5. Verify the full loop manually: submit → row in Postgres → two emails sent (check Mailhog in dev) → lead visible and status-editable in `apps/admin`.

## Phase 7 — SEO, performance, accessibility pass

1. Per-page metadata (title, description, OG image) for every public route, sourced from resource fields where available (e.g. `BlogPost.seo_title`) and sensible defaults elsewhere.
2. `sitemap.xml` and `robots.txt` for `apps/web` (allow-all except none — this is the public site); separate `robots.txt` disallow-all for `apps/admin`.
3. Image optimization audit (Next.js `<Image>` everywhere, correctly sized, lazy-loaded below the fold).
4. Run Lighthouse; fix anything below green on Performance/Accessibility/Best Practices/SEO for `/`, one case study, one product, and `/pricing`.
5. Keyboard-navigation and screen-reader pass on the navbar, forms, accordion, and carousel.

## Phase 8 — Deployment

1. Stand up production Postgres, Redis, and S3-compatible storage (per `architecture.md` §8 recommendation).
2. Deploy `apps/api` via `grit deploy` or `docker-compose.prod.yml` to the chosen VPS/host.
3. Deploy `apps/web` to Vercel, set `NEXT_PUBLIC_API_URL`.
4. Deploy `apps/admin` to Vercel on its own subdomain, set `NEXT_PUBLIC_API_URL`, confirm auth + `robots.txt` disallow.
5. Point production DNS, verify SSL on all three hosts (main domain, `admin.` subdomain, API host).
6. Smoke-test the full lead pipeline in production (real email delivery via Resend, not Mailhog).

## Phase 9 — Post-launch (v2 backlog, not built now — tracked here so it isn't lost, not so it gets built early)

- File attachment on the quote form (presigned upload).
- Case-study filter chips by category/industry.
- Multi-role admin (`editor` vs `admin`).
- Blog scheduled publishing.
- `/brand` page with downloadable logo kit.
- Analytics integration (separate from the admin's basic stats widgets).
- i18n / multi-language.

---

### Sequencing rules for the agent

- Do not start Phase 2 until every Phase 1 resource is generated and verified end-to-end (model → service → handler → shared schema/type → admin DataTable/Form).
- Do not start Phase 4 page work until Phase 3's shared primitives exist — pages should *consume* `Button`/`Card`/`Badge`/etc., never redefine their own one-off versions.
- Phase 5 (real content) can run in parallel with Phase 6 (lead pipeline) since they touch different resources, but both must be done before Phase 7.
- Phase 7 (SEO/perf/a11y) is a pass over already-built pages, not a phase with its own new pages — do not defer accessibility to "later," but do treat this phase as the formal audit checkpoint.
