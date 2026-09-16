"use client";

import type { WidgetDefinition } from "@/lib/resource";
import { StatsCard } from "./stats-card";
import { ChartWidget } from "./chart-widget";
import { ActivityWidget } from "./activity-widget";
import { useResource } from "@/hooks/use-resource";

interface WidgetGridProps {
  widgets: WidgetDefinition[];
}

export function WidgetGrid({ widgets }: WidgetGridProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {widgets.map((widget, i) => (
        <div
          key={i}
          className={`${
            widget.colSpan === 2 ? "sm:col-span-2" :
            widget.colSpan === 3 ? "sm:col-span-2 lg:col-span-3" :
            widget.colSpan === 4 ? "sm:col-span-2 lg:col-span-4" :
            ""
          }`}
        >
          <WidgetRenderer widget={widget} />
        </div>
      ))}
    </div>
  );
}

function WidgetRenderer({ widget }: { widget: WidgetDefinition }) {
  switch (widget.type) {
    case "stat":
      return <StatWidgetLoader widget={widget} />;
    case "chart":
      return <ChartWidget config={widget} />;
    case "activity":
      return <ActivityWidget label={widget.label} />;
    default:
      return null;
  }
}

function StatWidgetLoader({ widget }: { widget: WidgetDefinition }) {
  const { data } = useResource(widget.endpoint ?? "", {
    page: 1,
    pageSize: 1,
  });

  const total = data?.meta?.total ?? 0;

  return (
    <StatsCard
      label={widget.label}
      value={total}
      icon={widget.icon}
      color={widget.color}
      format={widget.format}
    />
  );
}
