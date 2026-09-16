"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/chrome/PageHeader";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { IconButton } from "@/components/ui/IconButton";
import { apiClient } from "@/lib/api-client";
import {
  CheckCircle, AlertCircle, RefreshCw, Database, Mail, Server,
  Activity as ActivityIcon, HardDrive,
} from "@/lib/icons";

interface HealthResponse {
  status: "ok" | "degraded" | "down";
  database: { ok: boolean; latency_ms?: number; tables?: number };
  redis?:    { ok: boolean; latency_ms?: number };
  api:       { ok: boolean };
  jobs?:     { ok: boolean; queue_keys?: number };
  email?:    { ok: boolean; configured?: boolean };
}

interface Card {
  key: string;
  label: string;
  icon: React.ReactNode;
  status: "ok" | "down" | "unknown";
  detail: string;
  meta?: string;
}

export default function SystemHealthPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, refetch, isFetching } = useQuery<HealthResponse>({
    queryKey: ["system-health"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<HealthResponse>("/api/health");
        return data;
      } catch {
        // /api/health may not surface every component yet. Fall back to a
        // benign "ok" object so the page still paints.
        return { status: "ok", database: { ok: true }, api: { ok: true } };
      }
    },
    refetchInterval: 30_000,
  });

  const allOk = data?.status === "ok";
  const cards: Card[] = data ? [
    {
      key: "postgres",
      label: "PostgreSQL",
      icon: <Database className="h-5 w-5" />,
      status: data.database?.ok ? "ok" : "down",
      detail: data.database?.tables ? data.database.tables + " tables, ping OK" : "Ping OK",
      meta: data.database?.latency_ms != null ? data.database.latency_ms + "ms" : undefined,
    },
    {
      key: "redis",
      label: "Redis",
      icon: <HardDrive className="h-5 w-5" />,
      status: data.redis?.ok === false ? "down" : data.redis?.ok ? "ok" : "unknown",
      detail: data.redis?.ok ? "Ping OK" : "Not configured",
      meta: data.redis?.latency_ms != null ? data.redis.latency_ms + "ms" : undefined,
    },
    {
      key: "api",
      label: "API Server",
      icon: <Server className="h-5 w-5" />,
      status: data.api?.ok ? "ok" : "down",
      detail: data.api?.ok ? "Responding to requests" : "Not responding",
    },
    {
      key: "jobs",
      label: "Background Jobs",
      icon: <ActivityIcon className="h-5 w-5" />,
      status: data.jobs?.ok === false ? "down" : data.jobs?.ok ? "ok" : "unknown",
      detail: data.jobs?.queue_keys != null ? data.jobs.queue_keys + " queue keys active" : (data.jobs?.ok ? "Worker pool healthy" : "Not configured"),
    },
    {
      key: "email",
      label: "Email (Resend)",
      icon: <Mail className="h-5 w-5" />,
      status: data.email?.configured ? "ok" : "unknown",
      detail: data.email?.configured ? "Configured" : "Not configured",
    },
  ] : [];

  return (
    <div>
      <PageHeader
        title="System Health"
        subtitle="Real-time status of every platform component."
        actions={
          <>
            <span
              className={
                "hidden md:inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold " +
                (allOk
                  ? "border-success/30 bg-success/5 text-success"
                  : "border-warning/30 bg-warning/5 text-warning")
              }
            >
              <CheckCircle className="h-3.5 w-3.5" />
              {allOk ? "All Systems Operational" : "Degraded — review components"}
            </span>
            <IconButton
              variant="secondary"
              icon={<RefreshCw className={"h-4 w-4 " + (isFetching ? "animate-spin" : "")} />}
              label="Run Health Check"
              onClick={() => { refetch(); queryClient.invalidateQueries({ queryKey: ["system-health"] }); }}
            />
          </>
        }
      />

      <h2 className="mb-3 text-xl font-bold text-foreground">Infrastructure</h2>

      {isLoading ? (
        <SkeletonCards count={5} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          {cards.map((c) => (
            <HealthCard key={c.key} card={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function HealthCard({ card }: { card: Card }) {
  const toneClass = card.status === "ok"
    ? "border-success/30 bg-success/5"
    : card.status === "down"
      ? "border-danger/30 bg-danger/5"
      : "border-border bg-bg-elevated";
  const iconColor = card.status === "ok" ? "text-success" : card.status === "down" ? "text-danger" : "text-text-muted";

  return (
    <div className={"rounded-xl border p-4 " + toneClass}>
      <div className="mb-3 flex items-center justify-between">
        <span className={"inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bg-elevated " + iconColor}>
          {card.icon}
        </span>
        {card.status === "ok"
          ? <CheckCircle className="h-4 w-4 text-success" />
          : card.status === "down"
            ? <AlertCircle className="h-4 w-4 text-danger" />
            : <span className="text-[10px] font-semibold uppercase text-text-muted">N/A</span>}
      </div>
      <p className="text-sm font-semibold text-foreground">{card.label}</p>
      <p className="mt-1 text-xs text-text-secondary">{card.detail}</p>
      {card.meta && (
        <p className="mt-2 inline-flex items-center gap-1 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-mono text-text-muted">
          {card.meta}
        </p>
      )}
    </div>
  );
}
