"use client";

import type React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDatasets } from "@/hooks/use-datasets";
import { AlertTriangle, MapPin, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";

type Hotspot = {
  id: string;
  name: string;
  location: string;
  score: number;
  reason: string;
  type: "trash" | "people" | "mixed";
};

export function HotspotRecommendations() {
  const { activeDatasets } = useDatasets();
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  useEffect(() => {
    // In a real app, this would be calculated based on actual data analysis
    // For demo purposes, we're using mock data

    const mockHotspots: Hotspot[] = [];

    // Filter hotspots based on active datasets
    let filteredHotspots = [...mockHotspots];

    if (!activeDatasets.includes("trashcans")) {
      filteredHotspots = filteredHotspots.filter((h) => h.type !== "trash");
    }

    if (
      !activeDatasets.includes("people") &&
      !activeDatasets.includes("events")
    ) {
      filteredHotspots = filteredHotspots.filter((h) => h.type !== "people");
    }

    // If both trash and people datasets are inactive, show no hotspots
    if (
      !activeDatasets.includes("trashcans") &&
      !activeDatasets.includes("people") &&
      !activeDatasets.includes("events")
    ) {
      filteredHotspots = [];
    }

    setHotspots(filteredHotspots);
  }, [activeDatasets]);

  if (hotspots.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <p className="text-sm text-muted-foreground">
            Select datasets to view hotspot recommendations
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">Top Hotspots</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {hotspots.map((hotspot) => (
            <div key={hotspot.id} className="border rounded-md p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium flex items-center">
                    <MapPin className="h-4 w-4 mr-1 text-red-500" />
                    {hotspot.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {hotspot.location}
                  </p>
                </div>
                <Badge
                  variant={hotspot.score > 85 ? "destructive" : "outline"}
                  className="ml-2"
                >
                  {hotspot.score}%
                </Badge>
              </div>
              <div className="mt-2 flex items-start">
                {hotspot.type === "trash" ? (
                  <AlertTriangle className="h-4 w-4 mr-1 text-amber-500 mt-0.5" />
                ) : hotspot.type === "people" ? (
                  <Users className="h-4 w-4 mr-1 text-blue-500 mt-0.5" />
                ) : (
                  <TrendingUp className="h-4 w-4 mr-1 text-purple-500 mt-0.5" />
                )}
                <p className="text-xs">{hotspot.reason}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Users(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
