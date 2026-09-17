import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface Testimonial {
  id: string;
  quote_text: string;
  author_name: string;
  author_role: string;
  company_name: string;
  company_url: string;
  avatar_id: string;
  avatar?: any;
  case_study_id: string;
  case_study?: any;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TestimonialsResponse {
  data: Testimonial[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}

interface UseTestimonialsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useTestimonials({ page = 1, pageSize = 20, search = "", sortBy = "created_at", sortOrder = "desc" }: UseTestimonialsParams = {}) {
  return useQuery<TestimonialsResponse>({
    queryKey: ["testimonials", { page, pageSize, search, sortBy, sortOrder }],
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
      const { data } = await apiClient.get(`/api/testimonials?${params}`);
      return data;
    },
  });
}

export function useGetTestimonial(id: string) {
  return useQuery<Testimonial>({
    queryKey: ["testimonials", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/testimonials/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await apiClient.post("/api/testimonials", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    },
  });
}

export function useUpdateTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const { data } = await apiClient.put(`/api/testimonials/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    },
  });
}

export function useDeleteTestimonial() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/testimonials/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["testimonials"] });
    },
  });
}
