import { z } from "zod";

export const CreateTestimonialSchema = z.object({
  quote_text: z.string().optional(),
  author_name: z.string().min(1, "Required"),
  author_role: z.string().min(1, "Required"),
  company_name: z.string().min(1, "Required"),
  company_url: z.string().min(1, "Required"),
  avatar_id: z.string().uuid("Invalid ID").optional(),
  case_study_id: z.string().uuid("Invalid ID").optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const UpdateTestimonialSchema = z.object({
  quote_text: z.string().optional(),
  author_name: z.string().min(1, "Required").optional(),
  author_role: z.string().min(1, "Required").optional(),
  company_name: z.string().min(1, "Required").optional(),
  company_url: z.string().min(1, "Required").optional(),
  avatar_id: z.string().uuid("Invalid ID").optional(),
  case_study_id: z.string().uuid("Invalid ID").optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateTestimonialInput = z.infer<typeof CreateTestimonialSchema>;
export type UpdateTestimonialInput = z.infer<typeof UpdateTestimonialSchema>;
