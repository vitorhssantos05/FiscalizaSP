"use client"

import { useEffect, useRef } from "react"
import useSWR, { SWRConfig } from "swr"
import { ArrowRight, Check, Clock3, Loader2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { evaluationTaskCatalog } from "@/lib/evaluation-catalog"
import { formatEvaluationDuration, type EvaluationResult } from "@/lib/evaluation-results"
import { fetchEvaluationResult } from "@/lib/supabase/anonymous-participant"
import { EvaluationShareCard } from "@/components/evaluation-share-card"

function TimeComparison({ result, onRetry }: { result: EvaluationResult; onRetry: () => void }) {
  const comparison = result.comparison
  const mean = comparison?.averageTotalDurationMs ?? null
  const maximum = Math.max(result.totalDurationMs ?? 0, mean ?? 0, 1)
  return (
    <Card>
      <CardHeader>
        <CardTitle><h2>Seu tempo comparado à média</h2></CardTitle>
        <CardDescription>Uma referência de tempo, nunca uma medida de inteligência, capacidade ou qualidade.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-5">
          {[{ label: "Seu tempo", value: result.totalDurationMs, color: "bg-primary" }, { label: "Média dos participantes", value: mean, color: "bg-muted-foreground" }].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col gap-2">
              <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm"><span>{label}</span><strong className="tabular-nums">{formatEvaluationDuration(value)}</strong></div>
              {value !== null && <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color}`} style={{ width: `${value / maximum * 100}%` }} /></div>}
            </div>
          ))}
          <div className="text-sm leading-relaxed text-muted-foreground">
            {!comparison ? (
              <><p>A comparação está indisponível no momento. Seu resultado continua salvo.</p><Button type="button" variant="link" onClick={onRetry}>Atualizar comparação</Button></>
            ) : comparison.comparableCount === 0 ? (
              <p>Ainda não há avaliações concluídas com tempo registrado para calcular a média.</p>
            ) : (
              <p>{comparison.comparableCount === 1
                ? "Média preliminar: apenas uma avaliação concluída tem tempo registrado. A referência ficará mais representativa com novas participações."
                : `Média de ${comparison.comparableCount} avaliações concluídas com tempo registrado, incluindo a sua quando disponível.`} Atualizada automaticamente a cada minuto.</p>
            )}
            {result.totalDurationMs === null && <p className="mt-2">Seu tempo total não foi registrado; por isso, não é possível compará-lo à média.</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CompletionContent({ onExplore }: { onExplore: () => void }) {
  const { data, error, isLoading, mutate } = useSWR("completed-evaluation-result", fetchEvaluationResult, {
    refreshInterval: 60_000,
    revalidateOnFocus: true,
    shouldRetryOnError: false,
  })
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (data) heading.current?.focus({ preventScroll: true })
  }, [Boolean(data)])

  const tasks = evaluationTaskCatalog.map((task) => ({ ...task, record: data?.tasks.find((row) => row.taskKey === task.id) }))
  const completedTasks = tasks.filter((task) => task.record?.status === "completed").length

  return (
    <section className="container mx-auto max-w-3xl px-4 py-8 font-sans md:py-12" aria-labelledby="completion-title">
      <div className="flex flex-col gap-8">
        {data ? (
          <>
            <header className="flex flex-col gap-4">
              <p className="flex items-center gap-2 text-sm font-medium text-primary"><ShieldCheck aria-hidden="true" className="size-4" />Avaliação salva com sucesso</p>
              <h1 ref={heading} tabIndex={-1} id="completion-title" className="text-balance text-3xl font-bold tracking-tight outline-none md:text-4xl">Missão FiscalizaSP concluída!</h1>
              <p className="text-pretty leading-relaxed text-muted-foreground">Você explorou a plataforma e contribuiu para uma pesquisa acadêmica sobre participação cidadã. Veja como foi sua experiência!</p>
            </header>
            <Card>
              <CardHeader><CardTitle><h2>Seu percurso cidadão</h2></CardTitle><CardDescription>Resultados registrados na avaliação que você acabou de concluir.</CardDescription></CardHeader>
              <CardContent>
                <div className="flex flex-col gap-6">
                  <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Clock3 aria-hidden="true" className="size-4" />Tempo total da avaliação</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{formatEvaluationDuration(data.totalDurationMs)}</dd></div>
                    <div><dt className="flex items-center gap-2 text-sm text-muted-foreground"><Check aria-hidden="true" className="size-4" />Tarefas concluídas</dt><dd className="mt-2 text-3xl font-semibold tabular-nums">{completedTasks}/4</dd></div>
                  </dl>
                  <ol className="flex flex-col gap-3">
                    {tasks.map((task, index) => (
                      <li key={task.id} className="rounded-lg border p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1"><h3 className="text-sm font-medium leading-relaxed">{index + 1}. {task.title}</h3><p className="mt-1 text-sm text-muted-foreground">{task.record?.status === "completed" ? "Concluída" : task.record?.status === "skipped" ? "Pulada" : task.record?.status === "interrupted" ? "Interrompida" : "Não disponível"}</p></div>
                          <span className="text-sm font-medium tabular-nums">{formatEvaluationDuration(task.record?.durationMs ?? null)}</span>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <p className="text-sm leading-relaxed text-muted-foreground">Estes tempos já estão encerrados. Permanecer nesta tela ou compartilhar o convite não altera as métricas da avaliação.</p>
                </div>
              </CardContent>
            </Card>
            <TimeComparison result={data} onRetry={() => void mutate()} />
            {error && <p role="status" className="text-sm text-muted-foreground">Não foi possível atualizar a referência agora. Exibindo a última consulta bem-sucedida.</p>}
            <EvaluationShareCard result={data} completedTasks={completedTasks} />
          </>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle><h1 id="completion-title">{isLoading ? "Consultando seus resultados" : "Resultados indisponíveis"}</h1></CardTitle>
              <CardDescription>{isLoading ? "Conferindo os dados salvos da sua sessão." : "Não foi possível recuperar os resultados desta sessão. Se o envio já foi confirmado, não é necessário enviar novamente."}</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? <Loader2 aria-label="Carregando" className="size-5 animate-spin text-primary" /> : <Button type="button" variant="outline" onClick={() => void mutate()}>Tentar consultar novamente</Button>}
            </CardContent>
          </Card>
        )}
        <div className="border-t pt-6">
          <Button type="button" size="lg" className="h-auto min-h-12 w-full whitespace-normal py-3" onClick={onExplore}>Continuar a explorar a plataforma<ArrowRight data-icon="inline-end" /></Button>
        </div>
      </div>
    </section>
  )
}

export function EvaluationCompletion({ onExplore }: { onExplore: () => void }) {
  return <SWRConfig value={{ provider: () => new Map() }}><CompletionContent onExplore={onExplore} /></SWRConfig>
}
