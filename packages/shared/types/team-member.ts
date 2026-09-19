export interface TeamMember {
  id: string;
  name: string;
  role: string;
  // Plain URL/path (uploaded file or a static asset); empty = no photo.
  photo_url: string;
  // Each social link is optional; empty string = not set.
  linkedin_url: string;
  github_url: string;
  twitter_url: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
