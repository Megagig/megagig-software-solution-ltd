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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
            />
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
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
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} />
            <YAxis stroke="var(--text-muted)" fontSize={12} />
            <Tooltip
              contentStyle={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text-primary)",
              }}
            />
            <Bar dataKey="value" fill="var(--accent)" radius={[4, 4, 0, 0]} />
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
    const COLORS = ["var(--accent)", "var(--success)", "var(--warning)", "var(--info)", "var(--danger)"];
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
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--text-primary)",
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
    <div className="rounded-xl border border-border bg-bg-secondary p-6">
      <h3 className="text-sm font-medium text-text-secondary mb-4">{config.label}</h3>
      {data.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-text-muted text-sm">
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
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
    </div>
  );
}
