import { z } from "zod";

export const CreateFAQSchema = z.object({
  question: z.string().min(1, "Required"),
  answer: z.string().optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const UpdateFAQSchema = z.object({
  question: z.string().min(1, "Required").optional(),
  answer: z.string().optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateFAQInput = z.infer<typeof CreateFAQSchema>;
export type UpdateFAQInput = z.infer<typeof UpdateFAQSchema>;
