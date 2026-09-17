import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Variant shapes match ui-rules.md §4 exactly: Primary is the one CTA per
// section and must never lose visual priority, Secondary supports it,
// Ghost/Link is for low-emphasis inline actions.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-fast ease-standard focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-foreground shadow-sm hover:shadow-glow-brand hover:-translate-y-0.5",
        secondary:
          "border border-border bg-transparent text-foreground hover:bg-surface",
        ghost: "bg-transparent text-brand hover:underline underline-offset-4",
      },
      size: {
        sm: "h-9 px-4",
        md: "h-11 px-6",
        lg: "h-12 px-8 text-base",
      },
    },
    // Ghost is inline text, not a padded control — reset height/padding from
    // every size so it never picks up the filled-button box sizes above.
    compoundVariants: [
      { variant: "ghost", size: ["sm", "md", "lg"], className: "h-auto p-0" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
