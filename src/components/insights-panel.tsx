"use client"

import { useState } from "react"
import { useDatasets } from "@/hooks/use-datasets"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart, PieChart } from "@/components/charts"

export default function InsightsPanel() {
  const { activeDatasets } = useDatasets()
  const [timeRange, setTimeRange] = useState<"day" | "week" | "month">("week")

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Data Insights</h2>
        <div className="flex space-x-1">
          <Button
            variant={timeRange === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("day")}
            className="text-xs h-7"
          >
            Day
          </Button>
          <Button
            variant={timeRange === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("week")}
            className="text-xs h-7"
          >
            Week
          </Button>
          <Button
            variant={timeRange === "month" ? "default" : "outline"}
            size="sm"
            onClick={() => setTimeRange("month")}
            className="text-xs h-7"
          >
            Month
          </Button>
        </div>
      </div>

      {activeDatasets.length === 0 ? (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">Select datasets to view insights</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue="distribution">
          <TabsList className="w-full">
            <TabsTrigger value="distribution" className="flex-1">
              Distribution
            </TabsTrigger>
            <TabsTrigger value="trends" className="flex-1">
              Trends
            </TabsTrigger>
            <TabsTrigger value="correlation" className="flex-1">
              Correlation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distribution">
            <Card>
              <CardContent className="p-4">
                <PieChart timeRange={timeRange} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends">
            <Card>
              <CardContent className="p-4">
                <LineChart timeRange={timeRange} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="correlation">
            <Card>
              <CardContent className="p-4">
                <BarChart timeRange={timeRange} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
