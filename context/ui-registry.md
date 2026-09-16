# ui-registry.md — Megagig Website Component Registry

> **Living document. Starts empty.** This file is auto-updated (by the imprint/coding-agent skill, or manually if no such skill is running) every time a new reusable UI component is built. Its job: so that a new coding-agent session — or a human — can check here *first* before building a component, and reuse or extend what already exists instead of reinventing it. Do not pre-populate this file with imagined components; only add a row once the component actually exists in the codebase and has been verified to render.

## How to update this file

After building or materially changing a shared component:
1. Add (or update) one row in the relevant table below.
2. Keep the "Used by" column current — it's what tells the next session whether a change is safe to make.
3. If a component is deleted/replaced, remove its row rather than leaving a stale entry.

## Shared primitives (`apps/web/components/ui/`, shadcn/ui-based)

| Component | Path | Variants/Props | Used by | Notes |
|---|---|---|---|---|
| _(none yet — populated as Phase 3 of build-plan.md completes)_ | | | | |

## Marketing section components (`apps/web/components/`)

| Component | Path | Purpose | Used by | Notes |
|---|---|---|---|---|
| _(none yet)_ | | | | |

## Page-specific components (colocated under each route's `_components/`)

| Component | Route | Purpose | Notes |
|---|---|---|---|
| _(none yet)_ | | | |

## Admin components (`apps/admin/`)

| Component | Path | Purpose | Used by | Notes |
|---|---|---|---|---|
| _(none yet — mostly Grit-generated DataTable/FormBuilder; only hand-built deviations get logged here, e.g. the Lead status badge column from ui-rules.md §13)_ | | | | |

## Icon usage

| Icon | Library | Used for |
|---|---|---|
| _(none yet — track any icon choices here once the tech-stack strip, service cards, and admin sidebar are built, so the same concept always uses the same icon)_ | | |
