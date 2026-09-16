// brand.config.ts — single source of truth for your app's identity.
//
// Imported across apps/admin and apps/web by auth pages, dashboards,
// emails, and metadata. Edit this file once to rebrand the entire app:
// name, tagline, logo, hero photography, social links.
//
// Want runtime-driven branding (set from .env or a Settings UI)? Mirror
// the fields below into env variables and read them with process.env at
// build time. The file shape stays the same.

export const brand = {
  /** Display name shown on auth pages, the sidebar header, and emails. */
  name: "Megagig Software Solution",

  /** One-line hero headline on the auth split panel. Keep it under 50 chars. */
  tagline: "Manage everything\nin one place.",

  /** Secondary line under the tagline. 1–2 short sentences. */
  description:
    "The admin dashboard for your application. Monitor, manage, and control your platform from a single screen.",

  /** Logo — single-character fallback when no image is set. The full
   *  variant is used in the expanded sidebar + auth pages; the mark
   *  variant is used in the collapsed sidebar and favicons. Both are
   *  optional and resolve from /public. */
  logo: {
    text: "M",
    /** Wide logo (text + icon) shown in the expanded sidebar. */
    image: "" as string | "",
    /** Square mark shown in the collapsed sidebar, ~32x32. */
    mark: "" as string | "",
  },

  /** Hero imagery — used by the Pulse theme's auth carousel and as a
   *  fallback wallpaper by Atlas/Aurora when set. Paths resolve from
   *  /public.
   *
   *  Empty by default: the scaffold ships no photography, so listing paths
   *  here would 404 on the login page of every new project. Drop your own
   *  images into public/hero/ and add them below — provide at least 3 for
   *  the carousel to feel alive. While this is empty the auth screens fall
   *  back to a themed gradient. */
  hero: {
    images: [] as string[],
    /** Carousel rotation interval in ms. */
    intervalMs: 5000,
  },

  /** Optional brand color overrides. Leave empty strings to inherit the
   *  active theme's palette. Useful for keeping the theme structure but
   *  swapping just the primary accent. */
  colors: {
    primary: "" as string | "",
    accent: "" as string | "",
  },

  /** Social links — surfaced in the auth page footer and the dashboard
   *  user menu. Leave empty to hide. */
  social: {
    twitter: "",
    linkedin: "",
    github: "",
    youtube: "",
  },

  /** Legal links — shown in the auth footer for compliance. */
  legal: {
    termsUrl: "/terms",
    privacyUrl: "/privacy",
  },
} as const;

export type Brand = typeof brand;
