import type { Upload } from "./upload";
import type { CaseStudy } from "./case-study";

export interface Testimonial {
  id: string;
  quote_text: string;
  author_name: string;
  author_role: string;
  company_name: string;
  company_url: string;
  avatar_id?: string;
  avatar?: Upload;
  case_study_id?: string;
  case_study?: CaseStudy;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
