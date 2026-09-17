export interface SocialLinks {
  linkedin?: string;
  github?: string;
  youtube?: string;
  facebook?: string;
  twitter?: string;
}

export interface SiteSettings {
  id: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  address: string;
  social_links: SocialLinks | null;
  hero_headline: string;
  hero_subhead: string;
  pricing_blurbs: Record<string, string> | null;
  created_at: string;
  updated_at: string;
}
