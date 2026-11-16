"use client"

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip } from "@/components/ui/chart"

const taskLabels: Record<string, string[]> = {
  "find-occurrence": ["Localizar", "ocorrência"],
  "interact-with-occurrence": ["Consultar", "e interagir"],
  "register-test": ["Registrar", "ocorrência"],
  "admin-panel": ["Alterar", "status"],
}

const likertLabels: Record<string, string[]> = {
  "interface-ease": ["Q1 — Facilidade", "de uso"],
  "intuitive-navigation": ["Q2 — Navegação"],
  "find-functionality": ["Q3 — Localização"],
  "report-process": ["Q4 — Registro"],
  "organized-info": ["Q5 — Organização"],
  "interaction-tools": ["Q6 — Interações"],
  "admin-charts": ["Q7 — Indicadores", "administrativos"],
  "urban-impact": ["Q8 — Utilidade"],
  performance: ["Q9 — Desempenho"],
  "future-use": ["Q10 — Intenção", "de uso"],
}

function AxisLabel({ x = 0, y = 0, payload, labels, horizontal = false }: {
  x?: number
  y?: number
  payload?: { value: string }
  labels: Record<string, string[]>
  horizontal?: boolean
}) {
  const lines = labels[payload?.value ?? ""] ?? [payload?.value ?? ""]
  return (
    <text x={x} y={y} textAnchor={horizontal ? "end" : "middle"} fill="var(--muted-foreground)" fontSize={14}>
      {lines.map((line, index) => (
        <tspan key={line} x={x} dy={index === 0 ? (horizontal ? 5 - (lines.length - 1) * 9 : 18) : 18}>{line}</tspan>
      ))}
    </text>
  )
}

function ResultTooltip({ active, payload, formatValue }: {
  active?: boolean
  payload?: { payload?: { fullLabel: string; value: number | null } }[]
  formatValue: (value: number) => string
}) {
  const item = payload?.[0]?.payload
  if (!active || !item || item.value === null) return null
  return (
    <div className="max-w-60 rounded-lg border border-border bg-popover p-3 text-sm text-popover-foreground shadow-md">
      <p className="font-medium leading-relaxed">{item.fullLabel}</p>
      <p className="tabular-nums">{formatValue(item.value)}</p>
    </div>
  )
}

export function TaskDurationChart({ tasks, formatDuration }: {
  tasks: { taskKey: string; title: string; averageDurationMs: number | null }[]
  formatDuration: (value: number | null) => string
}) {
  const data = tasks.map((task) => ({
    key: task.taskKey,
    fullLabel: task.title,
    value: task.averageDurationMs !== null && Number.isFinite(task.averageDurationMs) && task.averageDurationMs >= 0
      ? task.averageDurationMs / 1000
      : null,
  }))
  const hasData = data.some((item) => item.value !== null)

  return (
    <figure className="mb-6 min-w-0" aria-label="Tempo médio de execução por tarefa">
      <figcaption className="mb-4">
        <h3 className="font-semibold text-balance">Tempo médio de execução por tarefa</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">Tempo médio registrado nas quatro tarefas práticas concluídas.</p>
      </figcaption>
      {hasData ? (
        <>
          <p className="mb-2 text-sm text-muted-foreground">Duração média (segundos)</p>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Gráfico das tarefas; role horizontalmente em telas pequenas">
            <ChartContainer config={{ value: { label: "Tempo médio", color: "var(--chart-1)" } }} className="h-72 min-w-[420px] w-full aspect-auto text-sm">
              <BarChart accessibilityLayer data={data} margin={{ top: 28, right: 16, bottom: 8, left: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="key" tick={<AxisLabel labels={taskLabels} />} interval={0} height={52} tickLine={false} axisLine={false} />
                <YAxis domain={[0, "auto"]} width={52} tickLine={false} axisLine={false} tick={{ fontSize: 14 }} />
                <ChartTooltip content={<ResultTooltip formatValue={(value) => formatDuration(value * 1000)} />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} maxBarSize={72} isAnimationActive={false}>
                  <LabelList dataKey="value" position="top" offset={10} fill="var(--foreground)" fontSize={14} formatter={(value: number | null) => value === null ? "" : `${Number(value.toFixed(1))} s`} />
                </Bar>
              </BarChart>
            </ChartContainer>
          </div>
          {data.some((item) => item.value === null) && <p className="mt-2 text-sm text-muted-foreground">Tarefas sem duração válida permanecem sem barra.</p>}
        </>
      ) : <p className="py-6 text-sm text-muted-foreground">Nenhuma duração válida disponível para exibir.</p>}
    </figure>
  )
}

export function LikertAveragesChart({ statements }: {
  statements: { questionKey: string; text: string; average: number | null }[]
}) {
  const data = statements.map((item) => ({
    key: item.questionKey,
    fullLabel: item.text,
    value: item.average !== null && Number.isFinite(item.average) && item.average >= 1 && item.average <= 5 ? item.average : null,
  }))
  const hasData = data.some((item) => item.value !== null)

  return (
    <figure className="mb-6 min-w-0" aria-label="Média das avaliações por afirmação">
      <figcaption className="mb-4">
        <h3 className="font-semibold text-balance">Média das avaliações por afirmação</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">Médias das dez afirmações do questionário, em escala de 1 a 5.</p>
      </figcaption>
      {hasData ? (
        <>
          <ChartContainer config={{ value: { label: "Média", color: "var(--chart-1)" } }} className="h-[560px] w-full aspect-auto text-sm">
            <BarChart accessibilityLayer layout="vertical" data={data} margin={{ top: 4, right: 44, bottom: 8, left: 0 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} allowDataOverflow tickLine={false} axisLine={false} tick={{ fontSize: 14 }} />
              <YAxis type="category" dataKey="key" width={140} tick={<AxisLabel labels={likertLabels} horizontal />} interval={0} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ResultTooltip formatValue={(value) => value.toFixed(2)} />} />
              <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} maxBarSize={24} isAnimationActive={false}>
                <LabelList dataKey="value" position="right" offset={8} fill="var(--foreground)" fontSize={14} formatter={(value: number | null) => value === null ? "" : value.toFixed(2)} />
              </Bar>
            </BarChart>
          </ChartContainer>
          {data.some((item) => item.value === null) && <p className="mt-2 text-sm text-muted-foreground">Afirmações sem respostas válidas permanecem sem barra.</p>}
        </>
      ) : <p className="py-6 text-sm text-muted-foreground">Nenhuma resposta válida disponível para exibir.</p>}
    </figure>
  )
}
