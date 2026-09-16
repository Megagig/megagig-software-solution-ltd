import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Auth storage policy (Grit 3.27+):
//   - The API issues HttpOnly grit_access + grit_refresh cookies on
//     login / register / refresh / OAuth callback. The browser stores
//     them automatically; JS never reads or writes the access token.
//   - withCredentials: true tells axios to attach those cookies on every
//     request, including cross-origin dev (admin :3001 → api :8080).
//   - The CSRF token rides a NON-HttpOnly grit_csrf cookie. We echo it
//     into X-CSRF-Token on every state-changing method — the API's
//     AutoCSRF middleware requires that double-submit token for the
//     mutation to pass.
//   - The 401-refresh interceptor below POSTS /api/auth/refresh with no
//     body — the API reads grit_refresh from the cookie and issues a
//     new grit_access via Set-Cookie. JS still never sees a token.
// The API is served under a version prefix (/api/v1/...). Rather than bake
// "v1" into the ~200 endpoint strings scattered across resources, hooks and
// pages, every request is pinned here — so bumping to v2 is a one-line change
// and the app can never end up half-migrated. Endpoints stay written as
// "/api/users"; this rewrites them on the way out.
export const API_VERSION = "v1";

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const url = config.url ?? "";
  // Skip the WebSocket endpoint (not part of the versioned REST surface) and
  // anything already carrying a version, so re-entrant calls stay idempotent.
  if (
    url.startsWith("/api/") &&
    url !== "/api/ws" &&
    !url.startsWith("/api/" + API_VERSION + "/")
  ) {
    config.url = "/api/" + API_VERSION + url.slice("/api".length);
  }
  return config;
});

// v3.31.49 -- public-IP hint. When the operator runs the admin on
// localhost (the default), the API sees the TCP peer as ::1 and
// logs that in the activity feed. The browser fetches its public IP
// once (cached in sessionStorage for the tab's lifetime) and
// attaches it as X-Public-IP-Hint. The API uses it only when the
// observed peer is loopback -- production traffic from real proxies
// keeps using the trusted X-Forwarded-For path and never honours
// this hint, so it can't be used to spoof audit records.
let publicIPCache: string | null = null;
async function getPublicIPHint(): Promise<string | null> {
  if (publicIPCache) return publicIPCache;
  if (typeof window === "undefined") return null;
  const cached = window.sessionStorage.getItem("grit_public_ip");
  if (cached) {
    publicIPCache = cached;
    return cached;
  }
  try {
    const res = await fetch("https://api.ipify.org?format=json", {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ip?: string };
    if (data.ip) {
      publicIPCache = data.ip;
      window.sessionStorage.setItem("grit_public_ip", data.ip);
      return data.ip;
    }
  } catch {
    // Offline / blocked by an ad-blocker -- fall through; the API
    // will log "::1" as it does today.
  }
  return null;
}
// Kick off the lookup eagerly so the cache is warm by the time the
// first request fires. Fire-and-forget; failures are silent.
//
// Dev only, for two reasons: the hint is only ever honoured when the API sees
// a loopback peer (production goes through X-Forwarded-For), and a production
// build should not reach out to a third party on every page load.
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  void getPublicIPHint();
}

apiClient.interceptors.request.use((config) => {
  // Echo grit_csrf into X-CSRF-Token. The cookie is intentionally not
  // HttpOnly so JS can read it; the API checks both sides match
  // (double-submit pattern) before accepting a mutation.
  if (typeof document !== "undefined") {
    const m = document.cookie.match(/(?:^|; )grit_csrf=([^;]+)/);
    if (m && config.headers) {
      config.headers["X-CSRF-Token"] = decodeURIComponent(m[1]);
    }
  }

  // v3.31.49 -- attach the cached public-IP hint when we have one.
  if (publicIPCache && config.headers) {
    config.headers["X-Public-IP-Hint"] = publicIPCache;
  }

  // Auto-attach Idempotency-Key on unsafe methods. The 401-refresh
  // interceptor below replays the same config object so retries reuse
  // this key — the server caches the first 2xx response for 24h
  // keyed by (method, path, key).
  const method = (config.method || "get").toUpperCase();
  const unsafe = method === "POST" || method === "PUT" || method === "PATCH" || method === "DELETE";
  if (unsafe && config.headers && !config.headers["Idempotency-Key"]) {
    config.headers["Idempotency-Key"] = crypto.randomUUID();
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(undefined);
    }
  });
  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh on the auth endpoints themselves — a wrong password
    // 401-ing into a refresh attempt would loop and wipe the session.
    const url = originalRequest?.url || "";
    const isAuthEndpoint =
      url.includes("/auth/login") ||
      url.includes("/auth/register") ||
      url.includes("/auth/refresh") ||
      url.includes("/auth/me");

    if (error.response?.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => apiClient(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Empty body — the API reads grit_refresh from the HttpOnly
        // cookie that the browser attached automatically, and issues a
        // new grit_access via the Set-Cookie response header.
        await apiClient.post("/api/auth/refresh");

        processQueue(null);
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        // The cookies are HttpOnly so we can't expire them from JS.
        // Forcing a navigation to /login lets the user re-authenticate;
        // the next successful login replaces the cookies via Set-Cookie.
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

/**
 * Upload a file via presigned URL (browser uploads directly to storage).
 * 1. POST /api/uploads/presign → get presigned PUT URL
 * 2. XHR PUT to presigned URL (direct to R2/S3/MinIO)
 * 3. POST /api/uploads/complete → record in DB
 */
export async function uploadFile(
  file: File,
  _endpoint = "/api/uploads",
  onProgress?: (percent: number) => void
): Promise<{ data: Record<string, unknown>; message: string }> {
  // Step 1: Get presigned URL from API
  const { data: presignRes } = await apiClient.post("/api/uploads/presign", {
    filename: file.name,
    content_type: file.type,
    file_size: file.size,
  });
  const { presigned_url, key } = presignRes.data;

  // Step 2: Upload directly to storage via XHR PUT (bypasses API server)
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Storage upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error("Network error during upload"));
    xhr.open("PUT", presigned_url);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

  // Step 3: Record the upload in the database
  const { data: completeRes } = await apiClient.post("/api/uploads/complete", {
    key,
    filename: file.name,
    content_type: file.type,
    size: file.size,
  });
  return completeRes;
}
