import { Providers } from "@/components/Providers";
import { DatasetProvider } from "@/hooks/use-datasets";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import type React from "react";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Pfandfinder",
  description: "Analyze pfand data patterns and hotspots",
};

// Add a CSS animation for the hotspot markers to make them more prominent
const pulseAnimation = `
@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.15);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.hotspot-marker {
  animation: pulse 2s infinite ease-in-out;
}

.priority-1 {
  animation-duration: 1.5s;
  z-index: 10;
}

.priority-2 {
  animation-duration: 2s;
  z-index: 9;
}

.priority-3 {
  animation-duration: 2.5s;
  z-index: 8;
}

.hotspot-popup .mapboxgl-popup-content {
  border-left: 4px solid #ef4444;
  padding: 0;
  border-radius: 4px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <style>{pulseAnimation}</style>
      </head>
      <body className={inter.className}>
        <Providers>
          <DatasetProvider>{children}</DatasetProvider>
        </Providers>
      </body>
    </html>
  );
}
