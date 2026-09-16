"use client";

import { useEffect, useRef, useState } from "react";
import { getIcon } from "@/lib/icons";

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon?: string;
  color?: string;
  format?: "number" | "currency" | "percentage";
  href?: string;
}

const colorMap: Record<string, string> = {
  accent: "from-accent/20 to-accent/5",
  success: "from-success/20 to-success/5",
  danger: "from-danger/20 to-danger/5",
  warning: "from-warning/20 to-warning/5",
  info: "from-info/20 to-info/5",
};

const iconColorMap: Record<string, string> = {
  accent: "text-accent",
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  info: "text-info",
};

export function StatsCard({ label, value, change, icon, color = "accent", format, href }: StatsCardProps) {
  const Icon = icon ? getIcon(icon) : null;
  const gradient = colorMap[color] ?? colorMap.accent;
  const iconColor = iconColorMap[color] ?? iconColorMap.accent;
  const animatedValue = useAnimatedCounter(typeof value === "number" ? value : 0);
  const displayValue = typeof value === "number" ? formatValue(animatedValue, format) : value;

  const Wrapper = href ? "a" : "div";
  const wrapperProps = href ? { href, className: "block" } : {};

  return (
    <Wrapper {...wrapperProps}>
      <div className={`rounded-xl border border-border bg-gradient-to-br ${gradient} p-6 transition-colors hover:border-border/80`}>
        <div className="flex items-center justify-between">
          {Icon && (
            <div className="rounded-lg bg-bg-secondary/50 p-2">
              <Icon className={`h-5 w-5 ${iconColor}`} />
            </div>
          )}
          {change && (
            <span className={`text-xs font-medium ${
              change.startsWith("+") ? "text-success" : change.startsWith("-") ? "text-danger" : "text-text-secondary"
            }`}>
              {change}
            </span>
          )}
        </div>
        <div className="mt-4">
          <p className="text-3xl font-bold text-foreground">{displayValue}</p>
          <p className="text-sm text-text-secondary mt-1">{label}</p>
        </div>
      </div>
    </Wrapper>
  );
}

function useAnimatedCounter(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    if (target === 0) {
      setValue(0);
      return;
    }

    startRef.current = null;

    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return value;
}

function formatValue(value: number, format?: "number" | "currency" | "percentage"): string {
  switch (format) {
    case "currency":
      return "$" + value.toLocaleString();
    case "percentage":
      return value + "%";
    default:
      return value.toLocaleString();
  }
}
