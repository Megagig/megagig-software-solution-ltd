"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMe } from "@/hooks/use-auth";
import { CollapsibleSidebar } from "@/components/chrome/CollapsibleSidebar";
import { SessionWatchdog } from "@/components/chrome/SessionWatchdog";
import { QuickAccess } from "@/components/chrome/QuickAccess";
import { Menu } from "@/lib/icons";
// grit:layout:imports

// v3.29: navbar is gone — pages now drop a <PageHeader> at the top of
// their JSX to get title/subtitle/search/dark-toggle/bell/user-menu in
// one consistent strip. The dashboard layout only owns sidebar + main.
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading, isError } = useMe();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("grit-sidebar-collapsed");
    if (stored === "true") setSidebarCollapsed(true);
  }, []);

  // v3.31.15: redirect on BOTH isError (network/server down) AND
  // user === null (401 from /api/auth/me). The previous version
  // only handled isError and returned null on missing user, which
  // rendered a blank white page when the server was restarted
  // mid-session.
  useEffect(() => {
    if (isLoading) return;
    if (isError || user === null) {
      router.replace("/login");
    }
  }, [isError, user, isLoading, router]);

  // Redirect USER role to profile page
  useEffect(() => {
    if (user && user.role === "USER" && window.location.pathname === "/dashboard") {
      router.replace("/profile");
    }
  }, [user, router]);

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem("grit-sidebar-collapsed", String(next));
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  // While the redirect effect fires, render the same spinner so we
  // never flash a blank white page.
  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* v3.31.15: warns and refreshes the session before silent expiry. */}
      <SessionWatchdog />

      <CollapsibleSidebar
        user={user}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div
        className={`flex min-h-screen flex-col transition-all duration-200 ${
          sidebarCollapsed ? "md:ml-16" : "md:ml-64"
        }`}
      >
        {/* Mobile menu button — only shown when the sidebar is hidden
            on small screens. PageHeader supplies the rest of the chrome. */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          className="fixed top-3 left-3 z-30 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface-raised text-foreground-muted shadow-sm md:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>

        {/* grit:layout:banner */}
        <main className="flex-1 px-4 py-6 md:px-8">{children}</main>
      </div>

      {/* Floating quick-access button (configurable) */}
      <QuickAccess />
    </div>
  );
}
