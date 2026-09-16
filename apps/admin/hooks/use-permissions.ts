"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

interface MyPermissions {
	grants: string[];
	permissions: string[];
	is_super: boolean;
}

export function usePermissions() {
	const { data, isLoading } = useQuery({
		queryKey: ["my-permissions"],
		staleTime: 60 * 1000,
		queryFn: async () => {
			const res = await apiClient.get("/api/auth/permissions");
			return res.data.data as MyPermissions;
		},
	});

	const granted = new Set(data?.permissions ?? []);
	const isSuper = data?.is_super ?? false;

	/**
	 * can("users.delete")  — exact permission
	 * can("users.*")       — any permission on that resource
	 *
	 * Returns false while loading. Nav items and action buttons therefore stay
	 * hidden until permissions are known, rather than flashing into view and
	 * disappearing — a flash of forbidden UI looks broken and leaks the shape of
	 * the admin to users who can't use it.
	 */
	function can(permission: string): boolean {
		if (isSuper) return true;
		if (permission.endsWith(".*")) {
			const prefix = permission.slice(0, -1); // "users."
			for (const p of granted) {
				if (p.startsWith(prefix)) return true;
			}
			return false;
		}
		return granted.has(permission);
	}

	return { can, isSuper, isLoading, permissions: data?.permissions ?? [] };
}
