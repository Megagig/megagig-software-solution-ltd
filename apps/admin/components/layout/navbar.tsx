"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useLogout } from "@/hooks/use-auth";
import { useTheme } from "@/components/shared/theme-provider";
import { getResource } from "@/resources";
import { Search, ChevronLeft, ChevronRight, Sun, Moon, Bell, Activity, Settings, CreditCard, LogOut } from "@/lib/icons";
import type { User } from "@repo/shared/types";

interface NavbarProps {
  user: User;
  onMenuToggle: () => void;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export function Navbar({ user, onMenuToggle, collapsed, onToggleSidebar }: NavbarProps) {
  const { mutate: logout } = useLogout();
  const { theme, toggleTheme } = useTheme();
  const [userOpen, setUserOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const fullName = [user.first_name, user.last_name].filter(Boolean).join(" ") || "User";

  // Build breadcrumbs from pathname
  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: { label: string; href: string }[] = [{ label: "Home", href: "/dashboard" }];

  for (let i = 0; i < segments.length; i++) {
    const href = "/" + segments.slice(0, i + 1).join("/");
    const seg = segments[i];

    if (seg === "resources" && segments[i + 1]) {
      const resource = getResource(segments[i + 1]);
      if (resource) {
        breadcrumbs.push({
          label: resource.label?.plural ?? resource.name,
          href: href + "/" + segments[i + 1],
        });
        i++;
        continue;
      }
    }

    breadcrumbs.push({
      label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, " "),
      href,
    });
  }

  const handleSignOut = () => {
    setUserOpen(false);
    logout(undefined, { onSuccess: () => router.push("/login") });
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      {/* LEFT CLUSTER: mobile hamburger + collapse toggle + breadcrumbs */}
      <div className="flex items-center gap-3">
        {/* Mobile menu button (hidden on desktop) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg hover:bg-bg-hover text-text-secondary transition-colors"
          aria-label="Open menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar collapse toggle (desktop only) */}
        <button
          onClick={onToggleSidebar}
          className="hidden lg:flex items-center justify-center h-9 w-9 rounded-lg hover:bg-bg-hover text-text-secondary transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>

        {/* Breadcrumbs */}
        <nav className="hidden sm:flex items-center gap-1.5 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <span className="text-text-muted">/</span>}
              {i === breadcrumbs.length - 1 ? (
                <span className="text-foreground font-medium">{crumb.label}</span>
              ) : (
                <a
                  href={crumb.href}
                  className="text-text-secondary hover:text-foreground transition-colors"
                >
                  {crumb.label}
                </a>
              )}
            </span>
          ))}
        </nav>
      </div>

      {/* RIGHT CLUSTER: search + notifications + theme + user */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-bg-tertiary px-3 h-9">
          <Search className="h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search..."
            className="w-40 bg-transparent text-sm text-foreground placeholder:text-text-muted focus:outline-none"
          />
        </div>

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center h-9 w-9 rounded-lg hover:bg-bg-hover text-text-secondary transition-colors"
          aria-label="Notifications"
          title="Notifications"
        >
          <Bell className="h-4 w-4" />
          {/* Unread dot (uncomment when wired up) */}
          {/* <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent" /> */}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center h-9 w-9 rounded-lg hover:bg-bg-hover text-text-secondary transition-colors"
          aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setUserOpen(!userOpen)}
            className="flex items-center gap-2 rounded-lg pl-1 pr-2 py-1 hover:bg-bg-hover transition-colors"
            aria-label="User menu"
          >
            {user.avatar ? (
              <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center">
                <span className="text-sm font-medium text-accent">
                  {user.first_name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
            )}
          </button>

          {userOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-64 rounded-xl border border-border bg-bg-elevated shadow-xl z-50 overflow-hidden">
                {/* Header: name + email */}
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-semibold text-foreground truncate">{fullName}</p>
                  <p className="text-xs text-text-muted truncate">{user.email}</p>
                </div>

                {/* Menu items */}
                <div className="p-1">
                  <button
                    onClick={() => { setUserOpen(false); router.push("/profile"); }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
                  >
                    <Activity className="h-4 w-4" />
                    User Activity
                  </button>
                  <button
                    onClick={() => { setUserOpen(false); router.push("/profile"); }}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    onClick={() => { setUserOpen(false); router.push("/system/billing"); }}
                    className="flex w-full items-center justify-between gap-2.5 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <CreditCard className="h-4 w-4" />
                      Billing
                    </span>
                  </button>
                </div>

                {/* Sign out */}
                <div className="p-1 border-t border-border">
                  <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    Log out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
