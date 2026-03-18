import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Quncho | 3D GPS Visualizer",
  description:
    "Immersive 3D web dashboard for visualizing GPS tracks with altitude profiling and training stats. Proudly built for peak spatial adventure.",
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
