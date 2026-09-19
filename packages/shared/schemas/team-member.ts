import { z } from "zod";

// photo_url is a plain URL/path (uploaded file or static asset); every
// social link is optional — the public site shows a button only when set.
export const CreateTeamMemberSchema = z.object({
  name: z.string().min(1, "Required"),
  role: z.string().min(1, "Required"),
  photo_url: z.string().optional(),
  linkedin_url: z.string().optional(),
  github_url: z.string().optional(),
  twitter_url: z.string().optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const UpdateTeamMemberSchema = z.object({
  name: z.string().min(1, "Required").optional(),
  role: z.string().min(1, "Required").optional(),
  photo_url: z.string().optional(),
  linkedin_url: z.string().optional(),
  github_url: z.string().optional(),
  twitter_url: z.string().optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateTeamMemberInput = z.infer<typeof CreateTeamMemberSchema>;
export type UpdateTeamMemberInput = z.infer<typeof UpdateTeamMemberSchema>;
