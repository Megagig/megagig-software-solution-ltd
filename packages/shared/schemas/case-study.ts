import { z } from "zod";

export const CreateCaseStudySchema = z.object({
  slug: z.string().min(1, "Required"),
  client_name: z.string().min(1, "Required"),
  tagline: z.string().min(1, "Required"),
  category_tags: z.array(z.string()).optional(),
  status_badge: z.string().min(1, "Required"),
  hero_image_id: z.string().uuid("Invalid ID"),
  problem: z.string().optional(),
  what_we_built: z.string().optional(),
  result: z.string().optional(),
  tech_stack: z.array(z.string()).optional(),
  live_url: z.string().optional(),
  testimonial_id: z.string().uuid("Invalid ID").optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const UpdateCaseStudySchema = z.object({
  slug: z.string().min(1, "Required").optional(),
  client_name: z.string().min(1, "Required").optional(),
  tagline: z.string().min(1, "Required").optional(),
  category_tags: z.array(z.string()).optional(),
  status_badge: z.string().min(1, "Required").optional(),
  hero_image_id: z.string().uuid("Invalid ID").optional(),
  problem: z.string().optional(),
  what_we_built: z.string().optional(),
  result: z.string().optional(),
  tech_stack: z.array(z.string()).optional(),
  live_url: z.string().optional(),
  testimonial_id: z.string().uuid("Invalid ID").optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateCaseStudyInput = z.infer<typeof CreateCaseStudySchema>;
export type UpdateCaseStudyInput = z.infer<typeof UpdateCaseStudySchema>;
