"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { resources } from "@/resources";
import { getIcon, ChevronDown, LayoutDashboard } from "@/lib/icons";
import type { User } from "@repo/shared/types";

// Theme toggle and user menu have moved to the topbar (Navbar component).
// The sidebar now contains only navigation.

interface SidebarProps {
  user: User;
  collapsed: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ user, collapsed, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const isAdmin = user.role === "ADMIN" || user.role === "EDITOR";

  const navItems = isAdmin
    ? [
        { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
        ...resources.map((r) => ({
          label: r.label?.plural ?? r.name,
          href: `/resources/${r.slug}`,
          icon: r.icon,
        })),
        { label: "Data & Backup", href: "/system/backups", icon: "Database" },
      ]
    : [];

  // Profile link is always visible
  const profileItem = { label: "Profile", href: "/profile", icon: "UserCircle" };

  const systemItems = isAdmin
    ? [
        { label: "Jobs", href: "/system/jobs", icon: "Briefcase" },
        { label: "Files", href: "/system/files", icon: "FolderOpen" },
        { label: "Cron", href: "/system/cron", icon: "Calendar" },
        { label: "Mail", href: "/system/mail", icon: "Mail" },
        { label: "Security", href: "/system/security", icon: "Shield" },
        { label: "Observability", href: "/system/observability", icon: "Activity" },
      ]
    : [];

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={`flex h-16 items-center border-b border-border px-4 ${collapsed ? "justify-center" : "gap-2 px-6"}`}>
        <span className="text-xl font-bold text-accent">G</span>
        {!collapsed && (
          <>
            <span className="text-xl font-bold text-accent">rit</span>
            <span className="ml-1 rounded-md bg-accent/10 px-2 py-0.5 text-xs font-medium text-accent">
              Admin
            </span>
          </>
        )}
      </div>

      {/* Scrollable content: nav + bottom controls flow together */}
      <div className="flex-1 overflow-y-auto">
        {/* Navigation */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = getIcon(item.icon);
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onMobileClose}
                title={collapsed ? item.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {/* Profile link */}
          {(() => {
            const ProfileIcon = getIcon(profileItem.icon);
            const isProfileActive = pathname === profileItem.href;
            return (
              <Link
                href={profileItem.href}
                onClick={onMobileClose}
                title={collapsed ? profileItem.label : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  isProfileActive
                    ? "bg-accent/10 text-accent"
                    : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <ProfileIcon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{profileItem.label}</span>}
              </Link>
            );
          })()}

          {/* System section */}
          {isAdmin && (
            <>
              {!collapsed && (
                <p className="px-3 mt-6 mb-2 text-xs font-semibold text-text-muted uppercase tracking-wider">
                  System
                </p>
              )}
              {collapsed && <div className="my-3 mx-3 border-t border-border" />}
              {systemItems.map((item) => {
                const Icon = getIcon(item.icon);
                const isActive = pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onMobileClose}
                    title={collapsed ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent/10 text-accent"
                        : "text-text-secondary hover:bg-bg-hover hover:text-foreground"
                    } ${collapsed ? "justify-center" : ""}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden lg:flex flex-col bg-bg-secondary border-r border-border transition-all duration-300 ${
          collapsed ? "w-16" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-bg-secondary border-r border-border lg:hidden transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
