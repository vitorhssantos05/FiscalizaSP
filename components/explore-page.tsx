"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { useApp } from "@/lib/app-context"
import type { Occurrence } from "@/lib/types"
import { OccurrenceList } from "@/components/occurrence-list"
import { OccurrenceDetailSheet, type ResearchAction } from "@/components/occurrence-detail-sheet"
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

interface ExplorePageProps {
  embedded?: boolean
  allowDetails?: boolean
  onResearchAction?: (action: ResearchAction, occurrenceId?: string) => void
  onOccurrenceLocated?: (view: "map" | "list", occurrenceId: string) => void
}

export function ExplorePage({ embedded = false, allowDetails = true, onResearchAction, onOccurrenceLocated }: ExplorePageProps = {}) {
  const { occurrences } = useApp()
  const [viewMode, setViewMode] = useState<"map" | "list">(embedded ? "list" : "map")
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const selectedOccurrence = occurrences.find(
    (occurrence) => occurrence.id === selectedOccurrenceId,
  ) ?? null
  const onResearchActionRef = useRef(onResearchAction)
  onResearchActionRef.current = onResearchAction

  useEffect(() => {
    onResearchActionRef.current?.(viewMode === "map" ? "map-viewed" : "list-viewed")
  }, [viewMode])

  const handleDetailsOpenChange = (open: boolean) => {
    setDetailSheetOpen(open)
  }

  const handleViewDetails = (occurrence: Occurrence) => {
    if (!allowDetails) return
    setSelectedOccurrenceId(occurrence.id)
    handleDetailsOpenChange(true)
    onResearchAction?.("occurrence-opened", occurrence.id)
  }

  return (
    <div className={embedded ? "relative flex h-full min-h-0 flex-col" : "flex flex-col h-[calc(100dvh-3.5rem-4rem)] lg:h-[calc(100vh-4rem)]"}>
      {/* Header with toggle */}
      <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border/50 bg-card/50 flex-shrink-0">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-foreground">Explorar Ocorrências</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {occurrences.length} ocorrência{occurrences.length !== 1 ? "s" : ""} disponível{occurrences.length !== 1 ? "s" : ""}
            <span className="ml-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-amber-700 dark:text-amber-300">Exemplos demonstrativos</span>
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
            onOccurrenceSelect={(occurrence) => onOccurrenceLocated?.("map", occurrence.id)}
            allowDetails={allowDetails}
            legendInitiallyCollapsed={embedded}
          />
        ) : (
          <OccurrenceList
            onViewDetails={handleViewDetails}
            allowDetails={allowDetails}
            onOccurrenceSelect={(occurrence) => onOccurrenceLocated?.("list", occurrence.id)}
          />
        )}
      </div>

      {/* Detail Sheet */}
      <OccurrenceDetailSheet
        occurrence={selectedOccurrence}
        open={detailSheetOpen}
        onOpenChange={handleDetailsOpenChange}
        onResearchAction={onResearchAction}
        embedded={embedded}
      />
    </div>
  )
}
