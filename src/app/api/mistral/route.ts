import { readAllDataFiles } from "@/lib/data-utils";
import { NextResponse } from "next/server";

// This is a server-side route handler that will keep the API key secure
export async function POST(request: Request) {
  try {
    const { datasets } = await request.json();

    if (!datasets || datasets.length === 0) {
      return NextResponse.json(
        { error: "No datasets provided" },
        { status: 400 }
      );
    }

    // Read data from files
    const allData = await readAllDataFiles();

    // Check if we have the Mistral API key
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      console.warn("Mistral API key not found, returning fallback response");
      return NextResponse.json({
        text: getFallbackInsight(datasets, allData),
        fallback: true,
      });
    }

    // Create a prompt based on active datasets and real data
    const datasetDescriptions = datasets
      .map((datasetName: string) => {
        const datasetData = allData[datasetName];
        if (!datasetData) {
          return getDefaultDataDescription(datasetName);
        }

        return formatDataForPrompt(datasetName, datasetData);
      })
      .filter(Boolean)
      .join(". ");

    try {
      // Direct fetch to Mistral API
      const response = await fetch(
        "https://api.mistral.ai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "mistral-medium",
            messages: [
              {
                role: "system",
                content:
                  "You are an urban data analyst specialized in identifying waste management hotspots based on urban data. Your task is to analyze data about trashcans, people density, and events to find areas where trash is likely to accumulate and where additional waste management resources should be deployed.",
              },
              {
                role: "user",
                content: `I need to optimize trash collection in Berlin. I have the following data:\n\n${datasetDescriptions}\n\nAnalyze this data to identify potential hotspots where trash is likely to accumulate. Focus on areas with high people density, near events, and with currently full trashcans. Provide a specific analysis with geographic coordinates for the top 3 priority areas that need immediate attention.`,
              },
            ],
            temperature: 0.7,
            max_tokens: 800,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();
      return NextResponse.json({
        text: result.choices[0]?.message?.content || "No response from AI",
        fallback: false,
      });
    } catch (error) {
      console.error("Error calling Mistral API:", error);
      return NextResponse.json({
        text: getFallbackInsight(datasets, allData),
        fallback: true,
      });
    }
  } catch (error) {
    console.error("API route error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// Function to format dataset data for the prompt
function formatDataForPrompt(datasetName: string, data: any): string {
  if (!data) return "";

  // Handle different data formats
  const items = Array.isArray(data) ? data : data.data;

  if (!items || items.length === 0) {
    return getDefaultDataDescription(datasetName);
  }

  switch (datasetName) {
    case "trashcans":
      const fullTrashcans = items.filter(
        (item: any) => item.fillLevel >= 75
      ).length;
      return `${
        items.length
      } public trash cans with ${fullTrashcans} over 75% capacity. The fullest trashcans are at coordinates ${items
        .sort((a: any, b: any) => b.fillLevel - a.fillLevel)
        .slice(0, 3)
        .map(
          (item: any) =>
            `(${item.lat}, ${item.lng}) at ${item.fillLevel}% capacity`
        )
        .join(", ")}`;

    case "events":
      return `${
        items.length
      } public events scheduled with estimated attendance of ${items.reduce(
        (sum: number, item: any) => sum + parseInt(item.attendees || "0"),
        0
      )} people. Largest events: ${items
        .sort((a: any, b: any) => parseInt(b.attendees) - parseInt(a.attendees))
        .slice(0, 3)
        .map(
          (item: any) =>
            `${item.name} at (${item.lat}, ${item.lng}) with ${item.attendees} attendees`
        )
        .join(", ")}`;

    case "people":
      return `People density data shows concentration at ${items
        .sort((a: any, b: any) => b.density - a.density)
        .slice(0, 3)
        .map(
          (item: any) =>
            `(${item.lat}, ${item.lng}) with density ${item.density}`
        )
        .join(", ")}`;

    default:
      return getDefaultDataDescription(datasetName);
  }
}

// Function to get default data description for a dataset
function getDefaultDataDescription(datasetName: string): string {
  const dataDescriptions: Record<string, string> = {
    trashcans:
      "250 public trash cans with 40% over capacity in downtown areas, particularly near commercial zones.",
    events:
      "15 public events scheduled this week with estimated attendance of 5000 people in central and northern districts.",
    people:
      "Pedestrian traffic data shows consistent patterns with concentration in commercial districts during peak hours.",
  };

  return dataDescriptions[datasetName as keyof typeof dataDescriptions] || "";
}

// Function to get fallback insights based on datasets
function getFallbackInsight(datasets: string[], data: any): string {
  const baseInsight =
    "Based on the available data, I recommend focusing on the following areas:";

  // If we have actual data, use it for the fallback
  if (data && Object.keys(data).length > 0) {
    const trashHotspots = [];

    // Find areas with both high people density and full trashcans
    if (
      data.trashcans &&
      data.people &&
      datasets.includes("trashcans") &&
      datasets.includes("people")
    ) {
      const trashcans = Array.isArray(data.trashcans)
        ? data.trashcans
        : data.trashcans.data;
      const people = Array.isArray(data.people)
        ? data.people
        : data.people.data;

      // Find full trashcans
      const fullTrashcans = trashcans
        .filter((t: any) => t.fillLevel >= 75)
        .sort((a: any, b: any) => b.fillLevel - a.fillLevel);

      // Find high density areas
      const highDensityAreas = people
        .filter((p: any) => p.density >= 70)
        .sort((a: any, b: any) => b.density - a.density);

      // Calculate proximity and find matches
      for (const trashcan of fullTrashcans.slice(0, 5)) {
        for (const area of highDensityAreas.slice(0, 5)) {
          const distance = calculateDistance(
            parseFloat(trashcan.lat),
            parseFloat(trashcan.lng),
            parseFloat(area.lat),
            parseFloat(area.lng)
          );

          if (distance < 0.005) {
            // ~500m in decimal degrees
            trashHotspots.push({
              lat: trashcan.lat,
              lng: trashcan.lng,
              fillLevel: trashcan.fillLevel,
              density: area.density,
              score:
                (trashcan.fillLevel / 100) *
                (area.density / 100) *
                (1 - distance * 100),
            });
          }
        }
      }

      // Sort by score
      trashHotspots.sort((a, b) => b.score - a.score);
    }

    if (trashHotspots.length > 0) {
      return `${baseInsight}\n\n1. Priority Area: Coordinates (${
        trashHotspots[0]?.lat
      }, ${trashHotspots[0]?.lng}) - Trashcan at ${
        trashHotspots[0]?.fillLevel
      }% capacity in an area with ${
        trashHotspots[0]?.density
      }% people density.\n\n${
        trashHotspots[1]
          ? `2. Priority Area: Coordinates (${trashHotspots[1]?.lat}, ${trashHotspots[1]?.lng}) - Trashcan at ${trashHotspots[1]?.fillLevel}% capacity in an area with ${trashHotspots[1]?.density}% people density.\n\n`
          : ""
      }${
        trashHotspots[2]
          ? `3. Priority Area: Coordinates (${trashHotspots[2]?.lat}, ${trashHotspots[2]?.lng}) - Trashcan at ${trashHotspots[2]?.fillLevel}% capacity in an area with ${trashHotspots[2]?.density}% people density.`
          : ""
      }`;
    }
  }

  // Default fallback if we can't generate a data-driven response
  if (datasets.includes("trashcans") && datasets.includes("people")) {
    return `${baseInsight}\n\n1. Priority Area: Downtown commercial district - High pedestrian traffic and trashcans consistently over 80% capacity.\n\n2. Priority Area: Public transportation hubs - Subway and bus stations show increased waste accumulation during rush hours.\n\n3. Priority Area: Weekend market zones - Areas that host regular public markets show significant waste accumulation patterns.`;
  } else if (datasets.includes("trashcans")) {
    return `${baseInsight}\n\n1. Priority Area: Centrally located trashcans showing consistent high fill levels.\n\n2. Priority Area: Trashcans that have remained over 75% capacity for more than 24 hours.\n\n3. Priority Area: Clusters of multiple trashcans all showing high capacity.`;
  } else if (datasets.includes("people")) {
    return `${baseInsight}\n\n1. Priority Area: High-density pedestrian zones which likely correlate with higher waste generation.\n\n2. Priority Area: Commercial districts during lunch hours showing peak density patterns.\n\n3. Priority Area: Weekend recreational areas with sustained high people density.`;
  } else {
    return `${baseInsight}\n\nI recommend collecting more data on trashcan fill levels and people density to properly identify priority areas for waste management.`;
  }
}

// Helper function to calculate distance between coordinates
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
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
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}
