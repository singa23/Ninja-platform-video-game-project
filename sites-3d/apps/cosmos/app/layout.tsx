import type { Metadata, Viewport } from "next";
import "@fontsource-variable/syne/wght.css";
import "@fontsource-variable/manrope/wght.css";
import "@fontsource-variable/red-hat-mono/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Almanach Orbital",
  description: "Explorateur 3D du système solaire : positions réelles à la date simulée, fiches NASA, échelle réelle ou lisible, comparateur de taille avec la Terre.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#04060b" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
