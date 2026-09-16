"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getIcon, TrendingUp, TrendingDown } from "@/lib/icons";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface StatCard {
  label: string;
  icon?: string;
  color?: "default" | "success" | "warning" | "danger" | "info";
  /** Either provide a static value... */
  value?: string | number;
  /** ...or an endpoint + field to fetch it from the API (e.g. endpoint: "/api/posts?page_size=1", field: "meta.total") */
  endpoint?: string;
  field?: string;
  /** Optional trend delta shown next to value */
  trend?: { value: number; direction: "up" | "down" };
}

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  stats?: StatCard[];
}

const colorClasses: Record<string, { bg: string; text: string }> = {
  default: { bg: "bg-accent/10", text: "text-accent" },
  success: { bg: "bg-success/10", text: "text-success" },
  warning: { bg: "bg-warning/10", text: "text-warning" },
  danger: { bg: "bg-danger/10", text: "text-danger" },
  info: { bg: "bg-info/10", text: "text-info" },
};

// Reads a dotted path from an object. e.g. getPath(data, "meta.total") → data.meta.total
function getPath(obj: any, path: string): any {
  return path.split(".").reduce((acc, key) => (acc == null ? acc : acc[key]), obj);
}

function StatCardItem({ stat }: { stat: StatCard }) {
  const color = colorClasses[stat.color || "default"];
  const Icon = stat.icon ? getIcon(stat.icon) : null;

  // v3.31.29: queryKey now starts with the base endpoint (no query
  // string) so resource mutations -- which call
  // invalidateQueries({ queryKey: [endpoint] }) -- prefix-match this
  // stat and trigger a refetch. Previously the key started with
  // "stat", so creates/updates/deletes never invalidated stat cards
  // and the dashboard numbers went stale until manual reload.
  const baseEndpoint = stat.endpoint ? stat.endpoint.split("?")[0] : "stat";

  const { data, isLoading } = useQuery({
    queryKey: [baseEndpoint, "stat", stat.endpoint, stat.field],
    queryFn: async () => {
      if (!stat.endpoint) return null;
      const res = await apiClient.get(stat.endpoint);
      return res.data;
    },
    enabled: !!stat.endpoint,
  });

  const value =
    stat.value !== undefined
      ? stat.value
      : stat.endpoint && stat.field
      ? getPath(data, stat.field) ?? "—"
      : "—";

  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-5 transition-colors hover:border-border/80">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
            {stat.label}
          </p>
          <div className="mt-2 flex items-baseline gap-2">
            {isLoading && stat.endpoint ? (
              <div className="h-7 w-16 rounded bg-bg-hover animate-pulse" />
            ) : (
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {typeof value === "number" ? value.toLocaleString() : value}
              </p>
            )}
            {stat.trend && (
              <span
                className={`flex items-center gap-0.5 text-xs font-medium ${
                  stat.trend.direction === "up" ? "text-success" : "text-danger"
                }`}
              >
                {stat.trend.direction === "up" ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {stat.trend.value}%
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color.bg}`}>
            <Icon className={`h-4 w-4 ${color.text}`} />
          </div>
        )}
      </div>
    </div>
  );
}

export function PageHeader({ title, description, breadcrumbs, actions, stats }: PageHeaderProps) {
  return (
    <div className="mb-8">
      {/* v3.31.8: Header row (breadcrumbs + title + actions) is sticky to
          the top of the scrollable main area with a backdrop-blur background
          and a bottom border so long tables/forms scroll behind it. The
          stats grid stays in normal flow below — it's content, not chrome. */}
      <div className="sticky top-0 z-20 -mx-4 border-b border-border bg-bg-primary/90 backdrop-blur supports-[backdrop-filter]:bg-bg-primary/75 md:-mx-8">
        <div className="px-4 py-4 md:px-8">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-3 flex items-center gap-1.5 text-xs">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="text-text-muted">/</span>}
                  {crumb.href && i < breadcrumbs.length - 1 ? (
                    <Link
                      href={crumb.href}
                      className="text-text-secondary hover:text-foreground transition-colors"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-foreground font-medium">{crumb.label}</span>
                  )}
                </span>
              ))}
            </nav>
          )}

          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold text-foreground tracking-tight truncate">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-text-secondary line-clamp-2">{description}</p>
              )}
            </div>
            {actions && <div className="flex shrink-0 items-center gap-2 whitespace-nowrap">{actions}</div>}
          </div>
        </div>
      </div>

      {stats && stats.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, i) => (
            <StatCardItem key={i} stat={stat} />
          ))}
        </div>
      )}
    </div>
  );
}
