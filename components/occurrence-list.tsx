"use client"

import { useState, useMemo } from "react"
import { useApp } from "@/lib/app-context"
import type { Occurrence, OccurrenceCategory, OccurrenceStatus } from "@/lib/types"
import { categoryLabels, statusLabels, calculateDynamicPriority } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Search,
  ThumbsUp,
  Users,
  MapPin,
  Calendar,
  Eye,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  ArrowUpDown,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { OccurrenceImage } from "@/components/occurrence-image"
import { OccurrenceTitlePreview } from "@/components/occurrence-title-preview"
import { cn } from "@/lib/utils"

interface OccurrenceListProps {
  onViewDetails: (occurrence: Occurrence) => void
  allowDetails?: boolean
  compact?: boolean
  onOccurrenceSelect?: (occurrence: Occurrence) => void
}

type SortOption = "relevance" | "priority" | "supports" | "recent"

export function OccurrenceList({ onViewDetails, allowDetails = true, compact = false, onOccurrenceSelect }: OccurrenceListProps) {
  const titlePreview = compact && !allowDetails
  const { occurrences, getDynamicPriority } = useApp()
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<OccurrenceCategory | "all">("all")
  const [statusFilter, setStatusFilter] = useState<OccurrenceStatus | "all">("all")
  const [sortBy, setSortBy] = useState<SortOption>("relevance")
  const [isLoading] = useState(false)

  const filteredAndSortedOccurrences = useMemo(() => {
    let filtered = occurrences.filter((occ) => {
      const matchesSearch =
        search === "" ||
        occ.title.toLowerCase().includes(search.toLowerCase()) ||
        occ.description.toLowerCase().includes(search.toLowerCase()) ||
        occ.neighborhood.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        categoryFilter === "all" || occ.category === categoryFilter

      const matchesStatus =
        statusFilter === "all" || occ.status === statusFilter

      return matchesSearch && matchesCategory && matchesStatus
    })

    // Sort
    filtered.sort((a, b) => {
      const priorityA = getDynamicPriority(a)
      const priorityB = getDynamicPriority(b)
      const priorityOrder = { alta: 3, media: 2, baixa: 1 }

      switch (sortBy) {
        case "priority":
          return priorityOrder[priorityB] - priorityOrder[priorityA]
        case "supports":
          return b.supports - a.supports
        case "recent":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case "relevance":
        default:
          // Relevance = priority * supports weight
          const scoreA = priorityOrder[priorityA] * Math.log(a.supports + 1) + priorityOrder[priorityA]
          const scoreB = priorityOrder[priorityB] * Math.log(b.supports + 1) + priorityOrder[priorityB]
          return scoreB - scoreA
      }
    })

    return filtered
  }, [occurrences, search, categoryFilter, statusFilter, sortBy, getDynamicPriority])

  const getPriorityBadge = (occurrence: Occurrence) => {
    const priority = getDynamicPriority(occurrence)
    switch (priority) {
      case "alta":
        return (
          <Badge variant="destructive" className="text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Alta
          </Badge>
        )
      case "media":
        return (
          <Badge className="bg-orange-400 hover:bg-orange-500 text-white text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Média
          </Badge>
        )
      case "baixa":
        return (
          <Badge className="bg-yellow-300 hover:bg-yellow-400 text-black text-xs">
            Baixa
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: OccurrenceStatus) => {
    switch (status) {
      case "resolvida":
        return (
          <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {statusLabels[status]}
          </Badge>
        )
      case "em_analise":
        return (
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white text-xs">
            <Clock className="h-3 w-3 mr-1" />
            {statusLabels[status]}
          </Badge>
        )
      case "pendente":
        return (
          <Badge className="bg-orange-500 hover:bg-orange-600 text-white text-xs">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {statusLabels[status]}
          </Badge>
        )
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Skeleton className="h-24 w-24 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col">
      {/* Filters */}
      <div className={cn("grid min-w-0 grid-cols-2 gap-2 border-b border-border/50 bg-card/50 sm:grid-cols-4 [&>div]:min-w-0", compact ? "p-2" : "p-3 sm:p-4")}>
        <div className="col-span-2 sm:col-span-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Buscar ocorrências por título, descrição ou bairro"
            placeholder="Buscar por nome ou bairro…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        </div>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as OccurrenceCategory | "all")}>
            <SelectTrigger aria-label="Filtrar por categoria" className="min-h-11 w-full min-w-0 [&>span]:truncate">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {Object.entries(categoryLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as OccurrenceStatus | "all")}>
            <SelectTrigger aria-label="Filtrar por status" className="min-h-11 w-full min-w-0 [&>span]:truncate">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="resolvida">Resolvida</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="em_analise">Em análise</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
            <SelectTrigger aria-label="Ordenar ocorrências" className="min-h-11 w-full min-w-0 [&>span]:truncate">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Ordenar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevância</SelectItem>
              <SelectItem value="priority">Prioridade</SelectItem>
              <SelectItem value="supports">Mais apoios</SelectItem>
              <SelectItem value="recent">Mais recentes</SelectItem>
            </SelectContent>
          </Select>
        <p className="self-center text-sm text-muted-foreground" aria-live="polite">
          {filteredAndSortedOccurrences.length} encontrada{filteredAndSortedOccurrences.length !== 1 ? "s" : ""}
        </p>
        {titlePreview && <p className="col-span-2 text-sm leading-snug text-muted-foreground sm:col-span-4">Toque e segure uma ocorrência para ler seu nome completo.</p>}
      </div>

      {/* List */}
      <div className={cn("flex min-w-0 flex-col", compact ? "gap-2 p-2" : "gap-3 p-3 sm:p-4")}>
        {filteredAndSortedOccurrences.length === 0 ? (
          <div className="text-center py-12">
            <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground">Nenhuma ocorrência encontrada</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Tente ajustar os filtros ou termos de busca
            </p>
          </div>
        ) : (
          filteredAndSortedOccurrences.map((occurrence) => {
            const dynamicPriority = getDynamicPriority(occurrence)
            const isHighPriority = dynamicPriority === "alta" && occurrence.supports > 50
            
            const card = (
              <Card
                key={occurrence.id}
                role={!titlePreview && !allowDetails && onOccurrenceSelect ? "button" : undefined}
                tabIndex={!titlePreview && !allowDetails && onOccurrenceSelect ? 0 : undefined}
                aria-label={!titlePreview && !allowDetails && onOccurrenceSelect ? `Localizar ${occurrence.title} na lista` : undefined}
                className={`group min-w-0 gap-0 py-0 border-border/50 transition-all duration-300 ${allowDetails ? "cursor-pointer hover:shadow-lg" : onOccurrenceSelect ? "cursor-pointer hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" : ""} ${
                  isHighPriority ? "ring-2 ring-red-500/20 bg-red-500/5" : ""
                }`}
                onClick={titlePreview ? undefined : () => allowDetails ? onViewDetails(occurrence) : onOccurrenceSelect?.(occurrence)}
                onKeyDown={!titlePreview && !allowDetails && onOccurrenceSelect ? (event) => {
                  if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return
                  event.preventDefault()
                  onOccurrenceSelect(occurrence)
                } : undefined}
              >
                <CardContent className={compact ? "p-3" : "p-3 sm:p-4"}>
                  <div className="flex gap-3">
                    <div className={cn("shrink-0 overflow-hidden rounded-md bg-muted", compact ? "size-12 sm:size-16" : "size-16 sm:size-20")}>
                      <OccurrenceImage
                        key={`${occurrence.id}-${occurrence.imageUrl ?? "sem-imagem"}`}
                        src={occurrence.imageUrl}
                        alt={`Imagem da ocorrência: ${occurrence.title}`}
                        className="h-full w-full object-cover"
                        fallbackClassName="flex h-full w-full items-center justify-center text-muted-foreground [&>svg]:size-8"
                      />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="break-words font-semibold leading-snug text-foreground group-hover:text-primary transition-colors">
                          {occurrence.title}
                        </h3>
                        {isHighPriority && (
                          <Badge variant="destructive" className="flex-shrink-0 text-xs animate-pulse">
                            Urgente
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-1 flex flex-wrap items-center gap-1">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[occurrence.category]}
                        </Badge>
                        {getStatusBadge(occurrence.status)}
                        {getPriorityBadge(occurrence)}
                        {occurrence.isDemonstration && (
                          <Badge variant="secondary" className="text-xs">
                            Demonstração
                          </Badge>
                        )}
                      </div>
                      
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {occurrence.neighborhood}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDistanceToNow(new Date(occurrence.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                          <ThumbsUp className="h-4 w-4 text-primary" />
                          {occurrence.supports} apoio{occurrence.supports !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {occurrence.confirmations} {occurrence.confirmations === 1 ? "confirmação" : "confirmações"}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action */}
                    {allowDetails && (
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Ver detalhes de ${occurrence.title}`}
                        className="flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation()
                          onViewDetails(occurrence)
                        }}
                      >
                        <Eye className="h-5 w-5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
            return titlePreview ? (
              <OccurrenceTitlePreview key={occurrence.id} title={occurrence.title} onSelect={() => onOccurrenceSelect?.(occurrence)}>
                {card}
              </OccurrenceTitlePreview>
            ) : card
          })
        )}
      </div>
    </div>
  )
}
