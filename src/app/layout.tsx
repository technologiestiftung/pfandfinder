import { Providers } from "@/components/Providers";
import { DatasetProvider } from "@/hooks/use-datasets";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Urban Hotspot Analyzer",
  description: "Analyze urban data patterns and hotspots",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <DatasetProvider>{children}</DatasetProvider>
        </Providers>
      </body>
    </html>
  );
}
