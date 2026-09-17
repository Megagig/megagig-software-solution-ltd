import { z } from "zod";

export const CreateLeadSchema = z.object({
  name: z.string().min(1, "Required"),
  email: z.string().min(1, "Required"),
  phone: z.string().min(1, "Required"),
  company: z.string().min(1, "Required"),
  project_type: z.string().min(1, "Required"),
  budget_range: z.string().min(1, "Required"),
  message: z.string().optional(),
  source: z.string().min(1, "Required"),
  status: z.string().min(1, "Required"),
  internal_notes: z.string().optional(),
});

export const UpdateLeadSchema = z.object({
  name: z.string().min(1, "Required").optional(),
  email: z.string().min(1, "Required").optional(),
  phone: z.string().min(1, "Required").optional(),
  company: z.string().min(1, "Required").optional(),
  project_type: z.string().min(1, "Required").optional(),
  budget_range: z.string().min(1, "Required").optional(),
  message: z.string().optional(),
  source: z.string().min(1, "Required").optional(),
  status: z.string().min(1, "Required").optional(),
  internal_notes: z.string().optional(),
});

export type CreateLeadInput = z.infer<typeof CreateLeadSchema>;
export type UpdateLeadInput = z.infer<typeof UpdateLeadSchema>;
