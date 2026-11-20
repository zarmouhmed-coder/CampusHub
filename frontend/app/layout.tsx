import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CampusHub", template: "%s · CampusHub" },
  description: "Devoirs, examens et matières : toute ta vie étudiante au même endroit.",
};

export const viewport: Viewport = {
  themeColor: "#fafafb",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
