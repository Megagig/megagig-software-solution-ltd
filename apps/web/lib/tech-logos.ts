// Real brand-logo source paths, keyed by the exact label used everywhere a
// tech is referenced (Home's tech-stack strip, Services detail pages'
// "typical stack" row). Single source of truth so both places reference
// the same files — Tailwind has no logo file yet, so it's absent here and
// callers fall back to a generic icon rather than fabricating a mark.
export const TECH_LOGOS: Record<string, string> = {
  "Next.js": "/nextjslogo.png",
  React: "/reactlogo.png",
  "Node.js": "/nodejslogo.png",
  Go: "/golanglogo.jfif",
  "MongoDB / PostgreSQL": "/postgres_mongodb_logo.jfif",
  Electron: "/electronjs.png",
  Expo: "/expo_logo.png",
  Wails: "/wailslogo.jfif",
};
