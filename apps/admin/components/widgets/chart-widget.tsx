"use client";

import dynamic from "next/dynamic";
import type { WidgetDefinition } from "@/lib/resource";

const LineChart = dynamic(
  () => import("recharts").then((mod) => {
    const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = mod;
    return function ChartLine({ data }: { data: ChartData[] }) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" stroke="var(--color-foreground-subtle)" fontSize={12} />
            <YAxis stroke="var(--color-foreground-subtle)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-foreground)",
              }}
            />
            <Line type="monotone" dataKey="value" stroke="var(--color-brand)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      );
    };
  }),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const BarChart = dynamic(
  () => import("recharts").then((mod) => {
    const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = mod;
    return function ChartBar({ data }: { data: ChartData[] }) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
            <XAxis dataKey="label" stroke="var(--color-foreground-subtle)" fontSize={12} />
            <YAxis stroke="var(--color-foreground-subtle)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-foreground)",
              }}
            />
            <Bar dataKey="value" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      );
    };
  }),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

const PieChartComponent = dynamic(
  () => import("recharts").then((mod) => {
    const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = mod;
    const COLORS = ["var(--color-brand)", "var(--color-success)", "var(--color-warning)", "var(--color-info)", "var(--color-danger)"];
    return function ChartPie({ data }: { data: ChartData[] }) {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" nameKey="label">
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "var(--color-surface-raised)",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                color: "var(--color-foreground)",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    };
  }),
  { ssr: false, loading: () => <ChartSkeleton /> }
);

interface ChartData {
  label: string;
  value: number;
}

interface ChartWidgetProps {
  config: WidgetDefinition;
  data?: ChartData[];
}

export function ChartWidget({ config, data = [] }: ChartWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="text-sm font-medium text-foreground-muted mb-4">{config.label}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-foreground-subtle text-sm">
          No chart data available
        </div>
      ) : config.chartType === "bar" ? (
        <BarChart data={data} />
      ) : config.chartType === "pie" ? (
        <PieChartComponent data={data} />
      ) : (
        <LineChart data={data} />
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex items-center justify-center h-[300px]">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
    </div>
  );
}
