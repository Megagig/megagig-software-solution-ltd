import { z } from "zod";

export const SocialLinksSchema = z.object({
  linkedin: z.string().optional(),
  github: z.string().optional(),
  youtube: z.string().optional(),
  facebook: z.string().optional(),
  twitter: z.string().optional(),
});

export const SiteSettingsSchema = z.object({
  id: z.string(),
  contact_email: z.string(),
  contact_phone: z.string(),
  whatsapp_number: z.string(),
  address: z.string(),
  social_links: SocialLinksSchema.nullable(),
  hero_headline: z.string(),
  hero_subhead: z.string(),
  pricing_blurbs: z.record(z.string(), z.string()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const UpdateSiteSettingsSchema = z.object({
  contact_email: z.string().email("Invalid email").optional(),
  contact_phone: z.string().optional(),
  whatsapp_number: z.string().optional(),
  address: z.string().optional(),
  social_links: SocialLinksSchema.optional(),
  hero_headline: z.string().optional(),
  hero_subhead: z.string().optional(),
  pricing_blurbs: z.record(z.string(), z.string()).optional(),
});

export type SiteSettings = z.infer<typeof SiteSettingsSchema>;
export type UpdateSiteSettingsInput = z.infer<typeof UpdateSiteSettingsSchema>;
