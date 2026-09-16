"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { useLogout } from "@/hooks/use-auth";

// Defaults: 14:30 idle, 30s countdown. The pair sums to a 15-minute
// session — match this to your API JWT TTL.
const IDLE_WARN_MS = Number(process.env.NEXT_PUBLIC_SESSION_IDLE_MS ?? 14 * 60 * 1000 + 30 * 1000);
const COUNTDOWN_MS = Number(process.env.NEXT_PUBLIC_SESSION_COUNTDOWN_MS ?? 30 * 1000);

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "touchstart", "wheel"] as const;

export function SessionWatchdog() {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(COUNTDOWN_MS);
  const lastActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { mutate: logout } = useLogout();

  const stopCountdown = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  const scheduleIdleCheck = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      setRemaining(COUNTDOWN_MS);
      setOpen(true);
    }, IDLE_WARN_MS);
  }, []);

  // Reset on user activity, but only while the modal is closed — once
  // it's open we want the countdown to play out so users can&apos;t
  // accidentally dismiss it by wiggling the mouse.
  const onActivity = useCallback(() => {
    if (open) return;
    lastActivityRef.current = Date.now();
    scheduleIdleCheck();
  }, [open, scheduleIdleCheck]);

  useEffect(() => {
    scheduleIdleCheck();
    for (const ev of ACTIVITY_EVENTS) {
      window.addEventListener(ev, onActivity, { passive: true });
    }
    return () => {
      for (const ev of ACTIVITY_EVENTS) window.removeEventListener(ev, onActivity);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      stopCountdown();
    };
  }, [onActivity, scheduleIdleCheck, stopCountdown]);

  // Countdown ticker — runs only while the modal is open.
  useEffect(() => {
    if (!open) return;
    countdownTimerRef.current = setInterval(() => {
      setRemaining((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          stopCountdown();
          setOpen(false);
          logout();
          return 0;
        }
        return next;
      });
    }, 1000);
    return stopCountdown;
  }, [open, logout, stopCountdown]);

  const stay = async () => {
    stopCountdown();
    setOpen(false);
    try {
      await apiClient.post("/api/auth/refresh");
    } catch {
      // Refresh failed (likely a stale refresh cookie). Force logout.
      logout();
      return;
    }
    lastActivityRef.current = Date.now();
    scheduleIdleCheck();
  };

  const signOut = () => {
    stopCountdown();
    setOpen(false);
    logout();
  };

  if (!open) return null;

  const seconds = Math.ceil(remaining / 1000);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-watchdog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-bg-elevated p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning/15 text-warning">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <h2 id="session-watchdog-title" className="text-lg font-semibold text-foreground">
            Still there?
          </h2>
        </div>

        <p className="mt-3 text-sm text-text-secondary">
          For your security we&apos;ll sign you out automatically after{' '}
          <span className="font-semibold text-foreground">{seconds}s</span> of further inactivity.
        </p>

        <div className="mt-5">
          <div className="h-1 w-full overflow-hidden rounded-full bg-bg-hover">
            <div
              className="h-full bg-accent transition-[width] duration-1000 ease-linear"
              style={{ width: ((remaining / COUNTDOWN_MS) * 100) + "%" }}
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={signOut}
            className="inline-flex items-center justify-center rounded-lg border border-border bg-bg-elevated px-4 py-2 text-sm font-medium text-foreground hover:bg-bg-hover"
          >
            Sign out
          </button>
          <button
            type="button"
            onClick={stay}
            autoFocus
            className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Stay signed in
          </button>
        </div>
      </div>
    </div>
  );
}
