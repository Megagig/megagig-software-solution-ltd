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
  mission_statement: z.string(),
  founded_year: z.number().int(),
  founding_story: z.string(),
  founder_name: z.string(),
  founder_role: z.string(),
  founder_quote: z.string(),
  founder_bio: z.string(),
  founder_photo_url: z.string(),
  founder_github_url: z.string(),
  founder_linkedin_url: z.string(),
  founder_twitter_url: z.string(),
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
  mission_statement: z.string().optional(),
  founded_year: z.number().int().optional(),
  founding_story: z.string().optional(),
  founder_name: z.string().optional(),
  founder_role: z.string().optional(),
  founder_quote: z.string().optional(),
  founder_bio: z.string().optional(),
  founder_photo_url: z.string().optional(),
  founder_github_url: z.string().optional(),
  founder_linkedin_url: z.string().optional(),
  founder_twitter_url: z.string().optional(),
});

export type SiteSettings = z.infer<typeof SiteSettingsSchema>;
export type UpdateSiteSettingsInput = z.infer<typeof UpdateSiteSettingsSchema>;
