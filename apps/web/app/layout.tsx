import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { brand } from "@repo/shared/brand";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"] });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });
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