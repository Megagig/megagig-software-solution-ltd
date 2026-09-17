import type { Upload } from "./upload";
import type { Testimonial } from "./testimonial";

export interface CaseStudy {
  id: string;
  slug: string;
  client_name: string;
  tagline: string;
  category_tags: string[];
  status_badge: string;
  hero_image_id: string;
  hero_image?: Upload;
  problem: string;
  what_we_built: string;
  result: string;
  tech_stack: string[];
  testimonial_id?: string;
  testimonial?: Testimonial;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
