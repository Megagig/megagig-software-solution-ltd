export const ROLES = {
  ADMIN: "ADMIN",
  EDITOR: "EDITOR",
  USER: "USER",
  // grit:role-constants
} as const;

export const API_ROUTES = {
  AUTH: {
    LOGIN: "/api/auth/login",
    REGISTER: "/api/auth/register",
    REFRESH: "/api/auth/refresh",
    LOGOUT: "/api/auth/logout",
    ME: "/api/auth/me",
    FORGOT_PASSWORD: "/api/auth/forgot-password",
    RESET_PASSWORD: "/api/auth/reset-password",
    OAUTH: {
      GOOGLE: "/api/auth/oauth/google",
      GITHUB: "/api/auth/oauth/github",
    },
  },
  USERS: {
    LIST: "/api/users",
    GET: (id: string) => `/api/users/${id}`,
    UPDATE: (id: string) => `/api/users/${id}`,
    DELETE: (id: string) => `/api/users/${id}`,
  },
  UPLOADS: {
    CREATE: "/api/uploads",
    LIST: "/api/uploads",
    GET: (id: string) => `/api/uploads/${id}`,
    DELETE: (id: string) => `/api/uploads/${id}`,
  },
  AI: {
    COMPLETE: "/api/ai/complete",
    CHAT: "/api/ai/chat",
    STREAM: "/api/ai/stream",
  },
  ADMIN: {
    JOBS_STATS: "/api/admin/jobs/stats",
    JOBS_LIST: (status: string) => `/api/admin/jobs/${status}`,
    JOBS_RETRY: (id: string) => `/api/admin/jobs/${id}/retry`,
    JOBS_CLEAR: (queue: string) => `/api/admin/jobs/queue/${queue}`,
    CRON_TASKS: "/api/admin/cron/tasks",
  },
  PROFILE: {
    GET: "/api/profile",
    UPDATE: "/api/profile",
    DELETE: "/api/profile",
  },
  BLOGS: {
    LIST: "/api/blogs",
    GET: (slug: string) => `/api/blogs/${slug}`,
    ADMIN_LIST: "/api/admin/blogs",
    CREATE: "/api/admin/blogs",
    UPDATE: (id: string) => `/api/admin/blogs/${id}`,
    DELETE: (id: string) => `/api/admin/blogs/${id}`,
  },
  HEALTH: "/api/health",
  TEAM_MEMBERS: {
    LIST: "/api/team_members",
    GET: (id: number) => `/api/team_members/${id}`,
    CREATE: "/api/team_members",
    UPDATE: (id: number) => `/api/team_members/${id}`,
    DELETE: (id: number) => `/api/team_members/${id}`,
  },
  CASE_STUDIES: {
    LIST: "/api/case_studies",
    GET: (id: number) => `/api/case_studies/${id}`,
    CREATE: "/api/case_studies",
    UPDATE: (id: number) => `/api/case_studies/${id}`,
    DELETE: (id: number) => `/api/case_studies/${id}`,
  },
  TESTIMONIALS: {
    LIST: "/api/testimonials",
    GET: (id: number) => `/api/testimonials/${id}`,
    CREATE: "/api/testimonials",
    UPDATE: (id: number) => `/api/testimonials/${id}`,
    DELETE: (id: number) => `/api/testimonials/${id}`,
  },
  PRODUCTS: {
    LIST: "/api/products",
    GET: (id: number) => `/api/products/${id}`,
    CREATE: "/api/products",
    UPDATE: (id: number) => `/api/products/${id}`,
    DELETE: (id: number) => `/api/products/${id}`,
  },
  JOB_OPENINGS: {
    LIST: "/api/job_openings",
    GET: (id: number) => `/api/job_openings/${id}`,
    CREATE: "/api/job_openings",
    UPDATE: (id: number) => `/api/job_openings/${id}`,
    DELETE: (id: number) => `/api/job_openings/${id}`,
  },
  FAQS: {
    LIST: "/api/faqs",
    GET: (id: number) => `/api/faqs/${id}`,
    CREATE: "/api/faqs",
    UPDATE: (id: number) => `/api/faqs/${id}`,
    DELETE: (id: number) => `/api/faqs/${id}`,
  },
  LEADS: {
    LIST: "/api/leads",
    GET: (id: number) => `/api/leads/${id}`,
    CREATE: "/api/leads",
    UPDATE: (id: number) => `/api/leads/${id}`,
    DELETE: (id: number) => `/api/leads/${id}`,
  },
  // Singleton — GET is public, PUT is admin-only. No list/create/delete.
  SITE_SETTINGS: {
    GET: "/api/site-settings",
    UPDATE: "/api/site-settings",
  },
  STATS: {
    LIST: "/api/stats",
    GET: (id: number) => `/api/stats/${id}`,
    CREATE: "/api/stats",
    UPDATE: (id: number) => `/api/stats/${id}`,
    DELETE: (id: number) => `/api/stats/${id}`,
  },
  ABOUT_ITEMS: {
    LIST: "/api/about_items",
    GET: (id: number) => `/api/about_items/${id}`,
    CREATE: "/api/about_items",
    UPDATE: (id: number) => `/api/about_items/${id}`,
    DELETE: (id: number) => `/api/about_items/${id}`,
  },
  // grit:api-routes
} as const;
