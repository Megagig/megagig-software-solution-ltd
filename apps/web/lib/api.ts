import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  // The browser attaches the HttpOnly grit_access / grit_refresh cookies
  // set by /api/auth/login automatically. Without this, axios skips them
  // on cross-origin requests in dev (api on :8080, web on :3000) and the
  // server treats every request as anonymous.
  withCredentials: true,
});

// The API is served under a version prefix (/api/v1/...). Endpoints are
// written as "/api/..." throughout the app and pinned to the version here, so
// moving to v2 is a one-line change instead of a find-and-replace.
export const API_VERSION = "v1";

api.interceptors.request.use((config) => {
  const url = config.url ?? "";
  if (
    url.startsWith("/api/") &&
    url !== "/api/ws" &&
    !url.startsWith("/api/" + API_VERSION + "/")
  ) {
    config.url = "/api/" + API_VERSION + url.slice("/api".length);
  }
  return config;
});

// Echo the grit_csrf cookie into X-CSRF-Token on every state-changing
// request. The cookie is intentionally not HttpOnly — it's the
// double-submit token, paired with the cookie the AutoCSRF middleware
// enforces. Safe-method requests don't need it; the middleware skips
// them and issues / refreshes the cookie as a side effect.
api.interceptors.request.use((config) => {
  if (typeof document !== "undefined") {
    const m = document.cookie.match(/(?:^|; )grit_csrf=([^;]+)/);
    if (m && config.headers) {
      config.headers["X-CSRF-Token"] = decodeURIComponent(m[1]);
    }
  }

  // Auto-attach Idempotency-Key on unsafe methods so any mutation gets
  // safe-retry semantics for free.
  const method = (config.method || "get").toUpperCase();
  const unsafe = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
  if (unsafe && config.headers && !config.headers["Idempotency-Key"]) {
    config.headers["Idempotency-Key"] = crypto.randomUUID();
  }
  return config;
});

// v3.31.21: alias kept so generated React Query hooks that import
// { apiClient } from "@/lib/api" resolve symmetrically with apps/admin
// (which exports the same name from its own api-client.ts).
export const apiClient = api;
