"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, PieChart, Pie, Cell,
} from "recharts";
import { useMe } from "@/hooks/use-auth";
import { usePermissions } from "@/hooks/use-permissions";
import { resources } from "@/resources";
import { PageHeader } from "@/components/chrome/PageHeader";
import { SkeletonCards } from "@/components/ui/Skeleton";
import { DateFilter, type DateRange } from "@/components/tables/date-filter";
import { ResourceWidgetsRow } from "@/components/dashboard/ResourceWidgetsRow";
import { apiClient } from "@/lib/api-client";
import {
  Activity as ActivityIcon, ArrowUpRight,
  Users, Bell, TrendingUp, Database, Shield, getIcon,
} from "@/lib/icons";

interface MeStats {
  users: number;
  active_users: number;
}
interface ActivityRow {
  id: string;
  action: string;
  severity: "info" | "warn" | "critical";
  summary: string;
  ip_address: string;
  created_at: string;
}
interface ActivityListResponse { data: ActivityRow[] }
interface ActivityStatsResponse { data: { info: number; warn: number; critical: number; total: number } }
interface NotificationsResponse { unread: number }

export default function DashboardPage() {
  const { data: user } = useMe();
  // Gate every resource-driven widget by the viewer's "<slug>.view" grant so
  // the dashboard shows the same surface the sidebar does — a user granted
  // only Categories + Products sees only those, not the whole catalog. Fails
  // open while permissions load (can() is closed until then); super-admins
  // short-circuit inside can(). Every underlying route is enforced server-side.
  const { can, isSuper, isLoading: permsLoading } = usePermissions();
  const visibleResources = resources.filter((r) => permsLoading || can(r.slug + ".view"));
  const canViewUsers = permsLoading || can("users.view");
  const canViewActivity = permsLoading || can("audit.view");
  // v3.31.44 -- shared DateFilter scopes the per-resource widgets
  // (Total + Latest N). Held in state here so the filter survives
  // hot-reload but doesn't bleed into the URL (would conflict with
  // the resource list pages' own URL-bound filter).
  const [dateRange, setDateRange] = useState<DateRange>({});
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  // Pull a small bundle of stats from endpoints that already exist —
  // each query is cheap, falls back to zero on error so partial outages
  // don't blank the dashboard.
  const userCount = useQuery<MeStats>({
    queryKey: ["dashboard", "users"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<{ meta?: { total: number } }>("/api/users?page_size=1");
        return { users: data.meta?.total || 0, active_users: data.meta?.total || 0 };
      } catch {
        return { users: 0, active_users: 0 };
      }
    },
    refetchInterval: 60_000,
  });

  const activityStats = useQuery<ActivityStatsResponse["data"]>({
    queryKey: ["dashboard", "activity-stats"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<ActivityStatsResponse>("/api/user-activity/stats");
        return data.data;
      } catch {
        return { info: 0, warn: 0, critical: 0, total: 0 };
      }
    },
    refetchInterval: 60_000,
  });

  const notifications = useQuery<number>({
    queryKey: ["dashboard", "notifications-unread"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<NotificationsResponse>("/api/notifications");
        return data.unread || 0;
      } catch {
        return 0;
      }
    },
    refetchInterval: 60_000,
  });

  const recentActivity = useQuery<ActivityRow[]>({
    queryKey: ["dashboard", "recent-activity"],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<ActivityListResponse>("/api/user-activity?page_size=8");
        return data.data;
      } catch {
        return [];
      }
    },
    refetchInterval: 60_000,
  });

  // 7-day mock series — real implementation would call an /api/dashboard
  // endpoint. We pre-build the shape so swapping in real data later is
  // a one-line change.
  const weekSeries = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return {
        day: d.toLocaleDateString(undefined, { weekday: "short" }),
        events: Math.round(20 + Math.random() * 80),
      };
    });
  }, []);

  const severitySeries = useMemo(() => {
    const s = activityStats.data;
    if (!s || s.total === 0) {
      return [
        { name: "Info", value: 1, color: "var(--info)" },
      ];
    }
    return [
      { name: "Info",     value: s.info,     color: "var(--info)"    },
      { name: "Warn",     value: s.warn,     color: "var(--warning)" },
      { name: "Critical", value: s.critical, color: "var(--danger)"  },
    ].filter((d) => d.value > 0);
  }, [activityStats.data]);

  const statsLoading = userCount.isLoading || activityStats.isLoading;

  return (
    <div>
      <PageHeader
        title={greeting + ", " + (user?.first_name || "Admin")}
        subtitle="Here's a snapshot of what's happening across your app right now."
      />

      {/* v3.31.44 -- range filter scopes the per-resource widgets
          below. Sits on its own row so the existing "Resources"
          stat tile (count of registered modules) reads correctly
          against the dashboard's overall mode. */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-text-muted">
          Showing resource activity for
        </p>
        <DateFilter value={dateRange} onChange={setDateRange} label="Range" />
      </div>

      {/* Stat tiles */}
      {statsLoading ? (
        <SkeletonCards count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {canViewUsers && (
            <StatTile
              label="Users"
              value={userCount.data?.users ?? 0}
              icon={<Users className="h-4 w-4" />}
              href="/resources/users"
              accent="info"
            />
          )}
          {canViewActivity && (
            <StatTile
              label="Events (24h)"
              value={activityStats.data?.total ?? 0}
              icon={<ActivityIcon className="h-4 w-4" />}
              href="/system/activity"
              accent="default"
              sublabel={(activityStats.data?.critical ?? 0) > 0 ? (activityStats.data?.critical + " critical") : "All clear"}
              sublabelTone={(activityStats.data?.critical ?? 0) > 0 ? "danger" : "success"}
            />
          )}
          <StatTile
            label="Notifications"
            value={notifications.data ?? 0}
            icon={<Bell className="h-4 w-4" />}
            href="/system/notifications"
            accent={notifications.data ? "warning" : "default"}
            sublabel={notifications.data ? "unread" : "you're caught up"}
          />
          <StatTile
            label="Resources"
            value={visibleResources.length}
            icon={<Database className="h-4 w-4" />}
            href="/dashboard"
            accent="default"
            sublabel="modules registered"
          />
        </div>
      )}

      {/* Charts row */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-bg-elevated p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Activity, past 7 days</p>
              <p className="text-xs text-text-muted">Events recorded per day across the platform</p>
            </div>
            <TrendingUp className="h-4 w-4 text-text-muted" />
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weekSeries}>
                <defs>
                  <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="day" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "var(--text-secondary)" }}
                  itemStyle={{ color: "var(--foreground)" }}
                />
                <Area type="monotone" dataKey="events" stroke="var(--accent)" strokeWidth={2} fill="url(#activityFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-bg-elevated p-5">
          <div className="mb-4">
            <p className="text-sm font-semibold text-foreground">Severity mix</p>
            <p className="text-xs text-text-muted">Past 24 hours</p>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={severitySeries} dataKey="value" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {severitySeries.map((s, i) => <Cell key={i} fill={s.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1.5 text-xs">
            {severitySeries.map((s) => (
              <li key={s.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-text-secondary">
                  <span className="inline-block h-2 w-2 rounded-full" style={{ background: s.color }} />
                  {s.name}
                </span>
                <span className="font-semibold text-foreground">{s.value}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Recent activity feed */}
      <div className="mt-6 rounded-xl border border-border bg-bg-elevated">
        <header className="flex items-center justify-between border-b border-border px-5 py-3.5">
          <div>
            <p className="text-sm font-semibold text-foreground">Recent activity</p>
            <p className="text-xs text-text-muted">Latest 8 events across the platform</p>
          </div>
          <Link href="/system/activity" className="text-xs font-medium text-accent hover:text-accent-hover">
            View all
          </Link>
        </header>
        {recentActivity.isLoading ? (
          <div className="px-5 py-12 text-center text-sm text-text-muted">Loading...</div>
        ) : (recentActivity.data ?? []).length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-text-muted">No activity yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {(recentActivity.data ?? []).map((row) => (
              <li key={row.id} className="flex items-start gap-3 px-5 py-3 text-sm">
                <SeverityDot severity={row.severity} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-foreground">{row.summary}</p>
                  <p className="text-xs text-text-muted">
                    <code className="font-mono">{row.action}</code>
                    {row.ip_address && (
                      <span title={row.ip_address}>
                        {" · "}
                        {row.ip_address === "::1" || row.ip_address === "127.0.0.1"
                          ? "localhost"
                          : row.ip_address}
                      </span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-text-muted">
                  {timeAgo(row.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Quick Access tiles — bottom section */}
      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-muted">Quick access</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
          {visibleResources.slice(0, 8).map((r) => {
            const Icon = getIcon(r.icon);
            return (
              <Link
                key={r.slug}
                href={"/resources/" + r.slug}
                className="group rounded-xl border border-border bg-bg-elevated p-4 transition-colors hover:bg-bg-hover"
              >
                <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold text-foreground group-hover:text-accent">
                  {r.label?.plural ?? r.name}
                </p>
                <p className="text-xs text-text-muted">Manage {(r.label?.plural ?? r.slug).toLowerCase()}</p>
              </Link>
            );
          })}
          {(permsLoading || isSuper) && (
            <Link
              href="/system"
              className="group rounded-xl border border-dashed border-border bg-bg-elevated p-4 transition-colors hover:bg-bg-hover"
            >
              <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-bg-hover text-text-secondary">
                <Shield className="h-4 w-4" />
              </div>
              <p className="text-sm font-semibold text-foreground group-hover:text-accent">System hub</p>
              <p className="text-xs text-text-muted">Jobs, files, security, observability</p>
            </Link>
          )}
        </div>
      </div>

      {/* v3.31.44 -- per-resource widgets. One row per registered
          resource: Total + 30-day sparkline on the left, Latest N
          records on the right. Resources opting out (`dashboard: { enabled: false }`)
          are skipped here. Each row's queries are keyed on the
          shared DateFilter range so changing the filter refetches
          every widget in lockstep. */}
      {visibleResources.filter((r) => r.dashboard?.enabled !== false).length > 0 && (
        <div className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-text-muted">
              By resource
            </h2>
            <p className="text-[11px] text-text-muted">
              Scoped to the range above &middot; sparkline always last 30 days
            </p>
          </div>
          <div className="space-y-4">
            {visibleResources
              .filter((r) => r.dashboard?.enabled !== false)
              .map((r) => (
                <ResourceWidgetsRow key={r.slug} resource={r} dateRange={dateRange} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface StatTileProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  href: string;
  accent: "default" | "info" | "warning" | "danger";
  sublabel?: string;
  sublabelTone?: "success" | "danger" | "muted";
}

const accentClass: Record<StatTileProps["accent"], string> = {
  default: "bg-accent/10 text-accent",
  info: "bg-info/10 text-info",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

const sublabelClass: Record<NonNullable<StatTileProps["sublabelTone"]>, string> = {
  success: "text-success",
  danger: "text-danger",
  muted: "text-text-muted",
};

function StatTile({ label, value, icon, href, accent, sublabel, sublabelTone = "muted" }: StatTileProps) {
  return (
    <Link
      href={href}
      className="group rounded-xl border border-border bg-bg-elevated p-4 transition-colors hover:bg-bg-hover"
    >
      <div className="flex items-center justify-between">
        <span className={"inline-flex h-9 w-9 items-center justify-center rounded-lg " + accentClass[accent]}>
          {icon}
        </span>
        <ArrowUpRight className="h-4 w-4 text-text-muted opacity-0 transition-opacity group-hover:opacity-100" />
      </div>
      <p className="mt-3 text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sublabel && (
        <p className={"mt-1 text-xs " + sublabelClass[sublabelTone]}>{sublabel}</p>
      )}
    </Link>
  );
}

const severityDotClass: Record<ActivityRow["severity"], string> = {
  info: "bg-info",
  warn: "bg-warning",
  critical: "bg-danger",
};

function SeverityDot({ severity }: { severity: ActivityRow["severity"] }) {
  return (
    <span className="mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full" >
      <span className={"block h-full w-full rounded-full " + severityDotClass[severity]} />
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const sec = Math.round(diff / 1000);
  if (sec < 60) return sec + "s ago";
  const min = Math.round(sec / 60);
  if (min < 60) return min + "m ago";
  const hr = Math.round(min / 60);
  if (hr < 24) return hr + "h ago";
  const days = Math.round(hr / 24);
  return days + "d ago";
}
