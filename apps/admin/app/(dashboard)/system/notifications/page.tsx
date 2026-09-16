"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/chrome/PageHeader";
import { IconButton } from "@/components/ui/IconButton";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useToastedMutation } from "@/hooks/use-toasted-mutation";
import { Check, AlertCircle, AlertTriangle, Activity as ActivityIcon, Bell } from "@/lib/icons";
import { apiClient } from "@/lib/api-client";

interface Notification {
  id: string;
  source: "sentinel" | "pulse" | "system";
  severity: "critical" | "high" | "medium" | "low" | "info";
  title: string;
  body: string;
  link: string;
  count: number;
  read_at: string | null;
  created_at: string;
}

interface ListResponse {
  data: Notification[];
  unread: number;
}

const severityClass: Record<Notification["severity"], string> = {
  critical: "bg-danger/10 text-danger",
  high:     "bg-warning/10 text-warning",
  medium:   "bg-info/10 text-info",
  low:      "bg-foreground/5 text-foreground-muted",
  info:     "bg-foreground/5 text-foreground-muted",
};

const sourceIcon: Record<Notification["source"], React.ReactNode> = {
  sentinel: <AlertTriangle className="h-4 w-4" />,
  pulse:    <ActivityIcon className="h-4 w-4" />,
  system:   <AlertCircle className="h-4 w-4" />,
};

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery<ListResponse>({
    queryKey: ["notifications", "list"],
    queryFn: async () => {
      const { data } = await apiClient.get<ListResponse>("/api/notifications");
      return data;
    },
  });

  const markRead = useToastedMutation({
    mutationFn: async (id: string) => apiClient.post("/api/notifications/" + id + "/read"),
    successMessage: "Marked read",
    silentSuccess: true,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useToastedMutation({
    mutationFn: async () => apiClient.post("/api/notifications/read-all"),
    successMessage: "All notifications marked read",
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const items = data?.data || [];
  const unread = data?.unread || 0;

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Recent system, security, and performance events"
        actions={
          unread > 0 ? (
            <IconButton
              variant="secondary"
              icon={<Check className="h-4 w-4" />}
              label="Mark all read"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            />
          ) : null
        }
      />

      {isLoading ? (
        <SkeletonTable rows={6} columns={3} />
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-12 text-center">
          <Bell className="mx-auto h-10 w-10 text-foreground-subtle" />
          <p className="mt-3 text-base font-medium text-foreground">You're all caught up</p>
          <p className="mt-1 text-sm text-foreground-subtle">Nothing needs your attention right now.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => {
            const unreadRow = !n.read_at;
            return (
              <li
                key={n.id}
                className={
                  "rounded-xl border p-4 transition-colors " +
                  (unreadRow ? "border-brand/30 bg-brand/5" : "border-border bg-surface-raised")
                }
              >
                <div className="flex items-start gap-3">
                  <span className={"mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md " + severityClass[n.severity]}>
                    {sourceIcon[n.source]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={n.link || "#"}
                      onClick={() => { if (unreadRow) markRead.mutate(n.id); }}
                      className="block"
                    >
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{n.title}</p>
                        {n.count > 1 && (
                          <span className="rounded bg-foreground/5 px-1.5 text-xs font-medium text-foreground-subtle">×{n.count}</span>
                        )}
                        <span className={"rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase " + severityClass[n.severity]}>
                          {n.severity}
                        </span>
                      </div>
                      {n.body && <p className="mt-0.5 text-sm text-foreground-muted">{n.body}</p>}
                      <p className="mt-1 text-xs text-foreground-subtle">
                        {n.source} · {new Date(n.created_at).toLocaleString()}
                      </p>
                    </Link>
                  </div>
                  {unreadRow && (
                    <button
                      type="button"
                      onClick={() => markRead.mutate(n.id)}
                      aria-label="Mark read"
                      className="shrink-0 rounded p-1.5 text-foreground-subtle hover:bg-foreground/5 hover:text-foreground"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
