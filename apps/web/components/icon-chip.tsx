import type { ReactNode } from "react";

// Tinted round icon chip that sits inline in a hero headline and scales with
// the type. Decorative (aria-hidden), so it never affects the heading's text.
export function IconChip({ children }: { children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className="mx-1 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 align-middle text-brand sm:mx-2 sm:h-12 sm:w-12 md:h-14 md:w-14 [&>svg]:h-1/2 [&>svg]:w-1/2"
    >
      {children}
    </span>
  );
}
