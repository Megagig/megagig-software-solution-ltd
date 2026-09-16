# Memory — Tailwind v4 / ui-tokens.md Migration

Last updated: 2026-09-16

## What was built

- `packages/shared/themes/tokens.css` — new file, the canonical implementation of every token in `context/ui-tokens.md`, written for Tailwind v4's CSS-first `@theme` syntax (colors, spacing, radius, typography, shadows, motion), with light defaults on `:root` and dark overrides on `.dark` via `@custom-variant dark (&:where(.dark, .dark *));`. This is the single source of truth imported by both apps.
- `apps/web`: upgraded `tailwindcss` → `^4.3.3`, added `@tailwindcss/postcss@^4.3.3`, deleted the old `tailwind.config.ts` (not needed under v4), rewrote `postcss.config.js`, rewrote `app/globals.css` to `@import "tailwindcss"` + the shared tokens file, remapped the existing prose-blog styles to the new variable names. Removed unused `autoprefixer`/`tailwindcss-animate` deps.
- `apps/admin`: same v4 package/postcss/config upgrade, plus a full mechanical rename across **98 files** (~1453 occurrences) from the old Grit boilerplate multi-theme system to ui-tokens.md-consistent classes:
  - `accent`/`accent-hover` family → `brand` (`bg-accent`→`bg-brand`, `hover:bg-accent-hover`→`hover:brightness-90`, `hover:text-accent-hover`→`hover:opacity-80`)
  - `bg-secondary`→`bg-surface`, `bg-elevated`→`bg-surface-raised`, `bg-tertiary`/`bg-hover`→`foreground/5` (opacity-based, no 1:1 ui-tokens.md equivalent existed)
  - `text-secondary`→`text-foreground-muted`, `text-muted`→`text-foreground-subtle`
  - `background`/`foreground`/`border`/`success`/`danger`/`warning`/`info` class names unchanged (ui-tokens.md uses the same names; only hex values changed via the shared tokens file)
  - Dropped the `[data-theme="atlas/aurora/pulse/midnight"]` + `[data-theme-mode]` system entirely, consolidated to plain `.dark` — touched `app/layout.tsx` and `components/chrome/DarkModeToggle.tsx`.
  - Swapped `tailwindcss-animate` → `tw-animate-css` (v4-compatible) since `components/ui/confirm-modal.tsx` genuinely uses `animate-in`/`fade-in`/`zoom-in-95`.
- `context/progress-tracker.md` updated to reflect real Phase 0 state (was showing everything unchecked despite the repo already being scaffolded).

## Decisions made

- Admin's blue "accent" (CTAs/links/active nav) maps to ui-tokens.md's `--color-brand`, **not** `--color-accent` (which is the separate green "live in production" badge color) — verified via matching hex values between old and new tokens before committing to this mapping.
- No new ad-hoc tokens invented outside `ui-tokens.md`. Where the old system had a concept ui-tokens.md doesn't model (a "hover surface" shade), used Tailwind's opacity/brightness utilities (`foreground/5`, `brightness-90`) instead of fabricating a new named variable.
- Admin's separate `(auth)` login-page theme engine (`packages/shared/themes.ts`, `AuthShell.tsx`, `getTheme()`) is a **different, still-needed mechanism** (staff login screen styling) — explicitly left untouched and out of scope for this migration. Do not confuse it with the `[data-theme]` CSS system that was removed from `globals.css`.
- User explicitly chose "full rename to ui-tokens.md" over two safer/cheaper alternatives (repoint-values-only, or defer) when asked — this was a deliberate scope decision, not an assumption.

## Problems solved

- Found and fixed **pre-existing broken classes** in admin (`bg-bg-primary`, `text-text-primary`) that never matched any real Tailwind config key and were silently unstyled before this session — unrelated latent bug, fixed as part of the rename pass since the intent was obvious (`bg-background`/`text-foreground`).
- `var(--bg-elevated, #22222e)`-style CSS variable references *with a fallback value* weren't caught by the first sed pass (exact-match on `var(--bg-elevated)` without a trailing comma) — required a second targeted pass for `var(--bg-elevated,` / `var(--bg-secondary,` forms in `relationship-select-field.tsx`, `multi-relationship-select-field.tsx`, `date-field.tsx`.
- pnpm installs in this repo hit real npm-registry timeouts (ETIMEDOUT/ECONNRESET retries) — one install took 52 minutes. Not a config problem; just be patient and let backgrounded installs finish rather than assuming they're stuck.
- Dev servers (ports 3000/3001) were already running from outside this session when the migration started; they had to be killed (`taskkill /T /F` via PowerShell, since plain `pkill` isn't available in this Git Bash environment) and restarted after install completed to clear a stale "Cannot find module '@tailwindcss/postcss'" Turbopack cache error.

## Current state

- Both `apps/web` and `apps/admin` smoke-tested clean: dev servers return 200, zero warnings/errors in logs, compiled CSS confirmed to contain correct light/dark `--color-brand` values and the renamed utility classes (`bg-brand`, `bg-surface`, `text-foreground-muted`, etc.), zero leftover old class names anywhere in `apps/admin` (verified by grep).
- Dev servers were stopped again after the smoke test (not left running).
- `context/project-requirements.md` now exists (user added it) — byte-identical to `context/project-overview.md` except for a note that it's the canonical file if the two ever diverge. `context/design-style-guide.md` still does not exist in the repo despite being named in `AGENTS.md`'s read order — `ui-tokens.md` + `ui-rules.md` are being treated as covering that role.

## Next session starts with

Per `context/build-plan.md` Phase 0, still outstanding: stand up docker services (Postgres/Redis/MinIO/Mailhog via `docker compose up -d`), make a real font decision (currently just the Inter/JetBrains Mono placeholders from ui-tokens.md — no Megagig-specific font choice made), confirm the base `User`/auth model, and get the Go API dev server running on `:8080` with GORM Studio at `:8080/studio`. Only after that does Phase 1 (generating the real CaseStudy/Product/Testimonial/etc. resources via `grit generate resource`) start.

## Open questions

- None blocking. `context/design-style-guide.md`'s absence should probably just be accepted as permanently merged into `ui-tokens.md`/`ui-rules.md` rather than chased further, unless the user says otherwise.
