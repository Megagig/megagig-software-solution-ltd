import { z } from "zod";

export const CreateStatSchema = z.object({
  value: z.string().min(1, "Required"),
  label: z.string().min(1, "Required"),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const UpdateStatSchema = z.object({
  value: z.string().min(1, "Required").optional(),
  label: z.string().min(1, "Required").optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateStatInput = z.infer<typeof CreateStatSchema>;
export type UpdateStatInput = z.infer<typeof UpdateStatSchema>;
