"use client"

import { useDatasets } from "@/hooks/use-datasets"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Trash2, Calendar, Trees, Users, File, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"

// Map of icon string names to their components
const iconMap = {
  Trash2,
  Calendar,
  Trees,
  Users,
  File
}

export default function DatasetSelector() {
  const { activeDatasets, toggleDataset, setAvailableDatasets } = useDatasets()
  const [datasets, setDatasets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchDatasets() {
      try {
        setLoading(true)
        const response = await fetch('/api/datasets')
        
        if (!response.ok) {
          throw new Error('Failed to fetch datasets')
        }
        
        const data = await response.json()
        setDatasets(data.datasets)
        setAvailableDatasets(data.datasets.map(d => d.id))
        setLoading(false)
      } catch (err) {
        console.error('Error fetching datasets:', err)
        setError(err.message)
        setLoading(false)
        
        // Fallback datasets
        const fallbackDatasets = [
          { id: "trashcans", name: "Trash Cans", icon: "Trash2", color: "bg-red-500" },
          { id: "events", name: "Events", icon: "Calendar", color: "bg-blue-500" },
          { id: "parks", name: "Parks", icon: "Trees", color: "bg-green-500" },
          { id: "people", name: "People Density", icon: "Users", color: "bg-amber-500" },
        ]
        setDatasets(fallbackDatasets)
        setAvailableDatasets(fallbackDatasets.map(d => d.id))
      }
    }

    fetchDatasets()
  }, [setAvailableDatasets])

  if (loading) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Datasets</h2>
        <div className="flex items-center justify-center p-4">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading datasets...</span>
        </div>
      </div>
    )
  }

  if (error && datasets.length === 0) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4">Datasets</h2>
        <div className="p-4 border rounded bg-red-50 text-red-600">
          <p>Error loading datasets: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Datasets</h2>
      <div className="space-y-4">
        {datasets.map((dataset) => {
          const IconComponent = iconMap[dataset.icon] || iconMap.File
          const isActive = activeDatasets.includes(dataset.id)

          return (
            <div key={dataset.id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`${dataset.color} p-1.5 rounded mr-2`}>
                  <IconComponent className="h-4 w-4 text-white" />
                </div>
                <Label htmlFor={`dataset-${dataset.id}`} className="cursor-pointer">
                  {dataset.name}
                </Label>
              </div>
              <Switch
                id={`dataset-${dataset.id}`}
                checked={isActive}
                onCheckedChange={() => toggleDataset(dataset.id)}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}
