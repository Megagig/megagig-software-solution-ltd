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
  // About & founder copy. Empty string = not set (the public site hides
  // the matching section). founder_bio paragraphs are separated by a blank line.
  mission_statement: string;
  founded_year: number;
  founding_story: string;
  founder_name: string;
  founder_role: string;
  founder_quote: string;
  founder_bio: string;
  founder_photo_url: string;
  founder_github_url: string;
  founder_linkedin_url: string;
  founder_twitter_url: string;
  created_at: string;
  updated_at: string;
}
