import type { Metadata } from "next";
import localFont from "next/font/local";
import { brand } from "@repo/shared/brand";

// Fonts are self-hosted (app/fonts, variable latin subsets, SIL OFL 1.1 —
// licences alongside) instead of next/font/google. The Google loader
// downloads from fonts.gstatic.com at compile time, and under Turbopack a
// slow or timed-out download is a hard "module not found" build error that
// takes every page down; local files can't fail that way, and builds/CI no
// longer need the network. Same families, same weights, same CSS variables.
const inter = localFont({
  src: "./fonts/inter-latin-wght-normal.woff2",
  variable: "--font-sans",
  weight: "100 900",
  display: "swap",
});
const jetbrainsMono = localFont({
  src: "./fonts/jetbrains-mono-latin-wght-normal.woff2",
  variable: "--font-mono",
  weight: "100 800",
  display: "swap",
});
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: `${brand.name} — Custom software, built for how your business runs`,
  description:
    "Megagig Software Solution builds production software for African SMEs — web, mobile, desktop, and POS — engineered for how your business actually runs.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}