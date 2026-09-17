import type { MetadataRoute } from "next";

// apps/admin is internal-only staff tooling behind auth — it must never be
// indexed, per architecture.md §8 ("at minimum, be excluded from
// search-engine indexing... in addition to JWT auth").
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
