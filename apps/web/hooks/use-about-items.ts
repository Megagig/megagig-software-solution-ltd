import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface AboutItem {
  id: string;
  kind: string;
  title: string;
  description: string;
  label: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface AboutItemsResponse {
  data: AboutItem[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}

interface UseAboutItemsParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useAboutItems({ page = 1, pageSize = 20, search = "", sortBy = "created_at", sortOrder = "desc" }: UseAboutItemsParams = {}) {
  return useQuery<AboutItemsResponse>({
    queryKey: ["about_items", { page, pageSize, search, sortBy, sortOrder }],
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
      const { data } = await apiClient.get(`/api/about_items?${params}`);
      return data;
    },
  });
}

export function useGetAboutItem(id: string) {
  return useQuery<AboutItem>({
    queryKey: ["about_items", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/about_items/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateAboutItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await apiClient.post("/api/about_items", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about_items"] });
    },
  });
}

export function useUpdateAboutItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const { data } = await apiClient.put(`/api/about_items/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about_items"] });
    },
  });
}

export function useDeleteAboutItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/about_items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["about_items"] });
    },
  });
}
