"use client";

import { Children, useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface CarouselProps {
  children: React.ReactNode;
  autoAdvanceMs?: number;
  className?: string;
}

// Per ui-rules.md §9: auto-advances, pauses on hover/focus, always has
// visible prev/next controls and dot indicators — never auto-advance-only.
export function Carousel({ children, autoAdvanceMs = 6000, className }: CarouselProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // React only arrays-wraps `children` when there are 2+ JSX children — a
  // single slide arrives as a bare element, not a 1-item array. Children.toArray
  // normalizes both cases (and gives each slide a stable key for free).
  const slides = Children.toArray(children);
  const count = slides.length;

  const goTo = useCallback((i: number) => setIndex(((i % count) + count) % count), [count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), autoAdvanceMs);
    return () => clearInterval(id);
  }, [paused, count, autoAdvanceMs]);

  if (count === 0) return null;

  return (
    <div
      className={cn("relative", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="overflow-hidden">
        <div
          className="flex transition-transform duration-slow ease-standard"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((child, i) => (
            <div key={i} className="w-full shrink-0">
              {child}
            </div>
          ))}
        </div>
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            aria-label="Previous slide"
            onClick={() => goTo(index - 1)}
            className="absolute left-0 top-1/2 -translate-x-4 -translate-y-1/2 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground shadow-sm transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next slide"
            onClick={() => goTo(index + 1)}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface-raised text-foreground shadow-sm transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-6 flex items-center justify-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index}
                onClick={() => goTo(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-fast ease-standard",
                  i === index ? "w-6 bg-brand" : "w-2 bg-border hover:bg-foreground-subtle"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
