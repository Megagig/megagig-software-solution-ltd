"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer, AreaChart, Area, Tooltip,
} from "recharts";
import { apiClient } from "@/lib/api-client";
import { dateRangeToQueryParams, type DateRange } from "@/components/tables/date-filter";
import { getIcon, ArrowUpRight } from "@/lib/icons";
import type { ResourceDefinition } from "@/lib/resource";

// One sparkline bucket = one calendar day. Always 30 buckets so the
// chart shape stays stable; counts inside the active date range only
// affect the "Total" number, not the sparkline window.
interface ResourceStatsBucket {
  date: string;
  count: number;
}

interface ResourceStatsResponse {
  data: {
    resource: string;
    total: number;
    series: ResourceStatsBucket[];
    latest: Record<string, unknown>[];
  };
}

interface Props {
  resource: ResourceDefinition;
  dateRange: DateRange;
}

export function ResourceStatCard({ resource, dateRange }: Props) {
  const params = dateRangeToQueryParams(dateRange);
  const query = useQuery<ResourceStatsResponse["data"]>({
    queryKey: ["dashboard", "resource-stats", resource.slug, params],
    queryFn: async () => {
      const search = new URLSearchParams(params).toString();
      const url =
        "/api/admin/dashboard/resource-stats/" +
        resource.slug +
        (search ? "?" + search : "");
      const { data } = await apiClient.get<ResourceStatsResponse>(url);
      return data.data;
    },
    // The dashboard cycles between resources quickly; keep stats
    // around so re-opening the page doesn't re-flash the skeleton.
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const Icon = getIcon(resource.icon);
  const label = resource.label?.plural ?? resource.slug;
  const total = query.data?.total ?? 0;
  const series = query.data?.series ?? [];
  // Treat empty/error as zero so the layout doesn't shift.
  const sparkData = series.length
    ? series
    : Array.from({ length: 30 }).map((_, i) => ({
        date: String(i),
        count: 0,
      }));

  return (
    <Link
      href={"/resources/" + resource.slug}
      className="group block rounded-xl border border-border bg-bg-elevated p-4 transition-colors hover:bg-bg-hover"
    >
      <div className="flex items-start justify-between">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
          <Icon className="h-4 w-4" />
        </span>
        <ArrowUpRight className="h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        Total {label}
      </p>
      <p className="text-2xl font-bold text-foreground">
        {query.isLoading ? (
          <span className="text-text-muted">—</span>
        ) : (
          total.toLocaleString()
        )}
      </p>
      {/* Always render the sparkline space so the card height is
          stable, even before data lands. */}
      <div className="mt-2 h-12 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sparkData} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={"spark-" + resource.slug} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.45} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                fontSize: 11,
                padding: "4px 8px",
              }}
              labelStyle={{ color: "var(--text-secondary)" }}
              itemStyle={{ color: "var(--foreground)" }}
              cursor={{ stroke: "var(--accent)", strokeOpacity: 0.3 }}
              formatter={(value: number) => [value + " new", "Count"]}
              labelFormatter={(d: string) => d}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="var(--accent)"
              strokeWidth={1.5}
              fill={"url(#spark-" + resource.slug + ")"}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] text-text-muted">Last 30 days</p>
    </Link>
  );
}
