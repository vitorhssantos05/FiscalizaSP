"use client"

import { useMemo, useState } from "react"
import { useApp } from "@/lib/app-context"
import type { Occurrence, OccurrenceStatus } from "@/lib/types"
import { categoryLabels, statusLabels, calculateDynamicPriority, priorityLabels } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import {
  Building2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ThumbsUp,
  TrendingUp,
  Users,
  BarChart3,
  Trash2,
  Lock,
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

const COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "hsl(var(--secondary))",
  accent: "hsl(var(--accent))",
  destructive: "hsl(var(--destructive))",
  success: "#22C55E",
  warning: "#F59E0B",
  blue: "#3B82F6",
  green: "#22C55E",
  yellow: "#FDE047",
  red: "#EF4444",
  orange: "#F97316",
  orangeLight: "#FB923C",
}

function OccurrenceStatusSelect({ occurrence, onChange, evaluationMode = false }: {
  evaluationMode?: boolean
  occurrence: Occurrence
  onChange: (id: string, status: OccurrenceStatus) => void
}) {
  return (
    <Select value={occurrence.status} onValueChange={(value) => onChange(occurrence.id, value as OccurrenceStatus)}>
      <SelectTrigger className={evaluationMode ? "min-h-11 w-[8.5rem] sm:w-[140px]" : "min-h-11 w-40 max-w-full"} aria-label={`Status de ${occurrence.title}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {([['resolvida', 'bg-green-500'], ['pendente', 'bg-orange-600'], ['em_analise', 'bg-blue-500']] as const).map(([status, color]) => (
            <SelectItem key={status} value={status}>
              <span className="flex items-center gap-2">
                {evaluationMode && <span className={`size-2 rounded-full ${color}`} aria-hidden="true" />}
                {statusLabels[status]}
              </span>
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

interface AdminPageProps {
  evaluationMode?: boolean
  onResearchStatusChange?: (occurrence: Occurrence, nextStatus: OccurrenceStatus) => void
}

export function AdminPage({ evaluationMode = false, onResearchStatusChange }: AdminPageProps = {}) {
  const { occurrences, updateOccurrenceStatus, getDynamicPriority, canDeleteOccurrence, deleteOccurrence } = useApp()
  const [occurrenceToDelete, setOccurrenceToDelete] = useState<Occurrence | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirmDelete = async () => {
    if (!occurrenceToDelete) return
    setIsDeleting(true)
    try {
      await deleteOccurrence(occurrenceToDelete.id)
      toast.success("Ocorrência excluída", { description: occurrenceToDelete.title })
      setOccurrenceToDelete(null)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir a ocorrência.")
    } finally {
      setIsDeleting(false)
    }
  }

  const hasDemonstrationData = useMemo(() => occurrences.some((occ) => occ.isDemonstration), [occurrences])

  // Panel indicators combine real Supabase records with the in-memory demonstration examples.
  const stats = useMemo(() => ({
    total: occurrences.length,
    pendentes: occurrences.filter((o) => o.status === "pendente").length,
    emAnalise: occurrences.filter((o) => o.status === "em_analise").length,
    resolvidas: occurrences.filter((o) => o.status === "resolvida").length,
  }), [occurrences])

  // Stats by category
  const categoryStats = useMemo(() => {
    const counts: Record<string, number> = {}
    occurrences.forEach((occ) => {
      counts[occ.category] = (counts[occ.category] || 0) + 1
    })
    return Object.entries(counts).map(([category, count]) => ({
      name: categoryLabels[category as keyof typeof categoryLabels] || category,
      value: count,
    }))
  }, [occurrences])

  // Stats by status (order: Resolvida, Pendente, Em análise)
  const statusStats = useMemo(() => {
    return [
      { name: "Resolvida", value: stats.resolvidas, color: COLORS.green },
      { name: "Pendente", value: stats.pendentes, color: COLORS.orange },
      { name: "Em análise", value: stats.emAnalise, color: COLORS.blue },
    ]
  }, [stats])

  // Stats by priority
  const priorityStats = useMemo(() => {
    const counts = { baixa: 0, media: 0, alta: 0 }
    occurrences.forEach((occ) => {
      const priority = calculateDynamicPriority(occ.priorityVotes)
      counts[priority]++
    })
    return [
      { name: "Baixa", value: counts.baixa, color: COLORS.yellow },
      { name: "Média", value: counts.media, color: COLORS.orangeLight },
      { name: "Alta", value: counts.alta, color: COLORS.red },
    ]
  }, [occurrences])

  // Total supports
  const totalSupports = useMemo(() => {
    return occurrences.reduce((sum, occ) => sum + occ.supports, 0)
  }, [occurrences])

  const handleStatusChange = async (occurrenceId: string, newStatus: OccurrenceStatus) => {
    const previousOccurrence = occurrences.find((occurrence) => occurrence.id === occurrenceId)
    try {
      await updateOccurrenceStatus(occurrenceId, newStatus)
    } catch {
      toast.error("Não foi possível atualizar o status. Tente novamente.")
      return
    }
    if (previousOccurrence) onResearchStatusChange?.(previousOccurrence, newStatus)
    toast.success("Status atualizado!", {
      description: `Ocorrência alterada para: ${statusLabels[newStatus]}`,
    })
  }

  return (
    <div className={evaluationMode ? "min-w-0 w-full" : "container mx-auto px-4 py-8"}>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-2">
          Painel demonstrativo com dados locais. As alterações valem somente nesta sessão e não concedem privilégios administrativos reais.
        </p>
        {hasDemonstrationData && (
          <Badge variant="outline" className="mt-3 border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300">
            Indicadores incluem dados demonstrativos
          </Badge>
        )}
      </div>

      {/* Stats Cards */}
      <div className={evaluationMode ? "mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 [&_[data-slot=card-content]]:p-3 lg:[&_[data-slot=card-content]]:p-6" : "grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"}>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-600/10 rounded-lg">
                <Clock className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pendentes}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.emAnalise}</p>
                <p className="text-sm text-muted-foreground">Em Análise</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.resolvidas}</p>
                <p className="text-sm text-muted-foreground">Resolvidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className={evaluationMode ? "mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3 [&_[data-slot=card-content]]:p-3 lg:[&_[data-slot=card-content]]:p-6" : "grid grid-cols-1 md:grid-cols-3 gap-4 mb-8"}>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ThumbsUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{totalSupports}</p>
                <p className="text-sm text-muted-foreground">Total de Apoios</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{priorityStats[2].value}</p>
                <p className="text-sm text-muted-foreground">Alta Prioridade</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent/10 rounded-lg">
                <Users className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {Math.round((stats.resolvidas / stats.total) * 100) || 0}%
                </p>
                <p className="text-sm text-muted-foreground">Taxa de Resolução</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* By Category */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Por Categoria
            </CardTitle>
            <CardDescription>Distribuição das ocorrências por tipo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryStats} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-muted-foreground" tick={{ fill: 'currentColor' }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={100}
                    className="text-muted-foreground"
                    tick={{ fill: 'currentColor', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--card-foreground))" }}
                    itemStyle={{ color: "hsl(var(--card-foreground))" }}
                    formatter={(value, name, props) => [`${props.payload.name}: ${value}`, null]}
                  />
                  <Bar dataKey="value" fill={COLORS.blue} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Status */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Por Status</CardTitle>
            <CardDescription>Status atual das ocorrências</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--card-foreground))" }}
                    itemStyle={{ color: "hsl(var(--card-foreground))" }}
                    formatter={(value, name, props) => [`${props.payload.name}: ${value}`, null]}
                  />
                  <Legend 
                    wrapperStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value) => <span className="text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* By Priority */}
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">Por Prioridade</CardTitle>
            <CardDescription>Prioridade dinâmica das ocorrências</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {priorityStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "8px",
                      color: "hsl(var(--card-foreground))",
                    }}
                    labelStyle={{ color: "hsl(var(--card-foreground))" }}
                    itemStyle={{ color: "hsl(var(--card-foreground))" }}
                    formatter={(value, name, props) => [`${props.payload.name}: ${value}`, null]}
                  />
                  <Legend 
                    wrapperStyle={{ color: "hsl(var(--foreground))" }}
                    formatter={(value) => <span className="text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Occurrences Table */}
      <Card className="min-w-0 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Gerenciar Ocorrências</CardTitle>
          <CardDescription>
            Visualize e atualize o status das ocorrências registradas
          </CardDescription>
        </CardHeader>
        <CardContent className={evaluationMode ? "flex min-w-0 flex-col gap-2 px-2 sm:px-6" : "px-3 sm:px-4 lg:px-6"}>
          {evaluationMode ? (
            <p className="text-sm text-muted-foreground lg:hidden">Deslize a tabela para visualizar mais informações.</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:hidden" aria-label="Gerenciar ocorrências">
              {occurrences.map((occ) => (
                <li key={occ.id} className="flex min-w-0 flex-col gap-2 rounded-lg border p-3">
                  <h3 className="break-words font-semibold leading-snug">{occ.title}</h3>
                  <p className="text-sm text-muted-foreground">{categoryLabels[occ.category]}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <OccurrenceStatusSelect occurrence={occ} onChange={handleStatusChange} />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
                    <span>{priorityLabels[getDynamicPriority(occ)]} · {occ.supports} apoios</span>
                    {canDeleteOccurrence(occ.id) && (
                      <Button variant="ghost" size="icon" onClick={() => setOccurrenceToDelete(occ)} aria-label={`Excluir ocorrência ${occ.title}`}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className={evaluationMode ? "min-w-0" : "hidden min-w-0 lg:block"}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40 sm:min-w-[200px]">Título</TableHead>
                  {(evaluationMode ? ["Status", "Categoria"] : ["Categoria", "Status"]).map(label => <TableHead key={label}>{label}</TableHead>) }
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Apoios</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occurrences.map((occ) => {
                  const dynamicPriority = getDynamicPriority(occ)
                  return (
                    <TableRow key={occ.id}>
                      <TableCell className="font-medium whitespace-normal">
                        <div className={evaluationMode ? "w-36 break-words leading-snug sm:w-auto sm:max-w-[200px]" : "max-w-[200px] truncate"} title={occ.title}>
                          {occ.title}
                        </div>
                      </TableCell>
                      {(evaluationMode ? ["Status", "Categoria"] : ["Categoria", "Status"]).map(label => (
                        <TableCell key={label}>
                          {label === "Status" ? <OccurrenceStatusSelect occurrence={occ} onChange={handleStatusChange} evaluationMode={evaluationMode} /> : <Badge variant="outline" className="whitespace-nowrap">{categoryLabels[occ.category]}</Badge>}
                        </TableCell>
                      ))}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            dynamicPriority === "alta"
                              ? "text-red-500 border-red-500/50"
                              : dynamicPriority === "media"
                              ? "text-orange-400 border-orange-400/50"
                              : "text-yellow-300 border-yellow-300/50"
                          }
                        >
                          {priorityLabels[dynamicPriority]}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(occ.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <ThumbsUp className="h-3 w-3 text-muted-foreground" />
                          {occ.supports}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {canDeleteOccurrence(occ.id) ? (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setOccurrenceToDelete(occ)}
                            aria-label={`Excluir ocorrência ${occ.title}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 whitespace-nowrap text-xs text-muted-foreground"
                            title="Ocorrências demonstrativas não podem ser excluídas"
                          >
                            <Lock className="h-3 w-3" aria-hidden="true" />
                            Demonstração
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={occurrenceToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setOccurrenceToDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir ocorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${occurrenceToDelete?.title ?? ""}" será removida permanentemente, junto com seus apoios, votos e comentários. Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              onClick={(event) => {
                event.preventDefault()
                void handleConfirmDelete()
              }}
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
