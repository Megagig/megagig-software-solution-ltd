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
| TagsField | `apps/admin/components/forms/fields/tags-field.tsx` | Free-text chip/tag input bound to a `string[]` field (Enter or `,` commits a tag) | `CaseStudy.category_tags`/`tech_stack`, `Product.feature_bullets`, `Blog.tags` | New `"tags"` `FieldType`/`ColumnFormat` added to `lib/resource.ts`, wired into `form-builder.tsx` and `cell-renderers.tsx` (table shows badge chips, +N overflow). Distinct from `CheckboxGroupField`, whose options are a fixed predefined set — this is for open-ended text tags. Added because Grit's generator maps every `string_array` field to `type: "images"` (an image-upload dropzone), which is wrong for plain-text tags. |
| SiteSettings page | `apps/admin/app/(dashboard)/site-settings/page.tsx` | Single-record settings form (not a DataTable) for the SiteSettings singleton — contact info, hero copy, social links | Sidebar nav (admin-only, above the resources list) | Hand-built per `build-plan.md` step 1.10; uses `apps/admin/hooks/use-site-settings.ts` (React Query get/update against `/api/site-settings`) |
| LeadStatusBadge | `apps/admin/components/tables/lead-status-badge.tsx` | Soft-tint pill for `Lead.Status`, using `--color-status-*` tokens 1:1 per ui-rules.md §13 | `leads.ts` table `status` column (via `cell:`) | Plain function returning `ReactNode` (same pattern as `StackedCell`), not a JSX component — keeps the resource definition file as `.ts`. Distinct from the generic `BadgeCell` in `cell-renderers.tsx`, whose color palette doesn't cover this specific 5-value enum. |

## Icon usage

| Icon | Library | Used for |
|---|---|---|
| _(none yet — track any icon choices here once the tech-stack strip, service cards, and admin sidebar are built, so the same concept always uses the same icon)_ | | |

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
