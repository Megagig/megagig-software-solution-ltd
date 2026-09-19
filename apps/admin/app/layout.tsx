import type { Metadata } from "next";
import localFont from "next/font/local";

// Fonts are self-hosted (app/fonts, variable latin subsets, SIL OFL 1.1 —
// licences alongside) instead of next/font/google. The Google loader
// downloads from fonts.gstatic.com at compile time, and under Turbopack a
// slow or timed-out download is a hard "module not found" build error that
// 500s every admin page; local files can't fail that way, and builds/CI no
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
import "./globals.css";
import { Providers } from "@/components/shared/providers";

export const metadata: Metadata = {
  title: "Megagig Software Solution — Admin",
  description: "Admin dashboard for Megagig Software Solution Ltd.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // suppressHydrationWarning: DarkModeToggle mutates html.classList +
    // style after hydration. Without this React would log a noisy mismatch
    // on the first paint even though the behaviour is intentional.
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
