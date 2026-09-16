"use client";

import { useEffect, useState } from "react";
import { Activity, ExternalLink, AlertTriangle, Cpu, Database, Zap } from "@/lib/icons";
import { apiClient as api } from "@/lib/api-client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface Summary {
  overview?: { p50_ms?: number; p95_ms?: number; p99_ms?: number; rps?: number; error_rate?: number; total_requests?: number }
  slos?: { data?: Array<{ name: string; target: number; current: number; budget_remaining: number; status: string }> }
  use?: { resources?: Array<{ name: string; utilization: { value: number; band: string }; saturation: { value: number; band: string }; errors: { value: number; band: string } }> }
  n1_ranked?: { data?: Array<{ route: string; pattern: string; occurrences: number; avg_queries_per_request: number; impact_score: number }> }
  errors?: { data?: Array<{ id: string; type: string; message: string; route: string; count: number }> }
  runtime?: { heap_alloc_mb?: number; goroutines?: number; gc_pause_ms?: number }
  health_checks?: { data?: Array<{ name: string; status: string; latency_ms: number; error?: string }> }
  alerts?: { data?: Array<{ id: string; name: string; severity: string; message: string }> }
  _errors?: Record<string, string>
}

const BAND_CLS: Record<string, string> = {
  green:   "bg-success/15 text-success border-success/30",
  amber:   "bg-warning/15 text-warning border-warning/30",
  red:     "bg-danger/15 text-danger border-danger/30",
  unknown: "bg-bg-elevated text-text-muted border-border",
};

