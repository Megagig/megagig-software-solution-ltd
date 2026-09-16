# code-standards.md — Megagig Website

Applies across `apps/api`, `apps/web`, `apps/admin`, and `packages/shared`. When Grit's own generated code already follows a convention (e.g. handler naming), do not deviate from it — these standards fill in the gaps Grit leaves to the project.

## 1. Naming conventions

### Go (`apps/api`)
- Packages: lowercase, single word, no underscores (`handlers`, `services`, `models`).
- Files: `snake_case.go`, one primary type/resource per file (`case_study.go`, `case_study_service.go`, `case_study.go` under `handlers/`).
- Types: `PascalCase` (`CaseStudy`, `LeadService`).
- Struct fields exposed to JSON: `PascalCase` in Go, `snake_case` in the `json` tag (`ClientName string \`json:"client_name"\``).
- Service methods: verb-first, resource-scoped (`Create`, `GetAll`, `GetByID`, `Update`, `Delete`, plus domain-specific ones like `MarkContacted`, `PublishedOnly`).
- Handler functions: `Create<Resource>`, `GetAll<Resource>`, `GetByID<Resource>`, `Update<Resource>`, `Delete<Resource>` — matches Grit's generated pattern exactly, never renamed.
- Errors: sentinel errors declared per-service as `Err<Thing>` (`ErrLeadNotFound`), wrapped with `fmt.Errorf("...: %w", err)` when adding context.

### TypeScript / React (`apps/web`, `apps/admin`, `packages/shared`)
- Files: `kebab-case.ts` / `kebab-case.tsx` (`case-study-card.tsx`, `use-case-studies.ts`).
- Components: `PascalCase` export, file name matches component name in kebab-case (`CaseStudyCard` in `case-study-card.tsx`).
- Hooks: `use<Thing>` (`useCaseStudies`, `useCreateLead`), always in a `hooks/` (web) directory — Grit generates these automatically per resource; hand-written hooks follow the same pattern.
- Zod schemas: `Create<Resource>Schema`, `Update<Resource>Schema`, matching Grit's generated naming exactly.
- TS types/interfaces: `PascalCase`, singular (`CaseStudy`, not `CaseStudyType` or `ICaseStudy`).
- Constants: `SCREAMING_SNAKE_CASE` (`API_ROUTES`, `PROJECT_TYPES`).
- Route segment folders in the App Router: `kebab-case` (`start-project/`, `case-study/[slug]/`).

### CSS / Tailwind
- No inline hex/rgb/px magic values — always a token from `ui-tokens.md` (`bg-[--color-surface]`, not `bg-[#0b0b12]`).
- Custom component classes (when Tailwind utilities alone aren't enough), if any, are `kebab-case` and prefixed `mg-` (Megagig) to avoid collisions with shadcn/ui internals (`mg-hero-gradient`).

## 2. Framework-specific conventions

- **Next.js App Router**: Server Components by default; add `"use client"` only where interactivity is required (forms, carousel, accordion, theme toggle, mutations). Data fetching for public read-only content prefers server components calling the API directly (or via a thin server-side fetch wrapper) over client-side React Query where SEO matters (Home, case studies, products, blog). React Query is used for anything requiring live client interaction: the admin panel entirely, and the lead-form mutation on the public site.
- **Admin resources**: every `defineResource()` call lives in its own file under `apps/admin/app/resources/`, named after the resource in kebab-case, and is registered via the `// grit:resources` marker — never manually duplicated into the registry file.
- **Shared schemas**: one file per resource in `packages/shared/schemas/`, re-exported via the `// grit:schemas` marker in `index.ts`. Never define a duplicate/local Zod schema in `apps/web` or `apps/admin` for something that already has a shared schema.
- **Images**: `next/image` everywhere on the public site, always with explicit `width`/`height` or `fill` + a sized container — never an unstyled raw `<img>`.

## 3. File / folder structure rules

- One resource = one file per layer (model, service, handler, schema, type, admin resource definition). Do not combine multiple resources into a single file "for convenience."
- Public page components that are only ever used on one page live colocated in that route folder (`app/(marketing)/case-study/[slug]/_components/`). Components reused across 2+ pages move to a shared `apps/web/components/` directory.
- Shared UI primitives (Button, Card, Badge, Accordion, Carousel, SectionHeading, StatCallout) live in `apps/web/components/ui/` (public site) — if `apps/admin` needs the exact same primitive, it either imports shadcn/ui directly (preferred, since both apps already depend on shadcn) or duplicates the minimal primitive rather than cross-importing between `apps/web` and `apps/admin` (keeps the two apps deployable independently, per `architecture.md` rule #2).

## 4. Component structure (React)

Standard shape for a non-trivial component file:

```tsx
// 1. imports: external libs, then shared package, then local
import { useState } from "react";
import type { CaseStudy } from "@shared/types";
import { Badge } from "@/components/ui/badge";

// 2. types/interfaces for props
interface CaseStudyCardProps {
  caseStudy: CaseStudy;
}

// 3. component (named function, not arrow-const, for stack traces)
export function CaseStudyCard({ caseStudy }: CaseStudyCardProps) {
  // 4. hooks first
  const [isHovered, setIsHovered] = useState(false);

  // 5. derived values / early returns
  if (!caseStudy.published) return null;

  // 6. render
  return (/* ... */);
}
```

- Props are always typed with an explicit `interface`, never inline object types for anything with more than 1–2 fields.
- No default exports for components (named exports only) — keeps refactors/renames traceable and matches Grit's generated hook/page style.
- Forms use `react-hook-form` + `zodResolver(CreateLeadSchema)` (or the relevant schema) — never hand-rolled validation.

## 5. Error handling patterns

### Go
- Services return `(T, error)`; handlers check the error, map known sentinel errors to HTTP status codes (`ErrNotFound` → 404, validation errors → 400), and fall back to 500 + a logged (not leaked) internal message for anything unexpected.
- Standard JSON error envelope: `{"error": {"message": "...", "code": "..."}}` — consistent across every handler, matching whatever envelope shape Grit's scaffold already generates (do not invent a second shape).
- Never `panic` in a handler or service for expected error conditions (not-found, validation) — `panic` is reserved for true programmer errors caught by recover middleware in `main.go`.

### TypeScript
- React Query mutations (e.g. `useCreateLead`) surface errors via the mutation's `error` state, rendered as inline form/toast feedback — never a silent console-only failure on a public-facing form.
- Public pages fetching from the API at build/request time (Server Components) must handle a failed fetch gracefully (render an empty state or cached fallback), never crash the whole page — a broken testimonials fetch should not take down the Home page.
- Admin panel surfaces API errors via the existing Grit DataTable/FormBuilder error UI — do not build a parallel custom error-toast system.

## 6. Content vs. code boundary

Anything listed in `project-overview.md` §6 as an **admin-managed resource** must never be hard-coded as JSX/text in a component. Anything explicitly marked "static content, not DB-backed, for v1" (service list, About story copy, founder bio) is intentionally hard-coded — do not "fix" this into a database resource without updating `project-overview.md` first, since that's a scope decision, not a bug.

## 7. Commit / PR hygiene (if using git flow with the coding agent)

- One feature (one `build-plan.md` line item) per commit/PR where practical.
- Commit messages: `<scope>: <what changed>` — scope is the app or resource (`admin: add leads status filter`, `web: build case study detail page`, `api: generate CaseStudy resource`).
- Update `progress-tracker.md` in the same commit/PR that completes the corresponding checklist item, not as a separate cleanup pass later.
