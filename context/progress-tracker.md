# progress-tracker.md — Megagig Website Build Progress

> **Living document.** Checkboxes mirror `build-plan.md` exactly, phase for phase, feature for feature. Auto-updated after each feature ships (check the box the moment it's done and verified, not before). A new session should be able to read only this file and `build-plan.md` and know precisely where the project stands — no scrollback required.

**Status key:** `[ ]` not started · `[~]` in progress · `[x]` done & verified

---

## Phase 0 — Scaffold & infrastructure
- [ ] `grit new megagig-site --triple --next` run
- [ ] `.env` configured from `.env.example`
- [ ] `docker compose up -d` verified healthy (Postgres, Redis, MinIO, Mailhog)
- [ ] Base `User`/auth model confirmed
- [ ] `ui-tokens.md` values wired into `packages/shared/themes`
- [ ] Global fonts + base Tailwind config set
- [ ] Dev servers verified: API `:8080`, Web `:3000`, Admin `:3001`, GORM Studio `:8080/studio`

## Phase 1 — Core content resources
- [ ] Upload (confirmed present or generated)
- [ ] TeamMember resource generated + verified
- [ ] Testimonial resource generated + verified
- [ ] CaseStudy resource generated + verified
- [ ] Product resource generated + verified
- [ ] JobOpening resource generated + verified
- [ ] FAQ resource generated + verified
- [ ] BlogPost resource generated + verified
- [ ] Lead resource generated + verified
- [ ] SiteSettings singleton hand-built + verified
- [ ] Seed data added (admin user, SiteSettings, demo content)
- [ ] End-to-end verification: model → service → handler → shared schema/type → admin DataTable/Form for every resource above

## Phase 2 — Admin panel polish
- [ ] Dashboard stats/chart/activity widgets built
- [ ] Leads resource UI polish (status badges, notes field, status filter)
- [ ] Admin routes confirmed behind auth
- [ ] Admin subdomain + `robots.txt` disallow configured

## Phase 3 — Public site: global chrome
- [ ] `(marketing)` navbar + footer layout built
- [ ] WhatsApp floating action button built
- [ ] Shared UI primitives built (Button, Card, Badge, SectionHeading, Accordion, Carousel, StatCallout, TechIcon item) — *log each in `ui-registry.md` as it ships*
- [ ] Dark/light theme toggle verified end-to-end

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

- _(no sessions logged yet)_
