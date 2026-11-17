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
import { cn } from "@/lib/utils"

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
  initialView?: "map" | "list"
  highlightListToggle?: boolean
  onViewChange?: (view: "map" | "list") => void
}

export function ExplorePage({ embedded = false, allowDetails = true, onResearchAction, onOccurrenceLocated, initialView, highlightListToggle = false, onViewChange }: ExplorePageProps = {}) {
  const { occurrences } = useApp()
  const [viewMode, setViewMode] = useState<"map" | "list">(initialView ?? (embedded ? "list" : "map"))
  const showListHint = highlightListToggle && viewMode === "map"
  const [selectedOccurrenceId, setSelectedOccurrenceId] = useState<string | null>(null)
  const [detailSheetOpen, setDetailSheetOpen] = useState(false)
  const selectedOccurrence = occurrences.find(
    (occurrence) => occurrence.id === selectedOccurrenceId,
  ) ?? null
  const onResearchActionRef = useRef(onResearchAction)
  onResearchActionRef.current = onResearchAction

  const onViewChangeRef = useRef(onViewChange)
  onViewChangeRef.current = onViewChange

  useEffect(() => {
    onResearchActionRef.current?.(viewMode === "map" ? "map-viewed" : "list-viewed")
    onViewChangeRef.current?.(viewMode)
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
    <div className={cn("relative flex min-w-0 flex-col", !embedded && viewMode === "map" && "h-[calc(100dvh-3.5rem-1px-4rem-env(safe-area-inset-bottom,0px))] lg:h-[calc(100dvh-4rem-1px)]")}>
      {/* Header with toggle */}
      <div className={cn("flex flex-wrap items-center justify-between gap-2 border-b border-border/50 bg-card/50 shrink-0", embedded ? "p-2" : "p-3 sm:p-4")}>
        <div className="min-w-0 flex-1">
          <h2 className={embedded ? "text-base font-semibold text-foreground" : "text-lg font-bold text-foreground sm:text-xl"}>{embedded ? "Ocorrências" : "Explorar Ocorrências"}</h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span>
              {occurrences.length} ocorrência{occurrences.length !== 1 ? "s" : ""} disponível{occurrences.length !== 1 ? "s" : ""}
            </span>
            {!embedded && <span className="text-pretty">Inclui exemplos demonstrativos</span>}
          </p>
        </div>
        <div className="relative shrink-0">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "map" | "list")}>
            <TabsList>
              <TabsTrigger value="map" className="gap-2">
                <Map className="h-4 w-4" />
                <span>Mapa</span>
              </TabsTrigger>
              <TabsTrigger
                value="list"
                aria-describedby={showListHint ? "list-toggle-hint" : undefined}
                className={cn("gap-2", showListHint && "ring-2 ring-destructive ring-offset-2 ring-offset-background")}
              >
                <List className="h-4 w-4" />
                <span>Lista</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {showListHint && (
            <p
              id="list-toggle-hint"
              className="pointer-events-none absolute right-0 top-full z-[1000] mt-2 whitespace-nowrap rounded-md bg-destructive px-2 py-1 text-xs font-medium text-destructive-foreground shadow-md"
            >
              Clique aqui para ver a lista
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div hidden={embedded && detailSheetOpen} className={cn("min-w-0", viewMode === "map" && (embedded ? "h-[clamp(18rem,55dvh,36rem)]" : "min-h-0 flex-1"))}>
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
            compact={embedded}
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
