import "@fontsource-variable/fraunces";
import "@fontsource-variable/inter";

import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";
import { THEME_BOOTSTRAP } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CampusHub", template: "%s · CampusHub" },
  description: "Devoirs, examens et matières : toute ta vie étudiante au même endroit.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#eef1f6" },
    { media: "(prefers-color-scheme: dark)", color: "#0e1628" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Applies the saved light/dark theme before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
