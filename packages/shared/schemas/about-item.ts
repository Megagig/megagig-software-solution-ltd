import { z } from "zod";

// "value" | "milestone" | "step" — decides which /about-us section an item
// renders in. `label` is free-form text used only by milestones.
export const ABOUT_ITEM_KINDS = ["value", "milestone", "step"] as const;
export const AboutItemKindSchema = z.enum(ABOUT_ITEM_KINDS);

export const CreateAboutItemSchema = z.object({
  kind: AboutItemKindSchema,
  title: z.string().min(1, "Required"),
  description: z.string().optional(),
  label: z.string().optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export const UpdateAboutItemSchema = z.object({
  kind: AboutItemKindSchema.optional(),
  title: z.string().min(1, "Required").optional(),
  description: z.string().optional(),
  label: z.string().optional(),
  published: z.boolean().optional(),
  sort_order: z.number().int().optional(),
});

export type CreateAboutItemInput = z.infer<typeof CreateAboutItemSchema>;
export type UpdateAboutItemInput = z.infer<typeof UpdateAboutItemSchema>;
