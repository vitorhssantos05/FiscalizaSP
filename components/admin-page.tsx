"use client"

import { useMemo } from "react"
import { useApp } from "@/lib/app-context"
import type { OccurrenceStatus } from "@/lib/types"
import { categoryLabels, statusLabels, calculateDynamicPriority, priorityLabels } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
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

export function AdminPage() {
  const { occurrences, updateOccurrenceStatus, stats, getDynamicPriority } = useApp()

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

  const handleStatusChange = (occurrenceId: string, newStatus: OccurrenceStatus) => {
    updateOccurrenceStatus(occurrenceId, newStatus)
    toast.success("Status atualizado!", {
      description: `Ocorrência alterada para: ${statusLabels[newStatus]}`,
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Painel Administrativo</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie e analise as ocorrências registradas na plataforma
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg">Gerenciar Ocorrências</CardTitle>
          <CardDescription>
            Visualize e atualize o status das ocorrências registradas
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0 sm:px-6">
          <div className="overflow-x-auto -mx-0 sm:mx-0">
            <div className="max-h-[400px] overflow-y-auto">
              <div className="min-w-[700px] px-4 sm:px-0">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Título</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="text-right">Apoios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {occurrences.map((occ) => {
                  const dynamicPriority = getDynamicPriority(occ)
                  return (
                    <TableRow key={occ.id}>
                      <TableCell className="font-medium">
                        <div className="max-w-[200px] truncate" title={occ.title}>
                          {occ.title}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {categoryLabels[occ.category]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={occ.status}
                          onValueChange={(value) =>
                            handleStatusChange(occ.id, value as OccurrenceStatus)
                          }
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="resolvida">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              Resolvida
                            </span>
                          </SelectItem>
                          <SelectItem value="pendente">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-orange-600" />
                              Pendente
                            </span>
                          </SelectItem>
                          <SelectItem value="em_analise">
                            <span className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-blue-500" />
                              Em análise
                            </span>
                          </SelectItem>
                        </SelectContent>
                        </Select>
                      </TableCell>
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
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
