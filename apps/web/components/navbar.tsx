"use client";

import { useEffect, useLayoutEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { brand } from "@repo/shared/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

// useLayoutEffect throws a warning during actual server rendering (no DOM
// to measure); useEffect is the correct fallback there. In the browser,
// useLayoutEffect runs before paint, so correcting `scrolled` here (rather
// than in a regular effect) avoids a one-frame flash of the wrong navbar
// background when Home is reloaded already scrolled down.
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const navLinks = [
  { href: "/services", label: "Services" },
  { href: "/products", label: "Products" },
  { href: "/case-studies", label: "Case Studies" },
  { href: "/pricing", label: "Pricing" },
  { href: "/contact-us", label: "Contact" },
];

// Per ui-rules.md §3: sticky, backdrop-blur + semi-transparent once
// scrolled, but transparent at the very top of Home only (blends with the
// hero). Every other page is always in the "scrolled" visual state.
export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useIsomorphicLayoutEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !isHome;

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 border-b transition-colors duration-standard ease-standard",
        solid
          ? "border-border/50 bg-surface/85 backdrop-blur-lg"
          : "border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-(--space-container-max) items-center justify-between px-(--space-container-x)">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/15 border border-brand/20">
            <span className="text-brand font-mono font-bold text-sm">
              {brand.logo.text}
            </span>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            {brand.name}
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "text-sm transition-colors",
                pathname === link.href
                  ? "font-medium text-brand"
                  : "text-foreground-muted hover:text-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <ThemeToggle />
          <Link href="/start-project">
            <Button size="sm">Start a project</Button>
          </Link>
        </div>

        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="md:hidden p-2 text-foreground-muted hover:text-foreground transition-colors"
          aria-label="Toggle menu"
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border/50 bg-surface/95 backdrop-blur-lg">
          <div className="mx-auto max-w-(--space-container-max) px-(--space-container-x) py-4 flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "text-sm py-2 transition-colors",
                  pathname === link.href
                    ? "font-medium text-brand"
                    : "text-foreground-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 pt-2">
              <ThemeToggle />
              <Link href="/start-project" className="flex-1" onClick={() => setMobileOpen(false)}>
                <Button size="sm" className="w-full">
                  Start a project
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
