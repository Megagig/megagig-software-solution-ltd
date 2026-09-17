import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface JobOpening {
  id: string;
  title: string;
  department: string;
  location: string;
  employment_type: string;
  description: string;
  apply_url: string;
  is_open: boolean;
  created_at: string;
  updated_at: string;
}

interface JobOpeningsResponse {
  data: JobOpening[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}

interface UseJobOpeningsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useJobOpenings({ page = 1, pageSize = 20, search = "", sortBy = "created_at", sortOrder = "desc" }: UseJobOpeningsParams = {}) {
  return useQuery<JobOpeningsResponse>({
    queryKey: ["job_openings", { page, pageSize, search, sortBy, sortOrder }],
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
      const { data } = await apiClient.get(`/api/job_openings?${params}`);
      return data;
    },
  });
}

export function useGetJobOpening(id: string) {
  return useQuery<JobOpening>({
    queryKey: ["job_openings", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/job_openings/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateJobOpening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await apiClient.post("/api/job_openings", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_openings"] });
    },
  });
}

export function useUpdateJobOpening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const { data } = await apiClient.put(`/api/job_openings/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_openings"] });
    },
  });
}

export function useDeleteJobOpening() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/job_openings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job_openings"] });
    },
  });
}
