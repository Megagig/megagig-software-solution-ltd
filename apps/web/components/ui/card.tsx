import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Base card per ui-rules.md §5: surface-raised bg, 1px border, radius-lg,
// shadow-sm at rest. Hover lift only applies to cards that are themselves
// link/click targets — static info cards stay put.
const cardVariants = cva(
  "rounded-lg border border-border bg-surface-raised shadow-sm transition-shadow duration-standard ease-standard",
  {
    variants: {
      interactive: {
        true: "cursor-pointer hover:-translate-y-0.5 hover:shadow-md",
        false: "",
      },
    },
    defaultVariants: {
      interactive: false,
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, interactive, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ interactive, className }))} {...props} />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...props} />;
}

export function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-xl font-semibold text-foreground", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("mt-1.5 text-sm text-foreground-muted", className)} {...props} />
  );
}

export function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-6 pb-6", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center px-6 pb-6", className)} {...props} />
  );
}
