"use client";

import { useDatasets } from "@/hooks/use-datasets";
import { useEffect, useRef } from "react";

// Mock data for visualization
const MOCK_DATA = {
  trashcans: [
    { id: 1, lat: 40.7128, lng: -74.006, fillLevel: 85 },
    { id: 2, lat: 40.7138, lng: -74.013, fillLevel: 45 },
    { id: 3, lat: 40.7148, lng: -74.009, fillLevel: 90 },
    { id: 4, lat: 40.7118, lng: -74.003, fillLevel: 30 },
    { id: 5, lat: 40.7158, lng: -74.016, fillLevel: 75 },
  ],
  events: [
    {
      id: 1,
      lat: 40.7135,
      lng: -74.008,
      name: "Street Festival",
      attendees: 500,
    },
    {
      id: 2,
      lat: 40.7145,
      lng: -74.015,
      name: "Farmers Market",
      attendees: 300,
    },
    { id: 3, lat: 40.7115, lng: -74.005, name: "Concert", attendees: 1000 },
  ],
  parks: [
    { id: 1, lat: 40.7125, lng: -74.011, name: "Central Park", visitors: 800 },
    {
      id: 2,
      lat: 40.7155,
      lng: -74.007,
      name: "Riverside Park",
      visitors: 400,
    },
  ],
  people: [
    { id: 1, lat: 40.713, lng: -74.01, density: 90 },
    { id: 2, lat: 40.714, lng: -74.012, density: 75 },
    { id: 3, lat: 40.712, lng: -74.004, density: 85 },
    { id: 4, lat: 40.715, lng: -74.014, density: 60 },
    { id: 5, lat: 40.711, lng: -74.002, density: 40 },
  ],
};

export default function FallbackMap() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { activeDatasets } = useDatasets();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    const resizeCanvas = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Clear canvas
    ctx.fillStyle = "#f3f4f6";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw grid
    ctx.strokeStyle = "#e5e7eb";
    ctx.lineWidth = 1;

    const gridSize = 50;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw data points
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const scale = Math.min(canvas.width, canvas.height) / 300;

    // Helper function to convert lat/lng to canvas coordinates
    const toCanvasCoords = (lat: number, lng: number) => {
      // Simple conversion for demo purposes
      // In a real app, you'd use proper geo projection
      const x = centerX + (lng - -74.006) * 5000 * scale;
      const y = centerY - (lat - 40.7128) * 5000 * scale;
      return { x, y };
    };

    // Draw trashcans
    if (activeDatasets.includes("trashcans")) {
      MOCK_DATA.trashcans.forEach((item) => {
        const { x, y } = toCanvasCoords(item.lat, item.lng);
        const radius = 5 + (item.fillLevel / 100) * 10;

        // Fill color based on level
        let color;
        if (item.fillLevel > 75) color = "#ef4444"; // red
        else if (item.fillLevel > 50) color = "#f59e0b"; // amber
        else color = "#22c55e"; // green

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // Draw events
    if (activeDatasets.includes("events")) {
      MOCK_DATA.events.forEach((item) => {
        const { x, y } = toCanvasCoords(item.lat, item.lng);
        const radius = 8 + (item.attendees / 1000) * 12;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "#3b82f6"; // blue
        ctx.fill();
        ctx.strokeStyle = "#2563eb";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add label
        ctx.fillStyle = "#1e40af";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(item.name, x, y + radius + 12);
      });
    }

    // Draw parks
    if (activeDatasets.includes("parks")) {
      MOCK_DATA.parks.forEach((item) => {
        const { x, y } = toCanvasCoords(item.lat, item.lng);
        const radius = 10 + (item.visitors / 1000) * 15;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34, 197, 94, 0.6)"; // green with transparency
        ctx.fill();
        ctx.strokeStyle = "#16a34a";
        ctx.lineWidth = 2;
        ctx.stroke();

        // Add label
        ctx.fillStyle = "#166534";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        ctx.fillText(item.name, x, y + radius + 12);
      });
    }

    // Draw people density
    if (activeDatasets.includes("people")) {
      // Simple heatmap effect
      MOCK_DATA.people.forEach((item) => {
        const { x, y } = toCanvasCoords(item.lat, item.lng);
        const radius = 20 + (item.density / 100) * 30;

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, "rgba(1, 108, 89, 0.8)");
        gradient.addColorStop(0.5, "rgba(28, 144, 153, 0.4)");
        gradient.addColorStop(1, "rgba(236, 222, 239, 0)");

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
    }

    // Draw legend
    const legendY = canvas.height - 80;
    const legendX = 20;
    ctx.font = "12px Arial";

    if (activeDatasets.includes("trashcans")) {
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(legendX + 5, legendY, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.fillText("Trash Cans", legendX + 15, legendY + 4);
    }

    if (activeDatasets.includes("events")) {
      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(legendX + 5, legendY + 20, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.fillText("Events", legendX + 15, legendY + 24);
    }

    if (activeDatasets.includes("parks")) {
      ctx.fillStyle = "#22c55e";
      ctx.beginPath();
      ctx.arc(legendX + 5, legendY + 40, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.fillText("Parks", legendX + 15, legendY + 44);
    }

    if (activeDatasets.includes("people")) {
      ctx.fillStyle = "#0d9488";
      ctx.beginPath();
      ctx.arc(legendX + 5, legendY + 60, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000000";
      ctx.fillText("People Density", legendX + 15, legendY + 64);
    }

    return () => {
      window.removeEventListener("resize", resizeCanvas);
    };
  }, [activeDatasets]);

  return (
    <div className="relative h-full w-full">
      <canvas ref={canvasRef} className="absolute inset-0" />
      <div className="absolute top-4 left-4 bg-white p-2 rounded shadow-md">
        <h3 className="text-sm font-medium">Canvas Map (Fallback)</h3>
        <p className="text-xs text-muted-foreground">
          Showing {activeDatasets.length} active datasets
        </p>
      </div>
    </div>
  );
}
