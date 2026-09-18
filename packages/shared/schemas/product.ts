import { z } from "zod";

export const CreateProductSchema = z.object({
  slug: z.string().min(1, "Required"),
  name: z.string().min(1, "Required"),
  tagline: z.string().min(1, "Required"),
  description: z.string().optional(),
  feature_bullets: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  live_url: z.string().min(1, "Required"),
  docs_url: z.string().min(1, "Required"),
  screenshot_ids: z.array(z.string().uuid()).optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const UpdateProductSchema = z.object({
  slug: z.string().min(1, "Required").optional(),
  name: z.string().min(1, "Required").optional(),
  tagline: z.string().min(1, "Required").optional(),
  description: z.string().optional(),
  feature_bullets: z.array(z.string()).optional(),
  platforms: z.array(z.string()).optional(),
  live_url: z.string().min(1, "Required").optional(),
  docs_url: z.string().min(1, "Required").optional(),
  screenshot_ids: z.array(z.string().uuid()).optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
