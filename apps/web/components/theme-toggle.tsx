"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

type Mode = "light" | "dark";

function applyMode(mode: Mode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

/**
 * Two-mode light/dark toggle. Persists to localStorage("megagig-theme-mode").
 * Mirrors apps/admin's DarkModeToggle so both apps behave identically —
 * duplicated rather than shared, per code-standards.md §3 (apps/web and
 * apps/admin never cross-import components).
 *
 * The button stays mounted through SSR (initial render shows the light
 * icon) to avoid a layout jump; the real mode is settled in useEffect
 * after hydration, since localStorage/matchMedia aren't available server-side.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("megagig-theme-mode") as Mode | null)
        : null;
    const osDark =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initial: Mode = stored || (osDark ? "dark" : "light");
    setMode(initial);
    applyMode(initial);
    setHydrated(true);
  }, []);

  const flip = () => {
    const next: Mode = mode === "dark" ? "light" : "dark";
    setMode(next);
    applyMode(next);
    try {
      window.localStorage.setItem("megagig-theme-mode", next);
    } catch {
      // Private browsing / storage quota — mode still flips for this
      // session, it just won't survive a reload. Non-fatal.
    }
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={mode === "dark"}
      suppressHydrationWarning
      className={
        "inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-surface-raised text-foreground-muted transition-colors hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-2 " +
        className
      }
    >
      {hydrated && mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
