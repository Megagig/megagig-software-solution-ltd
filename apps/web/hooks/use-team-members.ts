import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";

interface TeamMember {
  id: string;
  name: string;
  role: string;
  photo_url: string;
  linkedin_url: string;
  github_url: string;
  twitter_url: string;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface TeamMembersResponse {
  data: TeamMember[];
  meta: {
    total: number;
    page: number;
    page_size: number;
    pages: number;
  };
}

interface UseTeamMembersParams {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export function useTeamMembers({ page = 1, pageSize = 20, search = "", sortBy = "created_at", sortOrder = "desc" }: UseTeamMembersParams = {}) {
  return useQuery<TeamMembersResponse>({
    queryKey: ["team_members", { page, pageSize, search, sortBy, sortOrder }],
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
      const { data } = await apiClient.get(`/api/team_members?${params}`);
      return data;
    },
  });
}

export function useGetTeamMember(id: string) {
  return useQuery<TeamMember>({
    queryKey: ["team_members", id],
    queryFn: async () => {
      const { data } = await apiClient.get(`/api/team_members/${id}`);
      return data.data;
    },
    enabled: !!id,
  });
}

export function useCreateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: Record<string, unknown>) => {
      const { data } = await apiClient.post("/api/team_members", input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
    },
  });
}

export function useUpdateTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Record<string, unknown>) => {
      const { data } = await apiClient.put(`/api/team_members/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
    },
  });
}

export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/api/team_members/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_members"] });
    },
  });
}
