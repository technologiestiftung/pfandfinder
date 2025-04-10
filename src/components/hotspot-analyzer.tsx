"use client";

import { Button } from "@/components/ui/button";
import { useDatasets } from "@/hooks/use-datasets";
import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

// Interface for extracted hotspot information
export interface Hotspot {
  latitude: number;
  longitude: number;
  priority: number;
  description: string;
}

export default function HotspotAnalyzer() {
  const { activeDatasets, availableDatasets } = useDatasets();
  const [insights, setInsights] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);

  // Analyze data when active datasets change
  const analyzeHotspots = async () => {
    if (activeDatasets.length === 0) {
      setInsights("Please select at least one dataset to analyze.");
      setHotspots([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/mistral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          datasets: activeDatasets,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      setInsights(data.text);
      
      // Extract hotspots from the analysis text
      const extractedHotspots = extractHotspotsFromText(data.text);
      setHotspots(extractedHotspots);
      
      console.log("Extracted hotspots:", extractedHotspots);
      
      // Dispatch custom event to notify the map component
      const event = new CustomEvent('hotspotsUpdated', { 
        detail: { hotspots: extractedHotspots } 
      });
      window.dispatchEvent(event);
      
    } catch (err) {
      console.error("Error analyzing hotspots:", err);
      setError(
        `Failed to analyze data: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
      setHotspots([]);
    } finally {
      setLoading(false);
    }
  };

  // Extract hotspot coordinates and priorities from the analysis text
  const extractHotspotsFromText = (text: string): Hotspot[] => {
    const hotspots: Hotspot[] = [];
    
    // First try to find structured priority areas with numbered sections
    const priorityBlocks = text.split(/\d+\.\s+Priority\s+Area[:\s]*/i);
    
    if (priorityBlocks.length > 1) {
      // Skip the first element, which is likely text before the first priority area
      priorityBlocks.slice(1).forEach((block, index) => {
        // Various coordinate patterns to try matching
        const coordPatterns = [
          /(?:coordinates|at)\s*\((\d+\.\d+),\s*(\d+\.\d+)\)/i,  // Coordinates (52.52, 13.405)
          /(?:coordinates|at)\s*\((\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)\)/i,  // Coordinates (52.52, 13.405) with optional spaces
          /\((\d+\.\d+)[°,\s]*[N]?[,\s]+(\d+\.\d+)[°,\s]*[E]?\)/i,  // (52.52° N, 13.405° E)
          /(\d+\.\d+)[°,\s]*[N]?[,\s]+(\d+\.\d+)[°,\s]*[E]?/i,  // 52.52° N, 13.405° E
          /latitude[:\s]+(\d+\.\d+)[,\s]+longitude[:\s]+(\d+\.\d+)/i,  // latitude: 52.52, longitude: 13.405
          /coordinates[:\s]+(\d+\.\d+)[,\s]+(\d+\.\d+)/i,  // coordinates: 52.52, 13.405
        ];
        
        let coordMatch = null;
        
        // Try each pattern until we find a match
        for (const pattern of coordPatterns) {
          coordMatch = block.match(pattern);
          if (coordMatch) break;
        }
        
        if (coordMatch) {
          const lat = parseFloat(coordMatch[1]);
          const lng = parseFloat(coordMatch[2]);
          
          if (!isNaN(lat) && !isNaN(lng)) {
            // Get description from the rest of the block
            let description = block.substring(coordMatch.index + coordMatch[0].length).trim();
            
            // If the description is too long, truncate it
            if (description.length > 200) {
              description = description.substring(0, 200) + '...';
            }
            
            // Remove any trailing periods or punctuation
            description = description.replace(/[.,:;]+$/, '');
            
            hotspots.push({
              latitude: lat,
              longitude: lng,
              priority: index + 1,
              description: description || `Priority Area ${index + 1}`
            });
          }
        }
      });
    }
    
    // If we couldn't extract any hotspots using priority areas,
    // fall back to looking for coordinates anywhere in the text
    if (hotspots.length === 0) {
      // Look for any coordinates in the text with various formats
      const generalCoordPattern = /(\d+\.\d+)[°,\s]*[N]?[,\s]+(\d+\.\d+)[°,\s]*[E]?/g;
      let match;
      let index = 0;
      
      while ((match = generalCoordPattern.exec(text)) !== null && index < 5) {
        const lat = parseFloat(match[1]);
        const lng = parseFloat(match[2]);
        
        if (!isNaN(lat) && !isNaN(lng)) {
          // Extract surrounding context for description
          const contextStart = Math.max(0, match.index - 100);
          const contextEnd = Math.min(text.length, match.index + match[0].length + 100);
          let context = text.substring(contextStart, contextEnd);
          
          // Try to find sentence boundaries
          const sentenceStart = context.lastIndexOf('. ', match.index - contextStart);
          const sentenceEnd = context.indexOf('. ', match.index - contextStart + match[0].length);
          
          if (sentenceStart !== -1 && sentenceEnd !== -1) {
            context = context.substring(sentenceStart + 2, sentenceEnd + 1);
          } else if (sentenceEnd !== -1) {
            context = context.substring(0, sentenceEnd + 1);
          } else if (sentenceStart !== -1) {
            context = context.substring(sentenceStart + 2);
          }
          
          // Clean up the context
          context = context.trim();
          if (context.length > 200) {
            context = context.substring(0, 200) + '...';
          }
          
          hotspots.push({
            latitude: lat,
            longitude: lng,
            priority: index + 1,
            description: context || `Location at coordinates (${lat}, ${lng})`
          });
          
          index++;
        }
      }
    }
    
    return hotspots;
  };

  // Automatically analyze when datasets change
  useEffect(() => {
    if (activeDatasets.length > 0) {
      analyzeHotspots();
    }
  }, [activeDatasets]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Trash Hotspot Analysis</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={analyzeHotspots}
          disabled={loading || activeDatasets.length === 0}
          className="flex items-center gap-1"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
          />
          <span>Refresh Analysis</span>
        </Button>
      </div>

      {error && (
        <div className="p-4 text-sm bg-red-50 text-red-600 rounded-md">
          {error}
        </div>
      )}

      {activeDatasets.length === 0 ? (
        <div className="p-4 text-sm bg-amber-50 text-amber-600 rounded-md">
          Select at least one dataset to analyze potential trash hotspots.
        </div>
      ) : loading ? (
        <div className="animate-pulse space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      ) : (
        <>
          <div className="text-sm space-y-2 whitespace-pre-line">{insights}</div>
          
          {hotspots.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-medium mb-2">Identified Hotspots:</h4>
              <div className="space-y-2 text-sm">
                {hotspots.map((hotspot, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center 
                      ${hotspot.priority === 1 ? 'bg-red-500' : 
                        hotspot.priority === 2 ? 'bg-orange-500' : 'bg-yellow-500'}`}>
                      <span className="text-white text-xs font-bold">{hotspot.priority}</span>
                    </div>
                    <div>
                      <div className="font-medium">Priority {hotspot.priority}</div>
                      <div className="text-muted-foreground text-xs">
                        Coordinates: {hotspot.latitude.toFixed(4)}, {hotspot.longitude.toFixed(4)}
                      </div>
                      <div className="text-xs mt-1">{hotspot.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
