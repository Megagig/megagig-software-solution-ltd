# ui-tokens.md — Megagig Website Design Tokens

> Single source of truth for every color, spacing value, radius, and type scale used across `apps/web` and `apps/admin`. Lives as real code in `packages/shared/themes/`, imported by both apps' Tailwind config. **No component may hard-code a hex value, raw px spacing, or one-off font-size — everything references a token below.**
>
> The exact hex values below are a proposed **starting palette** (dark-first, matching the reference site's dark-with-toggle feel) — swap in Megagig's actual approved brand colors here first if/when they exist; every other file in this planning set only ever refers to token *names*, never these raw values, so a rebrand is a one-file change.

## 1. Color tokens

Defined as CSS custom properties on `:root` (light) and `.dark` (dark), consumed via Tailwind's `theme.extend.colors` pointing at `var(--token-name)`.

```css
:root {
  /* Brand */
  --color-brand: #2563eb;           /* primary brand blue — CTAs, links, active nav */
  --color-brand-foreground: #ffffff;
  --color-brand-muted: #dbeafe;     /* light brand tint — badges, hover backgrounds */
  --color-accent: #16a34a;          /* secondary accent green — "live in production" badges, success states */
  --color-accent-foreground: #ffffff;

  /* Surfaces */
  --color-background: #ffffff;
  --color-surface: #f8fafc;         /* cards, section alternates */
  --color-surface-raised: #ffffff;  /* elevated cards, modals */
  --color-border: #e2e8f0;

  /* Text */
  --color-foreground: #0f172a;
  --color-foreground-muted: #475569;
  --color-foreground-subtle: #94a3b8;

  /* Semantic */
  --color-success: #16a34a;
  --color-warning: #d97706;
  --color-danger: #dc2626;
  --color-info: #2563eb;

  /* Lead status (admin only) */
  --color-status-new: #2563eb;
  --color-status-contacted: #d97706;
  --color-status-quoted: #7c3aed;
  --color-status-won: #16a34a;
  --color-status-lost: #64748b;
}

.dark {
  --color-brand: #3b82f6;
  --color-brand-foreground: #0b1120;
  --color-brand-muted: #1e3a8a;
  --color-accent: #22c55e;
  --color-accent-foreground: #052e16;

  --color-background: #0b0f19;      /* near-black, matches reference site's dark mode */
  --color-surface: #111827;
  --color-surface-raised: #1a2233;
  --color-border: #1f2937;

  --color-foreground: #f1f5f9;
  --color-foreground-muted: #94a3b8;
  --color-foreground-subtle: #64748b;

  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #f87171;
  --color-info: #60a5fa;

  /* Lead status (admin only) — brightened the same way as the semantic
     colors above; found during review that these were previously
     unset in dark mode, silently inheriting the light-mode values. */
  --color-status-new: #60a5fa;
  --color-status-contacted: #f59e0b;
  --color-status-quoted: #a78bfa;
  --color-status-won: #22c55e;
  --color-status-lost: #94a3b8;
}
```

## 2. Spacing scale

Tailwind's default 4px-based scale is kept (`spacing-1` = 4px … `spacing-24` = 96px) — no custom spacing tokens needed beyond Tailwind defaults, **except** these named section-rhythm tokens used consistently for vertical section padding on the marketing site:

```css
:root {
  --space-section-y: 6rem;        /* 96px — desktop vertical padding for major landing sections */
  --space-section-y-mobile: 3.5rem; /* 56px — mobile vertical padding for major landing sections */
  --space-container-x: 1.5rem;    /* 24px — horizontal page gutter on mobile */
  --space-container-max: 80rem;   /* 1280px — max content width for marketing sections */
}
```

Every top-level `<section>` on `apps/web` marketing pages uses `py-[--space-section-y-mobile] md:py-[--space-section-y]` and a container with `max-w-[--space-container-max] px-[--space-container-x]` — no section invents its own padding value.

## 3. Border radius

```css
:root {
  --radius-sm: 0.375rem;   /* 6px — badges, small buttons */
  --radius-md: 0.625rem;   /* 10px — inputs, standard buttons */
  --radius-lg: 1rem;       /* 16px — cards */
  --radius-xl: 1.5rem;     /* 24px — hero panels, large feature cards */
  --radius-full: 9999px;   /* pills, avatars */
}
```

## 4. Typography scale

Two font families: a geometric sans for UI/body text, a monospace for code/tech-stack labels (mirrors the reference site's use of a terminal-style font for code snippets).

```css
:root {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;

  --text-xs: 0.75rem;     /* 12px — eyebrow labels, badges */
  --text-sm: 0.875rem;    /* 14px — captions, meta text */
  --text-base: 1rem;      /* 16px — body */
  --text-lg: 1.125rem;    /* 18px — lead paragraphs */
  --text-xl: 1.25rem;     /* 20px — card titles */
  --text-2xl: 1.5rem;     /* 24px — section sub-headings */
  --text-3xl: 1.875rem;   /* 30px — section headings (mobile) */
  --text-4xl: 2.25rem;    /* 36px — section headings (desktop) */
  --text-5xl: 3rem;       /* 48px — page/hero headings (mobile) */
  --text-6xl: 3.75rem;    /* 60px — hero heading (desktop) */

  --leading-tight: 1.1;
  --leading-snug: 1.35;
  --leading-normal: 1.6;

  --tracking-tight: -0.02em;   /* headings */
  --tracking-normal: 0;
  --tracking-wide: 0.08em;     /* eyebrow labels, uppercase micro-copy */
}
```

Weight usage: headings `font-semibold`/`font-bold` (600/700) only; body copy `font-normal` (400); emphasis inline `font-medium` (500). Never use `font-light` for anything below `--text-3xl` — it hurts legibility at body sizes, especially in dark mode.

## 5. Shadows & elevation

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 12px -2px rgb(0 0 0 / 0.08), 0 2px 4px -2px rgb(0 0 0 / 0.06);
  --shadow-lg: 0 12px 32px -8px rgb(0 0 0 / 0.16);
  --shadow-glow-brand: 0 0 40px -8px var(--color-brand);  /* used sparingly — hero CTA hover, featured badges */
}
.dark {
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.3);
  --shadow-md: 0 4px 12px -2px rgb(0 0 0 / 0.4), 0 2px 4px -2px rgb(0 0 0 / 0.3);
  --shadow-lg: 0 12px 32px -8px rgb(0 0 0 / 0.5);
}
```

## 6. Motion

```css
:root {
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 150ms;
  --duration-standard: 250ms;
  --duration-slow: 400ms;
}
```

Used for hover/focus transitions, theme toggle, accordion expand/collapse, carousel slide. Respect `prefers-reduced-motion` — disable non-essential transform/opacity transitions (hero background motion, marquee auto-scroll) when it's set.

## 7. Breakpoints

Tailwind defaults are used as-is (`sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`, `2xl: 1536px`) — no custom breakpoints for this project.
