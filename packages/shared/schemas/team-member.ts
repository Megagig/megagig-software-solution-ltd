import { z } from "zod";

export const CreateTeamMemberSchema = z.object({
  name: z.string().min(1, "Required"),
  role: z.string().min(1, "Required"),
  photo_id: z.string().uuid("Invalid ID"),
  linkedin_url: z.string().min(1, "Required"),
  github_url: z.string().min(1, "Required"),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const UpdateTeamMemberSchema = z.object({
  name: z.string().min(1, "Required").optional(),
  role: z.string().min(1, "Required").optional(),
  photo_id: z.string().uuid("Invalid ID").optional(),
  linkedin_url: z.string().min(1, "Required").optional(),
  github_url: z.string().min(1, "Required").optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateTeamMemberInput = z.infer<typeof CreateTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof UpdateTeamMemberSchema>;
