import type { Metadata, Viewport } from "next";
import "@fontsource/dela-gothic-one/latin-400.css";
import "@fontsource/shippori-mincho/latin-500.css";
import "@fontsource-variable/instrument-sans/wght.css";
import "@fontsource-variable/jetbrains-mono/wght.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ninjakoï, le jeu",
  description: "Le site officiel de Ninjakoï : la bambouseraie en 3D, le bestiaire de l'empereur et le dojo des shurikens jouable dans la page.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0A0E1A" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
