"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDatasets } from "@/hooks/use-datasets";
import { AlertTriangle, Layers, Locate } from "lucide-react";
import Script from "next/script";
import { useEffect, useRef, useState } from "react";

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

export default function MapContainer() {
  const mapRef = useRef<HTMLDivElement>(null);
  const { activeDatasets } = useDatasets();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [mapStyle, setMapStyle] = useState<string>("streets-v11");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataState, setDataState] = useState<Record<string, any>>({
    trashcans: [],
    events: [],
    people: [],
  });

  // Load data from public/data directory
  useEffect(() => {
    async function loadData() {
      try {
        // Fetch trashcans data
        const trashcansResponse = await fetch("/data/trashcans.json");
        const trashcansData = await trashcansResponse.json();

        // Fetch events data
        const eventsResponse = await fetch("/data/events.csv");
        const eventsText = await eventsResponse.text();
        const eventsData = parseCSV(eventsText);

        // Fetch people data
        const peopleResponse = await fetch("/data/people.json");
        const peopleData = await peopleResponse.json();

        setDataState({
          trashcans: trashcansData.data || [],
          events: eventsData || [],
          people: peopleData.data || [],
        });
        setDataLoaded(true);
      } catch (error) {
        console.error("Error loading data files:", error);
        // Fall back to mock data
        setDataState(MOCK_DATA);
        setDataLoaded(true);
      }
    }

    loadData();
  }, []);

  // Simple CSV parser function
  const parseCSV = (csvText: string) => {
    const lines = csvText.split("\n");
    const headers = lines[0].split(",").map((header) => header.trim());

    return lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line) => {
        const values = line.split(",").map((value) => value.trim());
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index];
          return obj;
        }, {} as Record<string, string>);
      });
  };

  // Initialize map after Mapbox script is loaded
  useEffect(() => {
    if (!mapboxLoaded || !mapRef.current || mapLoaded || !dataLoaded) return;

    try {
      const mapboxgl = window.mapboxgl;
      if (!mapboxgl) {
        setMapError("Mapbox library not loaded");
        return;
      }

      // Check if token is available
      const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
      if (!token) {
        setMapError("Mapbox token not found");
        return;
      }

      mapboxgl.accessToken = token;

      // Initialize map
      const map = new mapboxgl.Map({
        container: mapRef.current,
        style: `mapbox://styles/mapbox/${mapStyle}`,
        center: [13.405, 52.52], // Berlin coordinates
        zoom: 13,
      });

      map.on("load", () => {
        console.log("Mapbox map loaded successfully");
        setMapLoaded(true);

        // Add navigation controls
        map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

        // Add data sources and layers
        addDataSources(map, mapboxgl);
      });

      map.on("error", (e) => {
        console.error("Mapbox error:", e);
        setMapError(`Map error: ${e.error?.message || "Unknown error"}`);
      });

      return () => {
        map.remove();
      };
    } catch (err) {
      console.error("Error initializing map:", err);
      setMapError(
        `Failed to initialize map: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }, [mapboxLoaded, mapStyle, dataLoaded]);

  // Add data sources and layers to map
  const addDataSources = (map, mapboxgl) => {
    try {
      // Add trashcans
      map.addSource("trashcans", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: dataState.trashcans.map((item) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [parseFloat(item.lng), parseFloat(item.lat)],
            },
            properties: {
              id: item.id,
              fillLevel: item.fillLevel,
              lastEmptied: item.lastEmptied,
            },
          })),
        },
      });

      map.addLayer({
        id: "trashcans-layer",
        type: "circle",
        source: "trashcans",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "fillLevel"],
            0,
            5,
            100,
            15,
          ],
          "circle-color": [
            "interpolate",
            ["linear"],
            ["get", "fillLevel"],
            0,
            "#22c55e",
            50,
            "#f59e0b",
            75,
            "#ef4444",
          ],
          "circle-opacity": 0.8,
        },
        layout: {
          visibility: activeDatasets.includes("trashcans") ? "visible" : "none",
        },
      });

      // Add events
      map.addSource("events", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: dataState.events.map((item) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [parseFloat(item.lng), parseFloat(item.lat)],
            },
            properties: {
              id: item.id,
              name: item.name,
              attendees: item.attendees,
              date: item.date,
              duration: item.duration,
            },
          })),
        },
      });

      map.addLayer({
        id: "events-layer",
        type: "circle",
        source: "events",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "attendees"],
            0,
            8,
            1000,
            20,
          ],
          "circle-color": "#3b82f6",
          "circle-opacity": 0.7,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#2563eb",
        },
        layout: {
          visibility: activeDatasets.includes("events") ? "visible" : "none",
        },
      });

      // Add people density heatmap
      map.addSource("people", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: dataState.people.map((item) => ({
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [parseFloat(item.lng), parseFloat(item.lat)],
            },
            properties: {
              id: item.id,
              density: item.density,
              timestamp: item.timestamp,
            },
          })),
        },
      });

      map.addLayer({
        id: "people-layer",
        type: "heatmap",
        source: "people",
        paint: {
          "heatmap-weight": [
            "interpolate",
            ["linear"],
            ["get", "density"],
            0,
            0,
            100,
            1,
          ],
          "heatmap-intensity": 1,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(236,222,239,0)",
            0.2,
            "rgb(208,209,230)",
            0.4,
            "rgb(166,189,219)",
            0.6,
            "rgb(103,169,207)",
            0.8,
            "rgb(28,144,153)",
            1,
            "rgb(1,108,89)",
          ],
          "heatmap-radius": 30,
          "heatmap-opacity": 0.8,
        },
        layout: {
          visibility: activeDatasets.includes("people") ? "visible" : "none",
        },
      });

      // Add click handlers for popups
      map.on("click", "trashcans-layer", (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties;

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `
            <div class="p-2">
              <h3 class="font-bold">Trash Can #${props.id}</h3>
              <p>Fill Level: ${props.fillLevel}%</p>
              <p>Last Emptied: ${new Date(
                props.lastEmptied
              ).toLocaleString()}</p>
            </div>
          `
          )
          .addTo(map);
      });

      map.on("click", "events-layer", (e) => {
        if (!e.features || e.features.length === 0) return;

        const feature = e.features[0];
        const props = feature.properties;

        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(
            `
            <div class="p-2">
              <h3 class="font-bold">${props.name}</h3>
              <p>Attendees: ${props.attendees}</p>
              <p>Date: ${props.date}</p>
              <p>Duration: ${props.duration} hours</p>
            </div>
          `
          )
          .addTo(map);
      });

      // Change cursor on hover
      map.on("mouseenter", "trashcans-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "trashcans-layer", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mouseenter", "events-layer", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "events-layer", () => {
        map.getCanvas().style.cursor = "";
      });
    } catch (err) {
      console.error("Error adding data sources:", err);
      setMapError(
        `Failed to add data to map: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };

  const getUserLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          setUserLocation(userCoords);
          if (map) {
            map.flyTo({ center: userCoords, zoom: 13 });
          }
        },
        (error) => {
          console.error("Error getting user location:", error);
        }
      );
    }
  };

  // Render error state
  if (mapError) {
    return (
      <div className="relative h-full w-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Map Error</h3>
            <p className="text-sm text-muted-foreground mb-4">{mapError}</p>
            <p className="text-xs text-muted-foreground">
              Please check your Mapbox token and internet connection.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      {/* Load Mapbox GL JS from CDN */}
      <Script
        src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"
        onLoad={() => {
          console.log("Mapbox script loaded");
          setMapboxLoaded(true);
        }}
        onError={(e) => {
          console.error("Error loading Mapbox script:", e);
          setMapError("Failed to load Mapbox library");
        }}
      />
      <link
        href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css"
        rel="stylesheet"
      />

      <div className="relative h-full w-full">
        <div
          ref={mapRef}
          className="absolute inset-0 bg-gray-100 w-full h-full"
        >
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
                <p className="mt-2 text-sm text-gray-500">Loading map...</p>
              </div>
            </div>
          )}
        </div>

        <div className="absolute top-4 right-4 flex flex-col gap-2">
          <Button
            variant="secondary"
            size="icon"
            onClick={getUserLocation}
            className="bg-white shadow-md hover:bg-gray-100"
            disabled={!mapLoaded}
          >
            <Locate className="h-5 w-5" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="bg-white shadow-md hover:bg-gray-100"
                disabled={!mapLoaded}
              >
                <Layers className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setMapStyle("streets-v11")}>
                Streets
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMapStyle("satellite-v9")}>
                Satellite
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMapStyle("light-v10")}>
                Light
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setMapStyle("dark-v10")}>
                Dark
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="absolute bottom-4 left-4 bg-white p-2 rounded shadow-md text-xs">
          <p>Showing {activeDatasets.length} active datasets</p>
          {userLocation && (
            <p className="mt-1">
              Your location: {userLocation[1].toFixed(4)},{" "}
              {userLocation[0].toFixed(4)}
            </p>
          )}
        </div>

        {mapLoaded && (
          <div className="absolute bottom-4 right-4 bg-white p-2 rounded shadow-md text-xs">
            <div className="flex flex-col gap-1">
              {activeDatasets.includes("trashcans") && (
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-1"></div>
                  <span>Trash Cans</span>
                </div>
              )}
              {activeDatasets.includes("events") && (
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                  <span>Events</span>
                </div>
              )}
              {activeDatasets.includes("parks") && (
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                  <span>Parks</span>
                </div>
              )}
              {activeDatasets.includes("people") && (
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-teal-500 mr-1"></div>
                  <span>People Density</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// Add this to global.d.ts or a similar type definition file
declare global {
  interface Window {
    mapboxgl: any;
  }
}
