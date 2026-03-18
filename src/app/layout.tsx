import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Spatial Adventure Visualizer | 3D GPS Dashboard",
  description:
    "Immersive 3D web dashboard for visualizing GPS training data from GPX files. Explore your routes in stunning 3D terrain with elevation profiles and detailed statistics.",
  keywords: [
    "GPS",
    "GPX",
    "3D Map",
    "Elevation",
    "Training",
    "Visualization",
    "MapLibre",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
