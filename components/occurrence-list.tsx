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

interface OccurrenceListProps {
  onViewDetails: (occurrence: Occurrence) => void
}

type SortOption = "relevance" | "priority" | "supports" | "recent"

export function OccurrenceList({ onViewDetails }: OccurrenceListProps) {
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
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="p-4 border-b border-border/50 bg-card/50 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, descrição ou bairro..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as OccurrenceCategory | "all")}>
            <SelectTrigger className="w-[160px]">
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
            <SelectTrigger className="w-[150px]">
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
            <SelectTrigger className="w-[150px]">
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
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredAndSortedOccurrences.length} ocorrência{filteredAndSortedOccurrences.length !== 1 ? "s" : ""} encontrada{filteredAndSortedOccurrences.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            
            return (
              <Card
                key={occurrence.id}
                className={`group hover:shadow-lg transition-all duration-300 cursor-pointer border-border/50 ${
                  isHighPriority ? "ring-2 ring-red-500/20 bg-red-500/5" : ""
                }`}
                onClick={() => onViewDetails(occurrence)}
              >
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    {/* Image placeholder */}
                    <div className="h-24 w-24 flex-shrink-0 rounded-md bg-muted flex items-center justify-center overflow-hidden">
                      <MapPin className="h-8 w-8 text-muted-foreground" />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                          {occurrence.title}
                        </h3>
                        {isHighPriority && (
                          <Badge variant="destructive" className="flex-shrink-0 text-xs animate-pulse">
                            Urgente
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {categoryLabels[occurrence.category]}
                        </Badge>
                        {getStatusBadge(occurrence.status)}
                        {getPriorityBadge(occurrence)}
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-muted-foreground">
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
                      
                      <div className="flex items-center gap-4 mt-3">
                        <span className="flex items-center gap-1 text-sm font-medium text-foreground">
                          <ThumbsUp className="h-4 w-4 text-primary" />
                          {occurrence.supports} apoio{occurrence.supports !== 1 ? "s" : ""}
                        </span>
                        <span className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Users className="h-4 w-4" />
                          {occurrence.confirmations} confirmação{occurrence.confirmations !== 1 ? "ões" : ""}
                        </span>
                      </div>
                    </div>
                    
                    {/* Action */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        onViewDetails(occurrence)
                      }}
                    >
                      <Eye className="h-5 w-5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
