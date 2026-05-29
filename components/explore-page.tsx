"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { useApp } from "@/lib/app-context"
import type { Occurrence } from "@/lib/types"
import { OccurrenceList } from "@/components/occurrence-list"
import { OccurrenceDetailSheet } from "@/components/occurrence-detail-sheet"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Map, List, MapPin } from "lucide-react"

// Dynamic import for map to avoid SSR issues
const MapComponent = dynamic(
  () => import("@/components/map-component").then((mod) => mod.MapComponent),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full bg-muted/50 flex items-center justify-center">
        <div className="text-center">
          <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-pulse" />
          <p className="text-muted-foreground">Carregando mapa...</p>
        </div>
      </div>
    ),
  }
)

export function ExplorePage() {
  const { occurrences } = useApp()
  const [viewMode, setViewMode] = useState<"map" | "list">("map")
  const [selectedOccurrence, setSelectedOccurrence] = useState<Occurrence | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)

  const handleViewDetails = (occurrence: Occurrence) => {
    setSelectedOccurrence(occurrence)
    setDetailSheetOpen(true)
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100vh-4rem)]">
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/50 bg-card/50 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">Explorar Ocorrências</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {occurrences.length} ocorrência{occurrences.length !== 1 ? "s" : ""} registrada{occurrences.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "map" | "list")}>
          <TabsList>
            <TabsTrigger value="map" className="gap-2">
              <Map className="h-4 w-4" />
              <span className="hidden sm:inline">Mapa</span>
            </TabsTrigger>
            <TabsTrigger value="list" className="gap-2">
              <List className="h-4 w-4" />
              <span className="hidden sm:inline">Lista</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {viewMode === "map" ? (
          <MapComponent
            occurrences={occurrences}
            onViewDetails={handleViewDetails}
          />
        ) : (
          <OccurrenceList onViewDetails={handleViewDetails} />
        )}
      </div>

      {/* Detail Sheet */}
      <OccurrenceDetailSheet
        occurrence={selectedOccurrence}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
      />
    </div>
  )
}
