import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Hoist the monorepo's root .env into process.env. Next.js auto-loads
// .env only from the package's own directory, so without this the THEME
// and SOCIAL_AUTH_ENABLED values set at the root are invisible to the
// admin app. Shell env wins — we only fill in unset keys.
const rootEnv = resolve(process.cwd(), "..", "..", ".env");
if (existsSync(rootEnv)) {
  for (const line of readFileSync(rootEnv, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/i);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].trim();
  }
}


// --- Security headers -------------------------------------------------------
// Next.js ships no security headers by default. These mirror the Go API's
// middleware.SecurityHeaders so both halves of the app agree; keep them in sync.
//
// CSP caveats (both load-bearing — test before tightening):
//   * script-src needs 'unsafe-inline' — Next inlines its bootstrap + streams
//     the RSC payload via inline <script>. 'self' alone white-screens the app.
//     Locking this down means nonce-based CSP in middleware, which forces every
//     route to render dynamically.
//   * connect-src must include the API origin — in double/triple mode the
//     browser calls the Go API cross-origin, and a missing entry breaks every
//     fetch with a CSP violation.
const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
// Browser-facing origin of stored files. Uploads are presigned PUTs made
// directly from the browser to object storage, and stored images are served
// from the same host — both are blocked unless this origin is in connect-src
// and img-src. Defaults to the local MinIO endpoint; in production set
// NEXT_PUBLIC_STORAGE_URL to your S3/R2/B2 public origin
// (e.g. https://cdn.example.com or https://<bucket>.s3.<region>.amazonaws.com).
const STORAGE_ORIGIN = process.env.NEXT_PUBLIC_STORAGE_URL || "http://localhost:9002";
const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" + (isDev ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https: " + STORAGE_ORIGIN,
  "font-src 'self' data:",
  // ws:/wss: keep the dev overlay + HMR socket working. api.ipify.org is the
  // public-IP hint the API client fetches so local audit records show a real
  // address instead of ::1 — dev only, and it must be allowed here or the
  // browser logs a CSP violation on every page load.
  "connect-src 'self' " + API_ORIGIN + " " + STORAGE_ORIGIN + (isDev ? " ws: wss: https://api.ipify.org" : ""),
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Browsers ignore HSTS over plain http, so sending it in dev is harmless.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@repo/shared"],
  // Mirror THEME + SOCIAL_AUTH_ENABLED from .env into the NEXT_PUBLIC_*
  // namespace so server components and the client bundle both see the
  // active theme without a flash of unstyled content. Falls back to the
  // safe defaults when the vars aren't set (atlas, social auth on).
  env: {
    NEXT_PUBLIC_THEME: process.env.THEME || "atlas",
    NEXT_PUBLIC_SOCIAL_AUTH_ENABLED: process.env.SOCIAL_AUTH_ENABLED || "true",
  },
  // Don't advertise the framework + version to attackers.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // Uncomment and run "ANALYZE=true pnpm build" to inspect the bundle
  // ...(process.env.ANALYZE === "true"
  //   ? { ...require("@next/bundle-analyzer")({ enabled: true })(nextConfig) }
  //   : {}),
};

export default nextConfig;
