import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Soft-tint pill per ui-rules.md §6 — a ~10% tint background of the
// semantic/brand color with full-opacity text of that same color, never a
// solid fill (reads too heavy at this size).
const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        brand: "bg-brand/10 text-brand",
        accent: "bg-accent/10 text-accent",
        success: "bg-success/10 text-success",
        warning: "bg-warning/10 text-warning",
        danger: "bg-danger/10 text-danger",
        info: "bg-info/10 text-info",
        neutral: "bg-foreground-subtle/10 text-foreground-muted",
      },
      uppercase: {
        true: "uppercase tracking-wide",
        false: "",
      },
    },
    defaultVariants: {
      variant: "brand",
      uppercase: false,
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, uppercase, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, uppercase, className }))}
      {...props}
    />
  );
}
