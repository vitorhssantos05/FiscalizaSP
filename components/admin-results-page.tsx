"use client"

import { useEffect, useState } from "react"
import { Download, RefreshCw } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Results = {
  totals: {
    participants: number
    completed: number
    inProgress: number
    abandoned: number
    completionRate: number | null
    averageTotalDurationMs: number | null
    averagePracticalDurationMs: number | null
    averageQuestionnaireDurationMs: number | null
    overallLikertAverage: number | null
  }
  taskSummary: { taskKey: string; title: string; completed: number; skipped: number; completionRate: number | null; averageDurationMs: number | null }[]
  likert: { questionKey: string; text: string; responses: number; average: number | null; distribution: number[] }[]
  profile: { key: string; title: string; distribution: { label: string; count: number }[] }[]
  openAnswers: { participant_id: string; question_key: string; question_title: string; answer: unknown }[]
}

function formatDuration(value: number | null) {
  if (value === null) return "—"
  const seconds = Math.round(value / 1000)
  return seconds >= 60 ? `${Math.floor(seconds / 60)} min ${seconds % 60} s` : `${seconds} s`
}

function formatPercent(value: number | null) {
  return value === null ? "—" : `${(value * 100).toFixed(1)}%`
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`
}

export function AdminResultsPage() {
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadResults = async () => {
    setLoading(true)
    setError(null)
    const response = await fetch("/api/admin/evaluation-results", { cache: "no-store" }).catch(() => null)
    const payload = response ? await response.json().catch(() => ({})) : {}
    if (!response?.ok) {
      setError(payload.error ?? "Falha de comunicação com o servidor ao consultar os resultados.")
    } else {
      setResults(payload)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadResults()
  }, [])

  const exportCsv = () => {
    if (!results) return
    const { totals } = results
    const rows: unknown[][] = [
      ["Seção", "Métrica", "Valor"],
      ["Geral", "Participantes", totals.participants],
      ["Geral", "Concluídas", totals.completed],
      ["Geral", "Em andamento", totals.inProgress],
      ["Geral", "Abandonos", totals.abandoned],
      ["Geral", "Taxa de conclusão", formatPercent(totals.completionRate)],
      ["Tempo", "Tempo médio total", formatDuration(totals.averageTotalDurationMs)],
      ["Tempo", "Tempo médio das tarefas práticas", formatDuration(totals.averagePracticalDurationMs)],
      ["Tempo", "Tempo médio do questionário", formatDuration(totals.averageQuestionnaireDurationMs)],
      ...results.taskSummary.flatMap((task) => [
        ["Tarefa", `${task.title} - concluídas`, task.completed],
        ["Tarefa", `${task.title} - puladas`, task.skipped],
        ["Tarefa", `${task.title} - taxa de conclusão`, formatPercent(task.completionRate)],
        ["Tarefa", `${task.title} - tempo médio`, formatDuration(task.averageDurationMs)],
      ]),
      ...results.profile.flatMap((question) => question.distribution.map((item) => ["Perfil", `${question.title} - ${item.label}`, item.count])),
      ["Likert", "Média geral", totals.overallLikertAverage?.toFixed(2) ?? ""],
      ...results.likert.map((item) => ["Likert", item.text, `${item.average?.toFixed(2) ?? ""} (1-5: ${item.distribution.join("/")})`]),
      ...results.openAnswers.map((answer) => ["Resposta aberta", answer.question_title, answer.answer]),
    ]
    const blob = new Blob(["\uFEFF" + rows.map((row) => row.map(csvValue).join(",")).join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "resultados-avaliacao.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (!results) {
    return (
      <section className="container mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader>
            <CardTitle>Resultados da Pesquisa</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando resultados...</p>
            ) : (
              <>
                <Alert variant="destructive">
                  <AlertTitle>Não foi possível carregar</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
                <Button onClick={() => void loadResults()}>Tentar novamente</Button>
              </>
            )}
          </CardContent>
        </Card>
      </section>
    )
  }

  const { totals } = results
  const summaryCards: [string, string | number][] = [
    ["Participantes", totals.participants],
    ["Concluídas", totals.completed],
    ["Em andamento", totals.inProgress],
    ["Abandonos", totals.abandoned],
    ["Taxa de conclusão", formatPercent(totals.completionRate)],
    ["Tempo médio total", formatDuration(totals.averageTotalDurationMs)],
    ["Tempo médio das tarefas", formatDuration(totals.averagePracticalDurationMs)],
    ["Tempo médio do questionário", formatDuration(totals.averageQuestionnaireDurationMs)],
  ]

  return (
    <section className="container mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-balance">Resultados da Pesquisa</h1>
          <p className="text-sm text-muted-foreground">Indicadores calculados a partir das avaliações concluídas registradas no banco de dados.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => void loadResults()} disabled={loading}>
            <RefreshCw className="size-4" aria-hidden="true" />
            Atualizar
          </Button>
          <Button onClick={exportCsv} disabled={totals.participants === 0}>
            <Download className="size-4" aria-hidden="true" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {totals.participants === 0 ? (
        <Alert>
          <AlertTitle>Nenhuma avaliação registrada</AlertTitle>
          <AlertDescription>Os resultados aparecerão aqui quando participantes iniciarem e concluírem a avaliação.</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {summaryCards.map(([label, value]) => (
              <Card key={label}>
                <CardContent className="pt-6">
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Tarefas práticas</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tarefa</TableHead>
                    <TableHead>Concluídas</TableHead>
                    <TableHead>Puladas</TableHead>
                    <TableHead>Taxa de conclusão</TableHead>
                    <TableHead>Tempo médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.taskSummary.map((task) => (
                    <TableRow key={task.taskKey}>
                      <TableCell className="font-medium">{task.title}</TableCell>
                      <TableCell>{task.completed}</TableCell>
                      <TableCell>{task.skipped}</TableCell>
                      <TableCell>{formatPercent(task.completionRate)}</TableCell>
                      <TableCell>{formatDuration(task.averageDurationMs)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escala Likert</CardTitle>
              <p className="text-sm text-muted-foreground">
                Média geral: <span className="font-semibold text-foreground">{totals.overallLikertAverage?.toFixed(2) ?? "—"}</span> (1 = discordo totalmente, 5 = concordo totalmente)
              </p>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Afirmação</TableHead>
                    <TableHead>Média</TableHead>
                    <TableHead>Distribuição (1 · 2 · 3 · 4 · 5)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.likert.map((item) => (
                    <TableRow key={item.questionKey}>
                      <TableCell className="whitespace-normal">{item.text}</TableCell>
                      <TableCell>{item.average?.toFixed(2) ?? "—"}</TableCell>
                      <TableCell>{item.distribution.join(" · ")}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {results.profile.map((question) => (
              <Card key={question.key}>
                <CardHeader>
                  <CardTitle className="text-base">{question.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="flex flex-col gap-2">
                    {question.distribution.map((item) => (
                      <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                        <span>{item.label}</span>
                        <span className="font-semibold">{item.count}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Respostas abertas</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {results.openAnswers.length ? (
                results.openAnswers.map((answer, index) => (
                  <div key={`${answer.participant_id}-${answer.question_key}-${index}`} className="rounded-md border p-3">
                    <p className="text-sm font-medium">{answer.question_title}</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{String(answer.answer ?? "")}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma resposta aberta registrada.</p>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </section>
  )
}
