import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-display", weight: ["400", "500", "600", "700"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });
import "./globals.css";
import { Providers } from "@/components/shared/providers";

export const metadata: Metadata = {
  title: "megagig-software-solution Admin",
  description: "Admin panel — Built with Grit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // v3.28.1: data-theme drives the CSS variable cascade in globals.css.
  // Reading process.env at render time means changing THEME in .env +
  // restarting the dev server re-paints the dashboard without code edits.
  // Defaults to "atlas" so a missing env doesn't blank the surface.
  const dataTheme = process.env.NEXT_PUBLIC_THEME || "atlas";

  return (
    // suppressHydrationWarning: DarkModeToggle mutates html.classList +
    // data-theme-mode + style after hydration. Without this React would
    // log a noisy mismatch on the first paint even though the behaviour
    // is intentional.
    <html lang="en" data-theme={dataTheme} suppressHydrationWarning>
      <body className={`${inter.variable} ${jetbrainsMono.variable} min-h-screen font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
