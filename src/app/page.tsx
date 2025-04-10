"use client";

import DatasetSelector from "@/components/dataset-selector";
import FallbackMap from "@/components/fallback-map";
import { HotspotAnalyzer } from "@/components/hotspot-analyzer";
import { HotspotRecommendations } from "@/components/hotspot-recommendations";
import InsightsPanel from "@/components/insights-panel";
import MapContainer from "@/components/map-container";
import { Button } from "@/components/ui/button";
import { Loader2, Map } from "lucide-react";
import { Suspense, useState } from "react";

export default function Home() {
  const [useMapbox, setUseMapbox] = useState(true);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b bg-white p-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Urban Hotspot Analyzer</h1>
            <p className="text-muted-foreground">
              Visualize and analyze urban data patterns
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseMapbox(!useMapbox)}
            className="flex items-center gap-1"
          >
            <Map className="h-4 w-4" />
            <span>{useMapbox ? "Use Canvas Map" : "Use Mapbox"}</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 flex-col md:flex-row">
        <div className="w-full md:w-3/4 h-[50vh] md:h-auto relative">
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                <span className="ml-2 text-gray-500">Loading map...</span>
              </div>
            }
          >
            {useMapbox ? <MapContainer /> : <FallbackMap />}
          </Suspense>
        </div>

        <div className="w-full md:w-1/4 border-l">
          <div className="p-4">
            <DatasetSelector />
          </div>

          <div className="border-t p-4">
            <h2 className="text-lg font-semibold mb-4">AI Insights</h2>
            <Suspense
              fallback={
                <p className="text-sm text-muted-foreground">
                  Analyzing data...
                </p>
              }
            >
              <HotspotAnalyzer />
            </Suspense>
          </div>

          <div className="border-t p-4">
            <HotspotRecommendations />
          </div>

          <div className="border-t p-4">
            <InsightsPanel />
          </div>
        </div>
      </div>
    </main>
  );
}
