"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "@/lib/icons";

type Mode = "light" | "dark";

// applyMode writes every signal a downstream consumer might key off so
// the visual swap happens regardless of which mechanism a stylesheet is
// using. Idempotent — safe to call on every render.
function applyMode(mode: Mode) {
  const root = document.documentElement;
  root.setAttribute("data-theme-mode", mode);
  root.classList.toggle("dark", mode === "dark");
  root.style.colorScheme = mode;
}

/**
 * Two-mode light/dark toggle. Persists to localStorage("grit-theme-mode").
 *
 * The button stays mounted in SSR (initial render returns the light icon)
 * to avoid a layout jump when the client picks up the stored preference.
 * The actual mode is settled in useEffect after hydration; before that
 * point, the button is decorative.
 */
export function DarkModeToggle({ className = "" }: { className?: string }) {
  const [mode, setMode] = useState<Mode>("light");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? (window.localStorage.getItem("grit-theme-mode") as Mode | null)
      : null);
    // Prefer stored choice; fall back to OS-level preference; default light.
    const osDark = typeof window !== "undefined"
      && window.matchMedia
      && window.matchMedia("(prefers-color-scheme: dark)").matches;
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
      window.localStorage.setItem("grit-theme-mode", next);
    } catch {
      // Private browsing / storage quota — the in-memory mode still flips,
      // it just won't survive a reload. Non-fatal.
    }
  };

  return (
    <button
      type="button"
      onClick={flip}
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={mode === "dark"}
      suppressHydrationWarning
      className={"inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-bg-elevated text-text-secondary hover:bg-bg-hover transition-colors " + className}
    >
      {hydrated && mode === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
