export interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  // Optional: empty = use the general CV email fallback.
  apply_url: string;
  // The publish switch — closed roles are hidden from /careers.
  is_open: boolean;
  created_at: string;
  updated_at: string;
}
