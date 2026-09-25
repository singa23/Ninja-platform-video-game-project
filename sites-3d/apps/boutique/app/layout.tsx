import type { Metadata, Viewport } from "next";
import "@fontsource-variable/syne/wght.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Studio Oblique",
  description: "Objets design et tech à configurer en 3D temps réel : montre GPS, casque, enceinte, lampe, chaise, céramiques.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#E3E5E1" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