export default function ObservabilityPage() {
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const fetch = async () => {
      try {
        const res = await api.get("/api/admin/observability/summary");
        if (alive) setData(res.data?.data || res.data);
        setErr(null);
      } catch (e: any) {
        if (alive) setErr(e?.response?.data?.error?.message || "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    };
    fetch();
    const t = setInterval(fetch, 10_000);
    return () => { alive = false; clearInterval(t); };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2.5">
            <Activity className="h-6 w-6 text-accent" /> Observability
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Live summary from Pulse — percentile latency, SLOs, USE grid, top N+1, errors, runtime
          </p>
        </div>
        <a
          href={`${API_URL}/pulse/ui`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-2.5 text-sm font-medium text-foreground hover:bg-bg-hover transition-colors"
        >
          Open full dashboard <ExternalLink className="h-4 w-4" />
        </a>
      </div>

      {err && !loading && (
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm text-warning flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <strong>Couldn&apos;t reach Pulse.</strong> Make sure <code className="px-1 py-0.5 rounded bg-bg-secondary text-xs font-mono">PULSE_ENABLED=true</code> and the API is running.
            <div className="text-xs text-text-muted mt-1">{err}</div>
          </div>
        </div>
      )}

      {/* Top-line KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="p95 latency" value={data?.overview?.p95_ms != null ? `${data.overview.p95_ms.toFixed(0)} ms` : "—"} tone="info" icon={Zap} />
        <Kpi label="p99 latency" value={data?.overview?.p99_ms != null ? `${data.overview.p99_ms.toFixed(0)} ms` : "—"} tone="warning" icon={Zap} />
        <Kpi label="Error rate" value={data?.overview?.error_rate != null ? `${(data.overview.error_rate * 100).toFixed(2)}%` : "—"} tone="danger" icon={AlertTriangle} />
        <Kpi label="RPS" value={data?.overview?.rps?.toFixed?.(1) ?? "—"} tone="success" icon={Activity} />
      </div>

      {/* SLO compliance bars */}
      <Panel title="SLOs">
        {(data?.slos?.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">No SLOs configured. Add to <code className="px-1 py-0.5 rounded bg-bg-elevated text-xs font-mono">pulse.Config.SLOs</code>.</p>
        ) : (
          <div className="space-y-3">
            {(data?.slos?.data ?? []).map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-foreground">{s.name}</span>
                  <span className={`font-mono ${s.status === "firing" ? "text-danger" : "text-success"}`}>{(s.current * 100).toFixed(2)}% / {(s.target * 100).toFixed(2)}%</span>
                </div>
                <div className="h-2 rounded-full bg-bg-elevated overflow-hidden">
                  <div className={`h-full ${s.status === "firing" ? "bg-danger" : "bg-success"}`} style={{ width: `${Math.min(s.current * 100, 100)}%` }} />
                </div>
                <p className="text-[10px] text-text-muted">Budget remaining: {(s.budget_remaining * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* USE grid + N+1 side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="USE method">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-text-muted">
                <th className="text-left font-medium py-1">Resource</th>
                <th className="text-center font-medium">U</th>
                <th className="text-center font-medium">S</th>
                <th className="text-center font-medium">E</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data?.use?.resources ?? []).map((r) => (
                <tr key={r.name}>
                  <td className="py-1.5 font-medium text-foreground capitalize">{r.name}</td>
                  <td className="py-1.5 text-center"><Cell band={r.utilization?.band} value={r.utilization?.value} /></td>
                  <td className="py-1.5 text-center"><Cell band={r.saturation?.band} value={r.saturation?.value} /></td>
                  <td className="py-1.5 text-center"><Cell band={r.errors?.band} value={r.errors?.value} /></td>
                </tr>
              ))}
              {(!data?.use?.resources || data.use.resources.length === 0) && (
                <tr><td colSpan={4} className="text-center text-text-muted py-3">No USE samples yet.</td></tr>
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title="Top N+1 by impact">
          <ul className="space-y-2 text-xs">
            {(data?.n1_ranked?.data ?? []).slice(0, 6).map((n, i) => (
              <li key={i} className="rounded-lg border border-border bg-bg-elevated p-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-foreground truncate">{n.route}</span>
                  <span className="text-text-muted shrink-0 ml-2">impact {n.impact_score.toFixed(0)}</span>
                </div>
                <p className="font-mono text-[10px] text-text-muted truncate">{n.pattern}</p>
                <p className="text-[10px] text-text-muted mt-0.5">{n.occurrences} occurrences · ~{n.avg_queries_per_request} queries/req</p>
              </li>
            ))}
            {(!data?.n1_ranked?.data || data.n1_ranked.data.length === 0) && (
              <li className="text-text-muted text-center py-3">No N+1 detections.</li>
            )}
          </ul>
        </Panel>
      </div>

      {/* Errors + Runtime side-by-side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Panel title="Recent unresolved errors">
          <ul className="space-y-1.5 text-xs">
            {(data?.errors?.data ?? []).slice(0, 6).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-2 py-1 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-foreground truncate"><span className="font-mono text-[10px] text-text-muted">{e.type}</span> {e.message}</p>
                  <p className="font-mono text-[10px] text-text-muted truncate">{e.route}</p>
                </div>
                <span className="text-text-muted shrink-0">{e.count}×</span>
              </li>
            ))}
            {(!data?.errors?.data || data.errors.data.length === 0) && <li className="text-text-muted text-center py-3">No unresolved errors.</li>}
          </ul>
        </Panel>

        <Panel title="Go runtime">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <Stat label="Heap alloc" value={data?.runtime?.heap_alloc_mb != null ? `${data.runtime.heap_alloc_mb.toFixed(0)} MB` : "—"} />
            <Stat label="Goroutines" value={data?.runtime?.goroutines ?? "—"} />
            <Stat label="GC pause" value={data?.runtime?.gc_pause_ms != null ? `${data.runtime.gc_pause_ms.toFixed(1)} ms` : "—"} />
          </div>
          {data?.health_checks?.data && data.health_checks.data.length > 0 && (
            <div className="mt-4 pt-3 border-t border-border space-y-1">
              <p className="text-[10px] uppercase font-mono tracking-wider text-text-muted">Health checks</p>
              {data.health_checks.data.map((h) => (
                <div key={h.name} className="flex items-center justify-between text-xs">
                  <span className="font-mono text-foreground">{h.name}</span>
                  <span className={`text-[10px] ${h.status === "healthy" ? "text-success" : "text-danger"}`}>
                    {h.status} · {h.latency_ms}ms
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}

function Kpi({ label, value, tone, icon: Icon }: { label: string; value: any; tone: "default" | "success" | "warning" | "info" | "danger"; icon: any }) {
  const toneCls = { default: "text-foreground", success: "text-success", warning: "text-warning", info: "text-info", danger: "text-danger" }[tone];
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">{label}</span>
        <Icon className={`h-4 w-4 ${toneCls}`} />
      </div>
      <p className={`text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: any }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary overflow-hidden">
      <div className="px-4 py-3 border-b border-border"><h2 className="text-sm font-semibold text-foreground">{title}</h2></div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="rounded-lg border border-border bg-bg-elevated px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="text-base font-semibold text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function Cell({ band, value }: { band?: string; value?: number }) {
  const cls = BAND_CLS[band || "unknown"];
  return (
    <span className={`inline-flex items-center justify-center min-w-[44px] px-2 py-0.5 rounded border text-[10px] font-mono ${cls}`}>
      {value != null ? value.toFixed(0) : "—"}
    </span>
  );
}
