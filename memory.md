# Memory — Phase 3 (public site global chrome): built, reviewed, fixed

Last updated: 2026-09-17

## What was built

**Route restructure (`apps/web`):**
- Retrofitted into a literal `app/(marketing)/` route group per `architecture.md` §4 — moved `app/page.tsx` → `app/(marketing)/page.tsx` and `app/blog/` → `app/(marketing)/blog/`.
- Deleted `app/(auth)/` (Grit's default customer-account scaffold: login/register/forgot-password/reset-password/callback) — confirmed out of scope (no public visitor accounts) and confirmed with the user before deleting since it turned out to not even be git-tracked (no recovery path existed).
- Deleted `components/AppChrome.tsx` (the old pathname-based chrome-opt-out wrapper) — chrome now lives in `app/(marketing)/layout.tsx` instead.
- Cleaned root `app/layout.tsx`: removed Grit-branded metadata, removed the unused `data-theme="atlas"` attribute (that token system is admin-auth-only).

**New shared UI primitives** (`apps/web/components/ui/`): `button.tsx`, `card.tsx`, `badge.tsx`, `section-heading.tsx`, `accordion.tsx` (wraps new `@radix-ui/react-accordion` dependency), `carousel.tsx`, `stat-callout.tsx`, `tech-icon.tsx`. Hand-built with the already-installed CVA/clsx/tailwind-merge stack, not the shadcn CLI — see Decisions below.

**New chrome components** (`apps/web/components/`): `navbar.tsx`, `footer.tsx`, `back-to-top.tsx`, `theme-toggle.tsx`, `whatsapp-fab.tsx` — all full rebuilds, since the previous navbar/footer were 100% unmigrated Grit demo scaffold. New `apps/web/lib/site-settings.ts` (server-side `SiteSettings` fetch) and `apps/web/app/(marketing)/layout.tsx` (wires Navbar/Footer/FAB together, fetches `SiteSettings` once).

**Test coverage** (`apps/web/__tests__/`): 13 files, 34 tests, covering every Phase 3 component. Rewrote the pre-existing `navbar.test.tsx`/`footer.test.tsx` — they were fake stubs testing locally-defined mock components, not the real ones (discovered mid-session, unrelated to this session's changes). Added `window.matchMedia` stub to `vitest.setup.ts` (jsdom doesn't implement it).

**Motion:** accordion open/close keyframes (`accordion-down`/`accordion-up`) registered in `apps/web/app/globals.css` (not `tokens.css` — web-only motion, not a cross-app token).

Full class-level detail for every component is in `context/ui-registry.md` (kept current via `/imprint`).

## Decisions made

- Adopted the literal `(marketing)` route group over the previous pathname-based `AppChrome` pattern — `architecture.md` is explicit about this structure and every later build-plan phase assumes it, so drifting now would only compound.
- Hand-built primitives with CVA instead of running the shadcn CLI that `library-docs.md` names — this project's `ui-tokens.md` vocabulary (`--color-brand`, `--radius-md`, no `--primary`/`--destructive`/`--ring`) doesn't match shadcn's default classes, so CLI output would need a full rewrite regardless. Installed `@radix-ui/react-accordion` as the one dependency genuinely worth adding, for real keyboard/ARIA behavior.
- `ThemeToggle` is a deliberate duplicate of `apps/admin`'s `DarkModeToggle`, not a shared import — `code-standards.md` §3 says the two apps never cross-import components.
- `WhatsAppFab` ended up as a server component (no `"use client"`) rather than the client component originally planned — it has no interactivity, just conditional rendering from server-provided props, which better matches the project's "server components by default" rule.
- `SiteSettings` is fetched server-side in `(marketing)/layout.tsx` with `next: { revalidate: 60 }` (ISR) — plain `fetch`, not the client-only axios instance in `lib/api.ts`.

## Problems solved

- **Critical:** the `SiteSettings` fetch had no revalidation strategy, and a code comment claiming "Next respects the origin's Cache-Control header automatically" was factually wrong. `next build` proved it — `/` and `/blog` came back fully static with no revalidate, meaning `SiteSettings` (WhatsApp number, contact info) would freeze at build time and never update from an admin edit without a redeploy. Fixed with `next: { revalidate: 60 }`; confirmed via a rebuild showing `Revalidate: 1m` in the route output.
- `Carousel` was typed `children: ReactNode[]` and called `.map()` directly on it — throws for exactly one slide, since React only array-wraps 2+ JSX children (a single child arrives bare, not in a 1-item array). Caught by its own new test suite. Fixed with `Children.toArray()`.
- Navbar's scroll-based background state initialized to `false` and only corrected in a post-mount `useEffect`, causing a one-frame flash of the transparent/top-of-page style when Home is reloaded already scrolled down. Fixed with an isomorphic `useLayoutEffect` (real `useLayoutEffect` client-side, falls back to `useEffect` during actual server rendering to avoid React's SSR warning).

## Current state

- Phase 3 is fully complete: chrome, WhatsApp FAB, 8 UI primitives, and the theme toggle are all built, reviewed (`/review`), fixed, and re-verified live against the running dev API with real seeded `SiteSettings` data (WhatsApp number, contact email/phone, social links all render correctly; `/blog` and `/` get chrome; `/forms/[token]` stays chromeless; not-yet-built routes like `/services` correctly 404).
- All 34 tests pass, `tsc --noEmit` clean, `next build` clean.
- The user committed everything as `87e1cd1 "implemented Public site:global chrome"` — done outside this session (I never ran `git commit`), discovered when a later `git status` came back unexpectedly clean.
- `context/ui-registry.md` and `context/progress-tracker.md` are both fully up to date, including a dedicated session-log entry for the `/review` + fix pass.
- **Known, explicitly-flagged gap (not blocking):** Home's actual page content (`apps/web/app/(marketing)/page.tsx`) is still 100% untouched Grit demo framework-marketing copy (headline "Grit", `usePublicBlogs` recent-posts section, terminal snippet, etc.) — moving it into the new route group didn't touch its content, since rebuilding Home is explicitly Phase 4.1 scope.
- **Known, pre-existing gap (not blocking, not caused this session):** root `not-found.tsx`/`error.tsx` still use raw non-token classes (`text-primary`, `bg-red-500/10`) not in `ui-tokens.md`. Worth a pass whenever those files are next touched — not part of Phase 3's chrome/primitives scope.

## Next session starts with

Phase 4 — public site pages, per `build-plan.md`'s order: Home (`/`) first, then Services, Products, Case studies, Pricing, Start a project, Contact, About, Team, Careers, Blog, Legal. Home is the biggest lift — it needs the hero, showcase strip, client logos, case-study preview grid, tech stack strip, services bento grid, products section, testimonials carousel, founder spotlight, our-story stats, FAQ accordion, contact block, and closing CTA band, per `project-requirements.md` §5.1 — all composed from the Phase 3 primitives (Button/Card/Badge/SectionHeading/Accordion/Carousel/StatCallout/TechIcon), not one-off markup.

## Open questions

- None blocking. Worth surfacing once Home rebuild starts: founder spotlight and "our story" content (§5.1) is static/code-owned per `project-requirements.md`, not DB-backed — need the real bio/stats facts from the user before writing that section, rather than shipping placeholder copy that looks like real content.
