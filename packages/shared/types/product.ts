import type { Upload } from "./upload";

export interface Product {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  feature_bullets: string[];
  live_url: string;
  docs_url: string;
  screenshots?: Upload[];
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
