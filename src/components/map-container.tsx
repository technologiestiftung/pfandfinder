"use client";

import { Hotspot } from "@/components/hotspot-analyzer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDatasets } from "@/hooks/use-datasets";
import { AlertTriangle, Layers } from "lucide-react";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react"; // Import useCallback

// Mock data for visualization (keep as fallback)
const MOCK_DATA = {
  // ... (keep mock data as is)
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
      date: "2023-10-28",
      duration: 6,
    },
    {
      id: 2,
      lat: 40.7145,
      lng: -74.015,
      name: "Farmers Market",
      attendees: 300,
      date: "2023-10-29",
      duration: 4,
    },
    {
      id: 3,
      lat: 40.7115,
      lng: -74.005,
      name: "Concert",
      attendees: 1000,
      date: "2023-10-27",
      duration: 3,
    },
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
    {
      id: 1,
      lat: 40.713,
      lng: -74.01,
      density: 90,
      timestamp: "2023-10-28T10:00:00Z",
    },
    {
      id: 2,
      lat: 40.714,
      lng: -74.012,
      density: 75,
      timestamp: "2023-10-28T10:05:00Z",
    },
    {
      id: 3,
      lat: 40.712,
      lng: -74.004,
      density: 85,
      timestamp: "2023-10-28T10:10:00Z",
    },
    {
      id: 4,
      lat: 40.715,
      lng: -74.014,
      density: 60,
      timestamp: "2023-10-28T10:15:00Z",
    },
    {
      id: 5,
      lat: 40.711,
      lng: -74.002,
      density: 40,
      timestamp: "2023-10-28T10:20:00Z",
    },
  ],
};

// Add this outside the component or in a dedicated utils file
// Helper function to calculate distance between coordinates in kilometers
const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c; // Distance in km
  return distance;
};

// Helper function to convert degrees to radians
const deg2rad = (deg: number): number => {
  return deg * (Math.PI / 180);
};

// Simple CSV parser function - Move outside component
const parseCSV = (csvText: string): Record<string, string>[] => {
  const lines = csvText.split("\n");
  if (lines.length < 1) return [];
  const headers = lines[0]
    .split(",")
    .map((header) => header.trim().replace(/^"|"$/g, "")); // Handle quoted headers

  return lines
    .slice(1)
    .filter((line) => line.trim())
    .map((line) => {
      // Basic CSV value parsing (handles simple quoted values)
      const values = [];
      let currentVal = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(currentVal.trim().replace(/^"|"$/g, ""));
          currentVal = "";
        } else {
          currentVal += char;
        }
      }
      values.push(currentVal.trim().replace(/^"|"$/g, "")); // Add last value

      return headers.reduce((obj, header, index) => {
        obj[header] = values[index] !== undefined ? values[index] : ""; // Assign empty string if value is missing
        return obj;
      }, {} as Record<string, string>);
    });
};

