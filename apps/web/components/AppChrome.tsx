"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

// Pathname prefixes that opt out of Navbar + Footer.
// - /forms/<token> is the public form-share page. It needs to look
//   like a stand-alone form, not part of the marketing site.
const CHROMELESS_PREFIXES = [
  "/forms/",
];

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? "";
  const chromeless = CHROMELESS_PREFIXES.some((p) =>
    pathname === p || pathname.startsWith(p)
  );

  if (chromeless) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen">{children}</main>
      <Footer />
    </>
  );
}
