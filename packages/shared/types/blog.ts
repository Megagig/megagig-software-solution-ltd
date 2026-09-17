import type { TeamMember } from "./team-member";

export interface Blog {
  id: string;
  title: string;
  slug: string;
  content: string;
  image: string | null;
  excerpt: string | null;
  author_id: string | null;
  author?: TeamMember;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}
