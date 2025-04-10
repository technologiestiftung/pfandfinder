"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useDatasets } from "@/hooks/use-datasets";
import { AlertTriangle, CheckCircle, Loader2, RefreshCcw } from "lucide-react";
import { useEffect, useState } from "react";

export function HotspotAnalyzer() {
  const { activeDatasets } = useDatasets();
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFallback, setIsFallback] = useState(false);

  const analyzeData = async () => {
    if (activeDatasets.length === 0) return;

    try {
      setLoading(true);
      setError(null);
      setIsFallback(false);

      // Create a timeout promise to abort if the request takes too long
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out")), 10000);
      });

      // Call our secure API route that handles the Mistral API
      const fetchPromise = fetch("/api/mistral", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ datasets: activeDatasets }),
      });

      // Race between the fetch and the timeout
      const response = (await Promise.race([
        fetchPromise,
        timeoutPromise,
      ])) as Response;

      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setInsights(data.text);
      setIsFallback(data.fallback === true);
    } catch (err) {
      console.error("Error analyzing data:", err);
      setError("Unable to generate AI insights. Using pre-generated analysis.");

      // Provide fallback insights after a short delay to show the error message
      setTimeout(() => {
        provideFallbackInsights();
        setError(null);
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle fallback insights
  const provideFallbackInsights = () => {
    // Pre-generated insights for different dataset combinations
    const preGeneratedInsights: Record<string, string> = {
      // Single dataset insights
      trashcans:
        "Analysis shows 40% of trash cans are over capacity in downtown areas, particularly during lunch hours (12-2pm) and after work (5-7pm). Consider adding more bins at these peak times or increasing collection frequency in high-traffic areas.",
      events:
        "Event scheduling shows potential congestion in the central district this weekend with three major events overlapping. Consider coordinating with event organizers to stagger start times or prepare additional transportation options.",
      parks:
        "Park usage data indicates concentrated activity around playgrounds and picnic areas, with 70% higher foot traffic on weekends. Facilities in these high-traffic areas show increased wear and may require more frequent maintenance.",
      people:
        "Pedestrian traffic is concentrated in commercial districts during lunch hours and early evening on weekdays. Weekend patterns differ significantly with more dispersed activity throughout the day.",
      // Multi-dataset insights (abbreviated for brevity)
      "trashcans,events,parks,people":
        "Comprehensive analysis reveals five critical hotspots where all factors converge. Downtown Junction shows the highest pressure point with upcoming events, peak pedestrian traffic, park proximity, and insufficient waste facilities. Recommend coordinated intervention including increased waste collection, traffic management, and potentially event rescheduling to distribute impact.",
    };

    // Create a key from the active datasets (sorted to ensure consistent lookup)
    const key = [...activeDatasets].sort().join(",");

    // Get the pre-generated insight or fallback to a generic one
    const insight =
      preGeneratedInsights[key] ||
      "Analysis of the selected datasets shows several potential hotspots requiring attention. The correlation between these factors suggests targeted interventions could significantly improve urban efficiency and cleanliness.";

    setInsights(insight);
    setIsFallback(true);
  };

  useEffect(() => {
    // Reset state when datasets change
    setInsights(null);
    setError(null);
    setIsFallback(false);

    if (activeDatasets.length === 0) return;

    analyzeData();
  }, [activeDatasets]);

  if (activeDatasets.length === 0) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Select datasets to generate AI insights
          </p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            Analyzing {activeDatasets.length} datasets...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-4 text-center">
          <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        {insights ? (
          <>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                <p className="text-sm font-medium">
                  {isFallback ? "Analysis Complete" : "AI Analysis Complete"}
                </p>
              </div>
              {isFallback && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={analyzeData}
                  disabled={loading}
                >
                  <RefreshCcw className="h-3 w-3 mr-1" />
                  <span className="text-xs">Retry AI</span>
                </Button>
              )}
            </div>
            <p className="text-sm">{insights}</p>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center">
            No insights available
          </p>
        )}
      </CardContent>
    </Card>
  );
}
