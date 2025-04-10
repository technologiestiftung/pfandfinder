"use client"

import { useEffect, useRef } from "react"
import { useDatasets } from "@/hooks/use-datasets"

type ChartProps = {
  timeRange: "day" | "week" | "month"
}

export function PieChart({ timeRange }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const { activeDatasets } = useDatasets()

  useEffect(() => {
    if (!chartRef.current) return

    // In a real implementation, we would use a charting library like Chart.js
    // For demo purposes, we're creating a simple visualization
    const canvas = document.createElement("canvas")
    canvas.width = chartRef.current.clientWidth
    canvas.height = 200
    chartRef.current.innerHTML = ""
    chartRef.current.appendChild(canvas)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw a simple pie chart
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    const radius = Math.min(centerX, centerY) - 10

    const colors = {
      trashcans: "#ef4444",
      events: "#3b82f6",
      parks: "#22c55e",
      people: "#f59e0b",
    }

    const data = activeDatasets.map((dataset, index) => ({
      id: dataset,
      value: 25 + Math.random() * 25, // Random value between 25-50
      color: colors[dataset as keyof typeof colors],
    }))

    let startAngle = 0
    data.forEach((item) => {
      const sliceAngle = (item.value / 100) * 2 * Math.PI

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle)
      ctx.closePath()

      ctx.fillStyle = item.color
      ctx.fill()

      startAngle += sliceAngle
    })

    // Add a legend
    const legendY = canvas.height - 30
    data.forEach((item, index) => {
      const x = 20 + index * (canvas.width / data.length)

      ctx.fillStyle = item.color
      ctx.fillRect(x, legendY, 10, 10)

      ctx.fillStyle = "#000"
      ctx.font = "10px Arial"
      ctx.fillText(item.id, x + 15, legendY + 8)
    })
  }, [activeDatasets, timeRange])

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Distribution by Type</h3>
      <div ref={chartRef} className="h-[200px] w-full"></div>
    </div>
  )
}

export function LineChart({ timeRange }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const { activeDatasets } = useDatasets()

  useEffect(() => {
    if (!chartRef.current) return

    // In a real implementation, we would use a charting library like Chart.js
    // For demo purposes, we're creating a simple visualization
    const canvas = document.createElement("canvas")
    canvas.width = chartRef.current.clientWidth
    canvas.height = 200
    chartRef.current.innerHTML = ""
    chartRef.current.appendChild(canvas)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw a simple line chart
    const colors = {
      trashcans: "#ef4444",
      events: "#3b82f6",
      parks: "#22c55e",
      people: "#f59e0b",
    }

    const points = {
      day: 24,
      week: 7,
      month: 30,
    }

    const width = canvas.width - 40
    const height = canvas.height - 40
    const pointCount = points[timeRange]

    // Draw axes
    ctx.beginPath()
    ctx.moveTo(30, 10)
    ctx.lineTo(30, height + 10)
    ctx.lineTo(width + 30, height + 10)
    ctx.strokeStyle = "#ddd"
    ctx.stroke()

    activeDatasets.forEach((dataset) => {
      const color = colors[dataset as keyof typeof colors]

      ctx.beginPath()

      // Generate random data points
      for (let i = 0; i < pointCount; i++) {
        const x = 30 + i * (width / (pointCount - 1))
        const y = 10 + Math.random() * height

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // Add labels
    ctx.fillStyle = "#000"
    ctx.font = "10px Arial"

    if (timeRange === "day") {
      for (let i = 0; i < 24; i += 4) {
        const x = 30 + i * (width / 23)
        ctx.fillText(`${i}:00`, x - 10, height + 25)
      }
    } else if (timeRange === "week") {
      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      days.forEach((day, i) => {
        const x = 30 + i * (width / 6)
        ctx.fillText(day, x - 10, height + 25)
      })
    } else {
      for (let i = 0; i < 30; i += 5) {
        const x = 30 + i * (width / 29)
        ctx.fillText(`${i + 1}`, x, height + 25)
      }
    }
  }, [activeDatasets, timeRange])

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Trends Over Time</h3>
      <div ref={chartRef} className="h-[200px] w-full"></div>
    </div>
  )
}

export function BarChart({ timeRange }: ChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  const { activeDatasets } = useDatasets()

  useEffect(() => {
    if (!chartRef.current || activeDatasets.length < 2) return

    // In a real implementation, we would use a charting library like Chart.js
    // For demo purposes, we're creating a simple visualization
    const canvas = document.createElement("canvas")
    canvas.width = chartRef.current.clientWidth
    canvas.height = 200
    chartRef.current.innerHTML = ""
    chartRef.current.appendChild(canvas)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Draw a simple bar chart
    const width = canvas.width - 40
    const height = canvas.height - 40

    // Draw axes
    ctx.beginPath()
    ctx.moveTo(30, 10)
    ctx.lineTo(30, height + 10)
    ctx.lineTo(width + 30, height + 10)
    ctx.strokeStyle = "#ddd"
    ctx.stroke()

    // Generate correlation data
    const correlations: Array<{ pair: string; value: number }> = []

    for (let i = 0; i < activeDatasets.length; i++) {
      for (let j = i + 1; j < activeDatasets.length; j++) {
        correlations.push({
          pair: `${activeDatasets[i]} & ${activeDatasets[j]}`,
          value: 0.3 + Math.random() * 0.7, // Random correlation between 0.3 and 1.0
        })
      }
    }

    // Draw bars
    const barWidth = width / (correlations.length * 2)

    correlations.forEach((corr, index) => {
      const x = 30 + index * barWidth * 2 + barWidth / 2
      const barHeight = corr.value * height
      const y = height + 10 - barHeight

      ctx.fillStyle = `rgba(59, 130, 246, ${0.5 + corr.value / 2})`
      ctx.fillRect(x, y, barWidth, barHeight)

      // Add value label
      ctx.fillStyle = "#000"
      ctx.font = "10px Arial"
      ctx.fillText(corr.value.toFixed(2), x, y - 5)

      // Add pair label
      ctx.fillText(corr.pair, x - 10, height + 25)
    })
  }, [activeDatasets, timeRange])

  return (
    <div>
      <h3 className="text-sm font-medium mb-2">Dataset Correlations</h3>
      {activeDatasets.length < 2 ? (
        <p className="text-sm text-muted-foreground text-center">Select at least 2 datasets to view correlations</p>
      ) : (
        <div ref={chartRef} className="h-[200px] w-full"></div>
      )}
    </div>
  )
}