export default function MapContainer() {
  const mapRef = useRef<HTMLDivElement>(null);
  const { activeDatasets, availableDatasets, toggleDataset } = useDatasets(); // Assuming toggleDataset exists
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [mapStyle, setMapStyle] = useState<string>("streets-v11");
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [mapboxLoaded, setMapboxLoaded] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataState, setDataState] = useState<Record<string, any[]>>({}); // Ensure dataState value is array
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const existingMarkersRef = useRef<any[]>([]); // Ref to keep track of marker instances

  // Dynamic file types mapping
  const fileTypeHandlers = {
    ".json": async (response: Response) => {
      const data = await response.json();
      return data.data || data;
    },
    ".geojson": async (response: Response) => {
      const geoJson = await response.json();
      
      // Convert GeoJSON features to our standard format for map display
      if (geoJson.type === "FeatureCollection" && geoJson.features) {
        return geoJson.features.map((feature: any, index: number) => {
          // Extract coordinates from geometry
          const coordinates = feature.geometry?.coordinates || [0, 0];
          const lng = coordinates[0];
          const lat = coordinates[1];
          
          // For point geometry, return a simple point object with properties
          return {
            id: feature.id || index + 1,
            lat: lat,
            lng: lng,
            ...feature.properties
          };
        });
      }
      
      // If not a FeatureCollection, return the raw JSON
      return geoJson;
    },
    ".csv": async (response: Response) => {
      const text = await response.text();
      return parseCSV(text);
    },
  };

  // Helper to determine file extension based on dataset ID
  const getFileExtension = (datasetId: string): string => {
    // Look for known GeoJSON datasets based on your files
    if (
      datasetId.includes("muelleimer") || 
      datasetId.includes("spaeties") || 
      datasetId.includes("supermaerkte")
    ) {
      return ".geojson";
    } else if (datasetId.includes("events")) {
      return ".csv";
    }
    return ".json";
  };

  // Load data from public/data directory
  useEffect(() => {
    async function loadData() {
      if (availableDatasets.length === 0) {
        console.warn("No available datasets defined, using mock data.");
        setDataState(MOCK_DATA);
        setDataLoaded(true);
        return;
      }

      try {
        const loadedData: Record<string, any[]> = {};
        let dataFound = false;

        const fetchPromises = availableDatasets.map(async (datasetId) => {
          const extension = getFileExtension(datasetId);
          const filePath = `/data/${datasetId}${extension}`;
          try {
            const response = await fetch(filePath);

            if (!response.ok) {
              console.warn(
                `Failed to load dataset: ${datasetId} from ${filePath} (Status: ${response.status})`
              );
              return; // Don't add if fetch failed
            }

            const handler =
              fileTypeHandlers[extension] || fileTypeHandlers[".json"];
            const parsedData = await handler(response);

            if (Array.isArray(parsedData) && parsedData.length > 0) {
              loadedData[datasetId] = parsedData;
              dataFound = true;
              console.log(
                `Successfully loaded ${parsedData.length} items for ${datasetId}`
              );
            } else {
              console.warn(
                `No data or invalid format parsed for dataset: ${datasetId} from ${filePath}`
              );
            }
          } catch (error) {
            console.warn(
              `Error loading or parsing dataset: ${datasetId} from ${filePath}`,
              error
            );
          }
        });

        await Promise.all(fetchPromises);

        if (dataFound) {
          setDataState(loadedData);
        } else {
          console.warn(
            "No data files loaded successfully, falling back to MOCK_DATA."
          );
          setDataState(MOCK_DATA); // Use mock data if no real data loaded
        }

        setDataLoaded(true);
      } catch (error) {
        console.error("Error during data loading process:", error);
        console.warn("Falling back to MOCK_DATA due to loading error.");
        setDataState(MOCK_DATA);
        setDataLoaded(true);
      }
    }

    loadData();
  }, [availableDatasets]); // Rerun only when available datasets change

  // Function to update hotspot markers on the map (using useCallback)
  const updateHotspotMarkers = useCallback(
    (newHotspots: Hotspot[]) => {
      const map = window.mapInstance;
      const mapboxgl = window.mapboxgl;

      // --- Robustness Checks ---
      if (!map || !mapboxgl) {
        console.warn(
          "updateHotspotMarkers called but map or mapboxgl not ready."
        );
        return;
      }
      if (!map.isStyleLoaded()) {
        console.warn("Map style not fully loaded, deferring hotspot update.");
        // Optional: Retry after a short delay
        // setTimeout(() => updateHotspotMarkers(newHotspots), 100);
        return;
      }
      // --- End Checks ---

      console.log(
        `Updating hotspot markers (${newHotspots.length} hotspots)...`
      );

      try {
        // 1. Remove existing custom HTML markers
        existingMarkersRef.current.forEach((marker) => marker.remove());
        existingMarkersRef.current = []; // Clear the ref array

        // 2. Remove existing Mapbox layers and sources related to hotspots
        if (map.getLayer("hotspots-layer")) {
          map.removeLayer("hotspots-layer");
        }
        if (map.getLayer("hotspot-influence-layer")) {
          map.removeLayer("hotspot-influence-layer");
        }
        if (map.getSource("hotspots")) {
          map.removeSource("hotspots");
        }
        if (map.getSource("hotspot-influence")) {
          map.removeSource("hotspot-influence");
        }

        if (newHotspots.length === 0) {
          console.log("No hotspots to display.");
          return; // Exit if no new hotspots
        }

        // 3. Add new hotspot source
        map.addSource("hotspots", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: newHotspots.map((hotspot) => ({
              type: "Feature",
              geometry: {
                type: "Point",
                coordinates: [hotspot.longitude, hotspot.latitude],
              },
              properties: {
                priority: hotspot.priority,
                description: hotspot.description,
                // Add lat/lon to properties for easy access in popup/click
                latitude: hotspot.latitude,
                longitude: hotspot.longitude,
              },
            })),
          },
        });

        // 4. Add influence radius source (initially empty point at [0,0])
        map.addSource("hotspot-influence", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "Point", coordinates: [0, 0] },
            properties: {},
          },
        });

        // 5. Add influence radius layer (invisible initially)
        map.addLayer({
          id: "hotspot-influence-layer",
          type: "circle",
          source: "hotspot-influence",
          paint: {
            "circle-radius": 300, // Radius in meters (approximate at mid-latitudes) - Mapbox uses pixels, needs adjustment or turf.js for accuracy
            "circle-color": "#ef4444", // Red
            "circle-opacity": 0.1,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ef4444",
            "circle-stroke-opacity": 0.3,
          },
          layout: {
            visibility: "none", // Start hidden
          },
        });

        // --- Use Mapbox Layer for Clicks (Alternative/Supplement to HTML Markers) ---
        // This layer makes the hotspots clickable via Mapbox events,
        // potentially simpler than managing individual HTML markers for clicks.
        map.addLayer({
          id: "hotspots-layer", // Use this ID for click events
          type: "circle",
          source: "hotspots",
          paint: {
            "circle-radius": 12, // Base radius
            "circle-color": [
              // Color based on priority
              "match",
              ["get", "priority"],
              1,
              "#ef4444", // High -> Red
              2,
              "#f97316", // Medium -> Orange
              3,
              "#eab308", // Low -> Yellow
              "#a855f7", // Default -> Purple (fallback)
            ],
            "circle-opacity": 0.85,
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        // 6. Add custom HTML markers for visual representation (priority badge)
        newHotspots.forEach((hotspot) => {
          const el = document.createElement("div");
          el.className = `hotspot-marker priority-${hotspot.priority}`;
          el.style.width = "30px";
          el.style.height = "30px";
          el.style.borderRadius = "50%";
          el.style.backgroundColor =
            hotspot.priority === 1
              ? "rgba(239, 68, 68, 0.9)" // Red
              : hotspot.priority === 2
              ? "rgba(249, 115, 22, 0.9)" // Orange
              : "rgba(234, 179, 8, 0.9)"; // Yellow
          el.style.color = "white";
          el.style.fontWeight = "bold";
          el.style.fontSize = "14px";
          el.style.display = "flex";
          el.style.alignItems = "center";
          el.style.justifyContent = "center";
          el.style.border = "2px solid white";
          el.style.boxShadow = "0 1px 4px rgba(0, 0, 0, 0.3)";
          el.style.cursor = "pointer"; // Indicate it's interactive
          el.innerHTML = `<span>${hotspot.priority}</span>`;

          // Create popup (will be attached to the Mapbox layer click event)
          const popup = new mapboxgl.Popup({
            offset: 15, // Offset from the circle center
            closeButton: false,
            className: "hotspot-popup", // Optional: for custom styling
          }).setHTML(`
                <div class="p-2 max-w-xs">
                    <div class="font-bold text-base mb-1">Priority Hotspot ${
                      hotspot.priority
                    }</div>
                    <div class="text-xs text-gray-600 mb-1">
                    Coords: ${hotspot.latitude.toFixed(
                      4
                    )}, ${hotspot.longitude.toFixed(4)}
                    </div>
                    <div class="text-sm mb-2">${
                      hotspot.description || "No description provided."
                    }</div>
                    <button class="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded transition-colors"
                    onclick="window.showHotspotInfluence([${
                      hotspot.longitude
                    }, ${hotspot.latitude}])">
                    Show Area (300m)
                    </button>
                </div>
            `);

          // Add the HTML element as a Mapbox Marker
          const marker = new mapboxgl.Marker(el)
            .setLngLat([hotspot.longitude, hotspot.latitude])
            .setPopup(popup) // Attach popup to the marker itself
            .addTo(map);

          // Store marker instance to remove it later
          existingMarkersRef.current.push(marker);
        });

        // --- Add Global showHotspotInfluence Function ---
        window.showHotspotInfluence = (coordinates: [number, number]) => {
          const currentMap = window.mapInstance; // Use current map instance
          if (!currentMap || !currentMap.getSource("hotspot-influence")) return;

          console.log("Showing influence for:", coordinates);

          // --- Feature Highlighting Logic ---
          const influenceRadiusMeters = 300;
          activeDatasets.forEach((datasetId) => {
            const layerId = `${datasetId}-layer`;
            const sourceId = datasetId;
            if (
              currentMap.getLayer(layerId) &&
              currentMap.getSource(sourceId)
            ) {
              try {
                const source = currentMap.getSource(sourceId);
                // Check if source has _data or features (might vary based on source type/update state)
                const features =
                  source.type === "geojson" ? source._data?.features : [];

                if (!features || features.length === 0) return;

                const nearbyFeatureIds: (string | number)[] = [];
                features.forEach((feature: any) => {
                  if (
                    feature?.geometry?.coordinates &&
                    feature?.properties?.id
                  ) {
                    const featureCoords = feature.geometry.coordinates;
                    const distanceKm = calculateDistance(
                      coordinates[1],
                      coordinates[0], // Hotspot Lat, Lng
                      featureCoords[1],
                      featureCoords[0] // Feature Lat, Lng
                    );
                    if (distanceKm * 1000 <= influenceRadiusMeters) {
                      nearbyFeatureIds.push(feature.properties.id);
                    }
                  }
                });

                // Apply highlighting based on layer type
                const layer = currentMap.getLayer(layerId);
                if (
                  layer &&
                  (layer.type === "circle" || layer.type === "symbol")
                ) {
                  // Option 1: Filter (shows only nearby) - Careful, might hide others
                  // currentMap.setFilter(layerId, ['in', ['id'], ['literal', nearbyFeatureIds]]);

                  // Option 2: Style change (e.g., stroke) - More common
                  currentMap.setPaintProperty(
                    layerId,
                    `${layer.type}-stroke-width`,
                    [
                      "case",
                      ["in", ["get", "id"], ["literal", nearbyFeatureIds]],
                      3, // Highlighted stroke width
                      layer.type === "circle" ? 1 : 0, // Default stroke width (adjust as needed)
                    ]
                  );
                  currentMap.setPaintProperty(
                    layerId,
                    `${layer.type}-stroke-color`,
                    "#e11d48"
                  ); // Highlight color (e.g., rose-600)
                  currentMap.setPaintProperty(
                    layerId,
                    `${layer.type}-stroke-opacity`,
                    [
                      "case",
                      ["in", ["get", "id"], ["literal", nearbyFeatureIds]],
                      1, // Highlighted opacity
                      0.8, // Default opacity
                    ]
                  );
                } else if (layer && layer.type === "heatmap") {
                  // Heatmaps are harder to highlight specifics. Maybe adjust intensity slightly.
                  currentMap.setPaintProperty(
                    layerId,
                    "heatmap-intensity",
                    1.2
                  );
                }
              } catch (err) {
                console.warn(
                  `Could not process features for highlighting dataset ${datasetId}:`,
                  err
                );
              }
            }
          });
          // --- End Feature Highlighting ---

          // Update the influence source data to the clicked hotspot
          currentMap.getSource("hotspot-influence").setData({
            type: "Feature",
            geometry: { type: "Point", coordinates: coordinates },
            properties: {},
          });

          // Make the influence layer visible
          currentMap.setLayoutProperty(
            "hotspot-influence-layer",
            "visibility",
            "visible"
          );

          // Auto-hide influence and reset highlighting after 5 seconds
          setTimeout(() => {
            if (
              currentMap.getLayer("hotspot-influence-layer") &&
              currentMap.getLayoutProperty(
                "hotspot-influence-layer",
                "visibility"
              ) === "visible"
            ) {
              currentMap.setLayoutProperty(
                "hotspot-influence-layer",
                "visibility",
                "none"
              );

              // Reset highlighting for all active datasets
              activeDatasets.forEach((datasetId) => {
                const layerId = `${datasetId}-layer`;
                if (currentMap.getLayer(layerId)) {
                  const layer = currentMap.getLayer(layerId);
                  if (
                    layer &&
                    (layer.type === "circle" || layer.type === "symbol")
                  ) {
                    // Reset paint properties changed for highlighting
                    currentMap.setPaintProperty(
                      layerId,
                      `${layer.type}-stroke-width`,
                      layer.type === "circle" ? 1 : 0
                    ); // Reset to original stroke
                    currentMap.setPaintProperty(
                      layerId,
                      `${layer.type}-stroke-color`,
                      "#4b5563"
                    ); // Reset color (use original or default)
                    currentMap.setPaintProperty(
                      layerId,
                      `${layer.type}-stroke-opacity`,
                      0.8
                    ); // Reset opacity
                  } else if (layer && layer.type === "heatmap") {
                    currentMap.setPaintProperty(
                      layerId,
                      "heatmap-intensity",
                      1
                    ); // Reset intensity
                  }
                  // If using filter method, reset it:
                  // currentMap.setFilter(layerId, null);
                }
              });
              console.log("Hiding influence area and resetting highlights.");
            }
          }, 5000); // 5 seconds
        };

        // --- Fit Bounds ---
        if (newHotspots.length > 0) {
          const bounds = new mapboxgl.LngLatBounds();
          newHotspots.forEach((hotspot) => {
            bounds.extend([hotspot.longitude, hotspot.latitude]);
          });
          map.fitBounds(bounds, {
            padding: 80, // Increased padding
            maxZoom: 16,
            duration: 1000, // Smooth animation
          });
        }
      } catch (err) {
        console.error("Error during updateHotspotMarkers execution:", err);
        // Optionally add UI feedback about the error
      }
    },
    [activeDatasets]
  ); // Depend on activeDatasets for highlighting logic

  // Listen for hotspots updated event
  useEffect(() => {
    const handleHotspotsUpdated = (event: CustomEvent) => {
      const newHotspots = event.detail.hotspots as Hotspot[];
      console.log("Received hotspotsUpdated event with:", newHotspots);
      setHotspots(newHotspots); // Update state

      // Call the memoized update function
      // No need to check mapLoaded here, updateHotspotMarkers does it internally
      updateHotspotMarkers(newHotspots);
    };

    window.addEventListener(
      "hotspotsUpdated",
      handleHotspotsUpdated as EventListener
    );
    return () => {
      window.removeEventListener(
        "hotspotsUpdated",
        handleHotspotsUpdated as EventListener
      );
    };
  }, [updateHotspotMarkers]); // Depend on the memoized function

  // Initialize map
  useEffect(() => {
    // Ensure cleanup runs if dependencies change mid-initialization
    let map: any = null;

    if (mapboxLoaded && mapRef.current && !window.mapInstance && dataLoaded) {
      console.log("Initializing Mapbox map...");
      try {
        const mapboxgl = window.mapboxgl;
        if (!mapboxgl) throw new Error("Mapbox GL JS not loaded");

        const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
        if (!token) {
          setMapError("Mapbox token not found (NEXT_PUBLIC_MAPBOX_TOKEN)");
          return;
        }
        mapboxgl.accessToken = token;

        map = new mapboxgl.Map({
          container: mapRef.current,
          style: `mapbox://styles/mapbox/${mapStyle}`,
          center: [13.405, 52.52], // Berlin
          zoom: 12, // Slightly zoomed out default
          pitch: 20, // Slight tilt
        });

        window.mapInstance = map; // Assign to window immediately

        map.on("load", () => {
          console.log("Map 'load' event fired.");
          setMapLoaded(true);
          setMapError(null); // Clear any previous error on successful load

          map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
          map.addControl(
            new mapboxgl.GeolocateControl({
              positionOptions: { enableHighAccuracy: true },
              trackUserLocation: true,
              showUserHeading: true,
            }),
            "bottom-right"
          );
          map.addControl(new mapboxgl.ScaleControl());

          // Initial data load and hotspot display
          // addDataSources(); // Call addDataSources now that map is loaded
          // updateHotspotMarkers(hotspots); // Update markers with current hotspots state
        });

        map.on("styledata", () => {
          // This event fires when the style is loaded or changed.
          // Useful for re-adding sources/layers if the style changes.
          console.log("Map 'styledata' event fired.");
          // Re-add data sources and hotspots after style change
          if (mapLoaded) {
            // Ensure this only runs *after* initial load is complete
            // addDataSources(); // Re-apply data layers
            // updateHotspotMarkers(hotspots); // Re-apply hotspots
          }
        });

        map.on("error", (e: any) => {
          console.error("Mapbox GL Error:", e);
          setMapError(`Map error: ${e.error?.message || "Unknown map error"}`);
          setMapLoaded(false); // Ensure map is marked as not loaded on error
          window.mapInstance = null; // Clear instance on error
        });
      } catch (err) {
        console.error("Error initializing map:", err);
        setMapError(
          `Failed to initialize map: ${
            err instanceof Error ? err.message : String(err)
          }`
        );
        window.mapInstance = null;
      }
    }

    // Cleanup function
    return () => {
      if (window.mapInstance) {
        console.log("Removing map instance.");
        window.mapInstance?.remove();
        window.mapInstance = null;
        setMapLoaded(false); // Reset map loaded state on cleanup
        // Clean up markers ref
        existingMarkersRef.current.forEach((marker) => marker.remove());
        existingMarkersRef.current = [];
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapboxLoaded, dataLoaded, mapStyle]); // Re-initialize map only if mapbox script loads, data loads, or style changes

  // --- Layer Management Effect ---
  // This useEffect handles adding, removing, and updating layers based on dataState and activeDatasets
  useEffect(() => {
    const map = window.mapInstance;
    const mapboxgl = window.mapboxgl;

    if (!mapLoaded || !map || !mapboxgl || !dataLoaded) {
      // console.log("Layer Management: Map not ready or data not loaded.");
      return; // Don't do anything if map isn't fully ready or data isn't loaded
    }

    if (!map.isStyleLoaded()) {
      console.warn("Layer Management: Style not loaded, deferring.");
      // Optional: could retry, but styledata event might handle it better
      return;
    }

    console.log(
      "Layer Management: Updating layers for active datasets:",
      activeDatasets
    );

    // Define layer adding functions within this scope or import them
    const addTrashcansLayer = (data: any[]) => {
      if (!map.getSource("trashcans")) {
        map.addSource("trashcans", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "trashcans-layer",
          type: "circle",
          source: "trashcans",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["get", "fillLevel", 0],
              0,
              5,
              100,
              15,
            ],
            "circle-color": [
              "interpolate",
              ["linear"],
              ["get", "fillLevel", 0],
              0,
              "#22c55e",
              50,
              "#f59e0b",
              75,
              "#ef4444",
            ],
            "circle-opacity": 0.8,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
          layout: { visibility: "none" }, // Start hidden
        });
        // Add click listener only once
        map.on("click", "trashcans-layer", (e: any) => {
          if (!e.features?.length) return;
          const props = e.features[0].properties;
          new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="p-2"><h3 class="font-bold">Trash Can #${
                props.id
              }</h3><p>Fill: ${props.fillLevel}%</p>${
                props.lastEmptied
                  ? `<p class='text-xs'>Emptied: ${new Date(
                      props.lastEmptied
                    ).toLocaleString()}</p>`
                  : ""
              }</div>`
            )
            .addTo(map);
        });
        map.on(
          "mouseenter",
          "trashcans-layer",
          () => (map.getCanvas().style.cursor = "pointer")
        );
        map.on(
          "mouseleave",
          "trashcans-layer",
          () => (map.getCanvas().style.cursor = "")
        );
      }
      map.getSource("trashcans").setData({
        type: "FeatureCollection",
        features: data.map((item) => ({
          type: "Feature",
          id: item.id, // Use feature id for highlighting if possible
          geometry: {
            type: "Point",
            coordinates: [parseFloat(item.lng), parseFloat(item.lat)],
          },
          properties: {
            id: item.id,
            fillLevel: parseInt(item.fillLevel, 10) || 0,
            lastEmptied: item.lastEmptied,
          },
        })),
      });
      map.setLayoutProperty(
        "trashcans-layer",
        "visibility",
        activeDatasets.includes("trashcans") ? "visible" : "none"
      );
    };

    const addEventsLayer = (data: any[]) => {
      if (!map.getSource("events")) {
        map.addSource("events", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "events-layer",
          type: "circle",
          source: "events",
          paint: {
            "circle-radius": [
              "interpolate",
              ["linear"],
              ["number", ["get", "attendees"], 0],
              0,
              8,
              1000,
              20,
            ], // Ensure attendees is number
            "circle-color": "#3b82f6",
            "circle-opacity": 0.7,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#2563eb",
          },
          layout: { visibility: "none" },
        });
        map.on("click", "events-layer", (e: any) => {
          if (!e.features?.length) return;
          const props = e.features[0].properties;
          new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="p-2"><h3 class="font-bold">${props.name}</h3><p>Attendees: ${props.attendees}</p><p class='text-xs'>${props.date} (${props.duration}h)</p></div>`
            )
            .addTo(map);
        });
        map.on(
          "mouseenter",
          "events-layer",
          () => (map.getCanvas().style.cursor = "pointer")
        );
        map.on(
          "mouseleave",
          "events-layer",
          () => (map.getCanvas().style.cursor = "")
        );
      }
      map.getSource("events").setData({
        type: "FeatureCollection",
        features: data.map((item) => ({
          type: "Feature",
          id: item.id,
          geometry: {
            type: "Point",
            coordinates: [parseFloat(item.lng), parseFloat(item.lat)],
          },
          properties: {
            id: item.id,
            name: item.name,
            attendees: parseInt(item.attendees, 10) || 0,
            date: item.date,
            duration: item.duration,
          },
        })),
      });
      map.setLayoutProperty(
        "events-layer",
        "visibility",
        activeDatasets.includes("events") ? "visible" : "none"
      );
    };

    const addPeopleLayer = (data: any[]) => {
      if (!map.getSource("people")) {
        map.addSource("people", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: "people-layer",
          type: "heatmap",
          source: "people",
          maxzoom: 18, // Adjust max zoom for heatmap rendering
          paint: {
            "heatmap-weight": [
              "interpolate",
              ["linear"],
              ["number", ["get", "density"], 0],
              0,
              0,
              100,
              1,
            ],
            "heatmap-intensity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              1,
              15,
              3,
            ], // Intensity increases on zoom
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(33,102,172,0)",
              0.2,
              "rgb(103,169,207)",
              0.4,
              "rgb(209,229,240)",
              0.6,
              "rgb(253,219,199)",
              0.8,
              "rgb(239,138,98)",
              1,
              "rgb(178,24,43)",
            ],
            "heatmap-radius": [
              "interpolate",
              ["linear"],
              ["zoom"],
              0,
              5,
              15,
              30,
            ], // Radius increases on zoom
            "heatmap-opacity": [
              "interpolate",
              ["linear"],
              ["zoom"],
              7,
              0.9,
              15,
              0.6,
            ], // Fade slightly on zoom in
          },
          layout: { visibility: "none" },
        });
        // No click events for heatmap typically
      }
      map.getSource("people").setData({
        type: "FeatureCollection",
        features: data.map((item) => ({
          type: "Feature",
          id: item.id, // Include ID if needed, though heatmap doesn't use it directly
          geometry: {
            type: "Point",
            coordinates: [parseFloat(item.lng), parseFloat(item.lat)],
          },
          properties: {
            id: item.id,
            density: parseInt(item.density, 10) || 0,
            timestamp: item.timestamp,
          },
        })),
      });
      map.setLayoutProperty(
        "people-layer",
        "visibility",
        activeDatasets.includes("people") ? "visible" : "none"
      );
    };

    // Generic layer handler (Example for 'parks')
    const addGenericLayer = (
      datasetId: string,
      data: any[],
      color: string = "#10b981"
    ) => {
      const layerId = `${datasetId}-layer`;
      if (!map.getSource(datasetId)) {
        map.addSource(datasetId, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });
        map.addLayer({
          id: layerId,
          type: "circle",
          source: datasetId,
          paint: {
            "circle-radius": 8,
            "circle-color": color,
            "circle-opacity": 0.7,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          },
          layout: { visibility: "none" },
        });
        map.on("click", layerId, (e: any) => {
          if (!e.features?.length) return;
          const props = e.features[0].properties;
          const title =
            props.name ||
            `${datasetId.charAt(0).toUpperCase() + datasetId.slice(1)} #${
              props.id || ""
            }`;
          const propsHtml = Object.entries(props)
            .filter(
              ([key]) =>
                !["id", "name", "lat", "lng"].includes(key) &&
                key !== "latitude" &&
                key !== "longitude" &&
                !key.startsWith("_")
            ) // Basic filtering
            .map(
              ([key, value]) =>
                `<p class='text-xs'><strong>${key}:</strong> ${value}</p>`
            )
            .join("");
          new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(
              `<div class="p-2 max-w-xs"><h3 class="font-bold">${title}</h3>${propsHtml}</div>`
            )
            .addTo(map);
        });
        map.on(
          "mouseenter",
          layerId,
          () => (map.getCanvas().style.cursor = "pointer")
        );
        map.on(
          "mouseleave",
          layerId,
          () => (map.getCanvas().style.cursor = "")
        );
      }
      map.getSource(datasetId).setData({
        type: "FeatureCollection",
        features: data.map((item) => ({
          type: "Feature",
          id: item.id,
          geometry: {
            type: "Point",
            coordinates: [
              parseFloat(item.lng || item.longitude),
              parseFloat(item.lat || item.latitude),
            ],
          }, // Allow lng/lat or longitude/latitude
          properties: { ...item, id: item.id }, // Pass all properties
        })),
      });
      map.setLayoutProperty(
        layerId,
        "visibility",
        activeDatasets.includes(datasetId) ? "visible" : "none"
      );
    };

    // --- Apply Layer Updates ---
    // Iterate over ALL potentially available datasets defined in the hook or dataState
    const allPossibleDatasets = Object.keys(dataState); // Or use availableDatasets from hook if more reliable

    allPossibleDatasets.forEach((datasetId) => {
      const data = dataState[datasetId];
      const isActive = activeDatasets.includes(datasetId);

      // Check if data exists for this dataset before trying to add/update
      if (!data || data.length === 0) {
        // If a layer/source exists for this dataset but there's no data or it's inactive, hide or remove it
        if (map.getLayer(`${datasetId}-layer`)) {
          map.setLayoutProperty(`${datasetId}-layer`, "visibility", "none");
        }
        // Optionally remove source if data is permanently gone:
        // if (map.getSource(datasetId)) map.removeSource(datasetId);
        return; // Skip adding/updating if no data
      }

      // Call the appropriate function based on datasetId
      try {
        // Check if it should be active before adding generic layer
        if (isActive) {
          addGenericLayer(datasetId, data, "#6b7280"); // Default gray
        } else {
          // Ensure layer is hidden if inactive
          if (map.getLayer(`${datasetId}-layer`)) {
            map.setLayoutProperty(`${datasetId}-layer`, "visibility", "none");
          }
        }
      } catch (error) {
        console.error(
          `Error processing layer for dataset ${datasetId}:`,
          error
        );
        // Attempt to hide the layer if it exists and caused an error
        if (map.getLayer(`${datasetId}-layer`)) {
          map.setLayoutProperty(`${datasetId}-layer`, "visibility", "none");
        }
      }
    });

    // Update hotspot markers whenever active datasets change, as highlighting depends on them
    // updateHotspotMarkers(hotspots); // Call this to ensure markers are up-to-date
  }, [mapLoaded, dataLoaded, activeDatasets, dataState]); // Dependencies for layer updates

  const getUserLocation = () => {
    // Use the built-in GeolocateControl now, this button is redundant
    // Or, if you want custom behavior:
    const map = window.mapInstance;
    if (map && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userCoords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          setUserLocation(userCoords); // Keep state if needed elsewhere
          map.flyTo({ center: userCoords, zoom: 14 });
        },
        (error) => {
          console.error("Error getting user location:", error);
          // Add user feedback here (e.g., toast notification)
        },
        { enableHighAccuracy: true }
      );
    }
  };

  // Render error state
  if (mapError) {
    return (
      <div className="relative h-full w-full flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-amber-500 border-2">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Map Unavailable</h3>
            <p className="text-sm text-muted-foreground mb-4">{mapError}</p>
            <p className="text-xs text-muted-foreground">
              Please check your Mapbox token (ensure `NEXT_PUBLIC_MAPBOX_TOKEN`
              is set in your `.env.local` and the server is restarted), your
              internet connection, and the browser console for more details.
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="mt-4"
            >
              Reload Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Ensure the map container takes full height and width of its parent
  return (
    <>
      {/* Load Mapbox GL JS from CDN */}
      <Script
        src="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.js"
        strategy="lazyOnload"
        onLoad={() => {
          console.log("Mapbox script loaded");
          if (window.mapboxgl) {
            setMapboxLoaded(true);
          } else {
            console.error("Mapbox script loaded but window.mapboxgl is not defined!");
            setMapError("Failed to initialize Mapbox GL JS.");
          }
        }}
        onError={(e) => {
          console.error("Error loading Mapbox script:", e);
          setMapError("Failed to load Mapbox library script.");
        }}
      />
      {/* Mapbox CSS */}
      <link
        href="https://api.mapbox.com/mapbox-gl-js/v2.15.0/mapbox-gl.css"
        rel="stylesheet"
      />
      
      {/* Custom Styles */}
      <style jsx global>{`
        .mapboxgl-popup-content {
          padding: 0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
          border-radius: 4px;
        }
        .mapboxgl-popup-close-button {
          padding: 4px;
          font-size: 1.2rem;
        }
        .hotspot-popup .mapboxgl-popup-content {
          font-family: sans-serif;
        }
        .mapboxgl-ctrl-bottom-right {
          z-index: 5;
        }
        /* Ensure the map container fills its parent completely */
        .map-container {
          height: 100%;
          width: 100%;
        }
      `}</style>

      <div className="h-full w-full relative overflow-hidden">
        {/* Map Container */}
        <div
          ref={mapRef}
          className="map-container absolute inset-0 bg-gray-200"
          aria-label="Map view"
        >
          {/* Loading Indicator */}
          {!mapLoaded && !mapError && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 bg-opacity-80 z-10">
              <div className="text-center p-4 bg-white rounded shadow-lg">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
                <p className="mt-3 text-sm font-medium text-gray-600">
                  Loading map data...
                </p>
              </div>
            </div>
          )}
        </div>
        
        {/* Map Overlays */}
        {/* ...existing overlays... */}
      </div>
    </>
  );
}

// Add/update global declarations if not already present in a .d.ts file
declare global {
  interface Window {
    mapboxgl?: any; // Use optional chaining for safety
    mapInstance?: any; // Map instance
    showHotspotInfluence?: (coordinates: [number, number]) => void; // Function for interaction
  }
}
