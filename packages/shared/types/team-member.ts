import type { Upload } from "./upload";

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo_id: string;
  photo?: Upload;
  linkedin_url: string;
  github_url: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
