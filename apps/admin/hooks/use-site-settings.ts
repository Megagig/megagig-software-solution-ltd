import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface SiteSettings {
  id: string;
  contact_email: string;
  contact_phone: string;
  whatsapp_number: string;
  address: string;
  social_links: {
    linkedin?: string;
    github?: string;
    youtube?: string;
    facebook?: string;
    twitter?: string;
  } | null;
  hero_headline: string;
  hero_subhead: string;
  pricing_blurbs: Record<string, string> | null;
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

export function useSiteSettings() {
  return useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data } = await apiClient.get("/api/site-settings");
      return data.data;
    },
  });
}

export function useUpdateSiteSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await apiClient.put("/api/site-settings", input);
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["site-settings"], data.data);
    },
  });
}
