"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

type DatasetContextType = {
  activeDatasets: string[]
  availableDatasets: string[]
  toggleDataset: (datasetId: string) => void
  setAvailableDatasets: (datasets: string[]) => void
}

const DatasetContext = createContext<DatasetContextType | undefined>(undefined)

export function DatasetProvider({ children }: { children: ReactNode }) {
  const [activeDatasets, setActiveDatasets] = useState<string[]>(["trashcans", "people"])
  const [availableDatasets, setAvailableDatasets] = useState<string[]>([])

  const toggleDataset = (datasetId: string) => {
    setActiveDatasets((prev) => {
      if (prev.includes(datasetId)) {
        return prev.filter((id) => id !== datasetId)
      } else {
        return [...prev, datasetId]
      }
    })
  }

  return <DatasetContext.Provider value={{ activeDatasets, availableDatasets, toggleDataset, setAvailableDatasets }}>{children}</DatasetContext.Provider>
}

export function useDatasets() {
  const context = useContext(DatasetContext)

  if (context === undefined) {
    throw new Error("useDatasets must be used within a DatasetProvider")
  }

  return context
}
