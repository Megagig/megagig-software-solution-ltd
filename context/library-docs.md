# library-docs.md — Megagig Website

Project-specific usage notes only. Not a reproduction of each library's general docs — just how *this* project uses it, so the agent doesn't reinvent a pattern that's already decided.

## Grit Framework (core)
- Source of truth for scaffolding: https://gritframework.dev/docs/concepts/architecture-modes/triple
- Always prefer `grit generate resource <Name> --fields "..."` over hand-writing model/service/handler/schema/type/admin-resource files individually — see `build-plan.md` Phase 1 for the exact commands for this project.
- `grit sync` is run any time a Go model's struct tags change, to regenerate `packages/shared/types` — never hand-edit a generated type file to "fix" a mismatch; fix the Go model and re-sync.
- `grit.json` for this project: `"architecture": "triple"`, `"frontend": "next"`, `"name": "megagig-site"`.
- Do **not** scaffold or use the `(app)` signed-in customer area that Triple ships with by default (see `architecture.md` rule #14) — this project has no public customer accounts.

## Next.js (App Router) — `apps/web`, `apps/admin`
- `apps/web`: SSR/ISR for every public page — case studies, products, blog posts use `revalidate` (e.g. 60–300s) rather than fully static export, so admin edits show up without a redeploy.
- `apps/admin`: standard client-heavy dashboard pattern (Grit's default) — no special ISR needed, always fresh via React Query.
- Route groups: `(marketing)` wraps every public page in navbar+footer. Do not create a `(marketing)` page that opts out of this layout — if a page needs a different shell (there currently isn't one that does), that's a scope conversation, not a quiet exception.
- `next/image`: all product screenshots, case-study heroes, team photos, and blog covers go through it. Remote images (S3/MinIO/R2 URLs) require the bucket's domain added to `next.config.js` `images.remotePatterns`.
- Metadata API (`generateMetadata`) used per dynamic route (`case-study/[slug]`, `product/[slug]`, `blog/[slug]`) to pull SEO title/description from the resource where available, per `build-plan.md` Phase 7.

## Tailwind CSS + shadcn/ui — `apps/web`, `apps/admin`
- All color/spacing/radius/typography values come from CSS variables defined in `packages/shared/themes` (see `ui-tokens.md`) — Tailwind config maps its theme extension to these variables, it does not define its own separate palette.
- shadcn/ui components are added via the CLI (`npx shadcn add <component>`) into each app's own `components/ui/` — do not manually copy-paste a component from one app to the other; re-run the CLI in the second app so it stays update-able.
- Dark mode strategy: `class`-based (`dark:` variants), toggled by the shared theme provider in `app/layout.tsx`, persisted to `localStorage` client-side. Default theme follows system preference on first visit.

## React Hook Form + Zod — lead forms (`apps/web`)
- Every form (`/start-project`, `/contact-us`, Home mini-form) uses `useForm({ resolver: zodResolver(CreateLeadSchema) })` from `packages/shared/schemas/lead.ts` — do not write parallel validation logic in the component.
- The three lead entry points share one underlying form component (`LeadForm`) parameterized by a `source` prop and an optional `defaultProjectType` prop (used when arriving from a `/services/[slug]` CTA) — do not fork three separate form implementations.

## React Query — `apps/admin` (all data), `apps/web` (mutations only)
- Query keys follow Grit's generated convention per resource (`["case-studies"]`, `["case-study", slug]`, etc.) — reuse the generated hooks (`useCaseStudies()`, `useCaseStudy(slug)`) rather than calling `fetch` directly from a component.
- On the public site, only the lead-submission mutation and (if added later) any client-interactive filter use React Query; page-level data for SEO-critical content is fetched server-side (see Next.js notes above), not via a client `useQuery` that would leave an empty shell for crawlers.

## GORM — `apps/api`
- Soft deletes are on by default for every model (Grit standard `DeletedAt`) — "deleting" a case study/product/testimonial/team member/blog post from the admin should soft-delete, not hard-delete, so accidental removals are recoverable via `internal/cmd` or GORM Studio.
- Preloading: any list/detail service method that returns a model with a `belongs_to` relationship (e.g. `CaseStudy.HeroImage`, `Testimonial.CaseStudy`) must `.Preload()` it — the frontend should never have to make a second round-trip to resolve a related image URL.
- Public-facing `GetAll`/`GetByID` service methods always scope `WHERE published = true` (or `published_at <= now()` for `BlogPost`) — see `architecture.md` rule #10. This filter lives in the service layer, never bolted on in the handler or, worse, the frontend.

## Resend — `internal/mail`
- Two templates for this project: `lead-notify.html` (to Megagig's internal inbox, includes all lead fields + a link to the admin detail page) and `lead-confirm.html` (to the visitor, short "we received your request, we'll reply within 24h" message).
- Sent asynchronously via `internal/jobs` (asynq), not synchronously inside the `CreateLead` handler — a Resend outage must never block or fail the lead-creation API response.
- From-address and reply-to are read from `SiteSettings.ContactEmail`, not hard-coded, so changing the contact inbox doesn't require a redeploy.

## Redis (cache) — `apps/api`
- Public GET endpoints for `CaseStudy`, `Product`, `Testimonial`, `TeamMember`, `FAQ`, published `BlogPost` are wrapped by the cache middleware with a short TTL (60s suggested) — content changes infrequently and traffic is anonymous, so this is a safe default. `Lead` endpoints are never cached.
- Cache is invalidated naturally by TTL expiry; no manual invalidation-on-write is required for v1 given the short TTL and low write frequency of content resources — revisit only if staff report edits "not showing up fast enough."

## S3-compatible storage (MinIO dev / R2 or S3 prod) — `internal/storage`
- Every image field (hero images, screenshots, avatars, team photos, blog covers) is uploaded client-side in `apps/admin` directly to storage via a presigned URL obtained from `POST /api/v3/uploads/presign`, then the resulting `Upload.ID` is attached to the parent resource — never a raw file multipart-posted through the Go API body.
- Public site only ever reads the resulting public URL off the `Upload` record; it never talks to storage directly.

## asynq (jobs/cron) — `internal/jobs`, `internal/cron`
- Used for: async lead-notification emails (Phase 6), async visitor-confirmation emails (Phase 6). No cron jobs are required for v1 (a "weekly new-leads digest" cron is a reasonable v2 addition — track it in `build-plan.md` Phase 9 if desired, don't build it speculatively now).
