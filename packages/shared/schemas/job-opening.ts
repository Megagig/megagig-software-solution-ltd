import { z } from "zod";

export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;

// apply_url is optional: a role without its own link falls back to the
// general CV email from Site Settings on the public /careers page.
export const CreateJobOpeningSchema = z.object({
  title: z.string().min(1, "Required"),
  department: z.string().min(1, "Required"),
  location: z.string().min(1, "Required"),
  employment_type: z.string().min(1, "Required"),
  description: z.string().optional(),
  apply_url: z.string().optional(),
  is_open: z.boolean().optional(),
});

export const UpdateJobOpeningSchema = z.object({
  title: z.string().min(1, "Required").optional(),
  department: z.string().min(1, "Required").optional(),
  location: z.string().min(1, "Required").optional(),
  employment_type: z.string().min(1, "Required").optional(),
  description: z.string().optional(),
  apply_url: z.string().optional(),
  is_open: z.boolean().optional(),
});

export type CreateJobOpeningInput = z.infer<typeof CreateJobOpeningSchema>;
export type UpdateJobOpeningInput = z.infer<typeof UpdateJobOpeningSchema>;
