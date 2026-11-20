import "@fontsource-variable/plus-jakarta-sans";
import type { Metadata, Viewport } from "next";

import { Providers } from "@/components/providers";

import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CampusHub", template: "%s · CampusHub" },
  description: "Devoirs, examens et matières : toute ta vie étudiante au même endroit.",
};

export const viewport: Viewport = {
  themeColor: "#f3f4f7",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
