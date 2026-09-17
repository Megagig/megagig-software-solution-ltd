import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface CaseStudy {
  id: string;
  slug: string;
  client_name: string;
  tagline: string;
  category_tags: string[];
  status_badge: string;
  hero_image_id: string;
  hero_image?: any;
  problem: string;
  what_we_built: string;
  result: string;
  tech_stack: string[];
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface CaseStudiesResponse {
  data: CaseStudy[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}

interface UseCaseStudiesParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useCaseStudies({ page = 1, pageSize = 20, search = "", sortBy = "created_at", sortOrder = "desc" }: UseCaseStudiesParams = {}) {
  return useQuery<CaseStudiesResponse>({
    queryKey: ["case_studies", { page, pageSize, search, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        sort_by: sortBy,
        sort_order: sortOrder,
      });
      if (search) {
        params.set("search", search);
      }
      const { data } = await apiClient.get(`/api/case_studies?${params}`);
      return data;
    },
  });
}

export function useGetCaseStudy(id: string) {
  return useQuery<CaseStudy>({
    queryKey: ["case_studies", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/case_studies/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateCaseStudy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await apiClient.post("/api/case_studies", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case_studies"] });
    },
  });
}

export function useUpdateCaseStudy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const { data } = await apiClient.put(`/api/case_studies/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case_studies"] });
    },
  });
}

export function useDeleteCaseStudy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/case_studies/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["case_studies"] });
    },
  });
}
