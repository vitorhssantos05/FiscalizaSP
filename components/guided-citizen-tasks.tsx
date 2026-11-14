"use client"

import { useEffect, useState } from "react"
import { AlertCircle, ArrowRight, Check, ClipboardList, LockKeyhole, ShieldAlert, SkipForward, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { AdminEvaluationStage, type AdminEvaluationEvent } from "@/components/admin-evaluation-stage"
import { ExplorePage } from "@/components/explore-page"
import { RegisterPage } from "@/components/register-page"
import type { ResearchAction } from "@/components/occurrence-detail-sheet"
import { createTaskMetrics, type EvaluationTaskMetric } from "@/lib/evaluation-metrics"

type CitizenTaskId = "find-occurrence" | "interact-with-occurrence" | "register-test"
type TaskEvent = Exclude<ResearchAction, "interaction-error"> | "occurrence-added" | AdminEvaluationEvent
type TaskStatus = "not-started" | "in-progress" | "completed" | "skipped" | "abandoned"
type TaskDefinition =
  | { id: Exclude<CitizenTaskId, "register-test">; title: string; instruction: string; view: "explore" }
  | { id: "register-test"; title: string; instruction: string; view: "register" }
  | { id: "admin-panel"; title: string; instruction: string; view: "admin" }

type TaskAttempt = {
  status: TaskStatus
  startedAt: number | null
  completedAt: number | null
  skippedAt: number | null
  abandonedAt: number | null
  errorCount: number
  result: string | null
  events: TaskEvent[]
  mapOccurrenceId: string | null
  listOccurrenceId: string | null
  targetOccurrenceId: string | null
}

export type GuidedTaskSummary = {
  tasks: EvaluationTaskMetric[]
}

const taskDefinitions: TaskDefinition[] = [
  {
    id: "find-occurrence",
    title: "Localizar uma ocorrência",
    instruction: "Encontre a mesma ocorrência na lista e no mapa. Nesta etapa, “Ver detalhes” fica indisponível; a consulta será feita na próxima tarefa.",
    view: "explore",
  },
  {
    id: "interact-with-occurrence",
    title: "Consultar detalhes e interagir",
    instruction: "Abra uma ocorrência e, sem fechar os detalhes, consulte as informações, publique um comentário demonstrativo, registre um apoio e vote na prioridade.",
    view: "explore",
  },
  {
    id: "register-test",
    title: "Registrar uma ocorrência demonstrativa",
    instruction: "Informe título, descrição e categoria e selecione um ponto fictício no mapa. A imagem é opcional. A busca de endereço e o GPS não são usados nesta avaliação.",
    view: "register",
  },
  {
    id: "admin-panel",
    title: "Alterar o status de uma ocorrência",
    instruction: "Selecione no painel demonstrativo uma ocorrência Pendente e altere o status para Resolvida. A tarefa será concluída somente quando a mudança aparecer nos dados isolados.",
    view: "admin",
  },
]

function createInitialAttempts(): TaskAttempt[] {
  const startedAt = Date.now()
  return taskDefinitions.map((_, index) => ({
    status: index === 0 ? "in-progress" : "not-started",
    startedAt: index === 0 ? startedAt : null,
    completedAt: null,
    skippedAt: null,
    abandonedAt: null,
    errorCount: 0,
    result: null,
    events: [],
    mapOccurrenceId: null,
    listOccurrenceId: null,
    targetOccurrenceId: null,
  }))
}

function isTaskCompleted(taskIndex: number, attempt: TaskAttempt) {
  const events = attempt.events
  switch (taskDefinitions[taskIndex]?.id) {
    case "find-occurrence":
      return events.includes("map-viewed") && events.includes("list-viewed") &&
        Boolean(attempt.mapOccurrenceId) && attempt.mapOccurrenceId === attempt.listOccurrenceId
    case "interact-with-occurrence":
      return Boolean(attempt.targetOccurrenceId) && events.includes("occurrence-opened") &&
        events.includes("comment-added") && events.includes("support-added") && events.includes("priority-voted")
    case "register-test":
      return events.includes("occurrence-added")
    case "admin-panel":
      return events.includes("admin-status-resolved")
    default:
      return false
  }
}

interface GuidedCitizenTasksProps {
  onFinish: (summary: GuidedTaskSummary) => void
  onAbandon: (summary: GuidedTaskSummary) => void
}

export function GuidedCitizenTasks({ onFinish, onAbandon }: GuidedCitizenTasksProps) {
  const [taskIndex, setTaskIndex] = useState(0)
  const [attempts, setAttempts] = useState<TaskAttempt[]>(createInitialAttempts)
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [taskIndex])

  const task = taskDefinitions[taskIndex]
  const currentAttempt = attempts[taskIndex]
  const allTasksFinished = taskIndex >= taskDefinitions.length
  const currentStage = Math.min(taskIndex + 1, taskDefinitions.length)
  const progress = allTasksFinished ? 80 : (currentStage / 5) * 100

  const recordTaskAction = (
    action: TaskEvent | "interaction-error",
    options: { result?: string; occurrenceId?: string } = {},
  ) => {
    setAttempts((current) => current.map((attempt, index) => {
      if (index !== taskIndex || attempt.status !== "in-progress") return attempt

      if (action === "interaction-error" || action === "admin-status-attempt-failed") {
        return { ...attempt, result: options.result ?? attempt.result, errorCount: attempt.errorCount + 1 }
      }

      const taskId = taskDefinitions[index]?.id
      const occurrenceAction = action === "occurrence-opened" || action === "comment-added" || action === "support-added" || action === "priority-voted"
      if (taskId === "interact-with-occurrence" && occurrenceAction) {
        const occurrenceId = options.occurrenceId
        if (!occurrenceId) return attempt
        if (action === "occurrence-opened" && !attempt.targetOccurrenceId) {
          const next = { ...attempt, targetOccurrenceId: occurrenceId }
          const events = next.events.includes(action) ? next.events : [...next.events, action]
          const updated = { ...next, events }
          const completed = isTaskCompleted(index, updated)
          return { ...updated, status: completed ? "completed" : updated.status, completedAt: completed ? Date.now() : null }
        }
        if (occurrenceId !== attempt.targetOccurrenceId) return { ...attempt, errorCount: attempt.errorCount + 1, result: "Mantenha as quatro ações na mesma ocorrência." }
      }

      const events = attempt.events.includes(action) ? attempt.events : [...attempt.events, action]
      const updated = { ...attempt, events, result: options.result ?? attempt.result }
      const completed = isTaskCompleted(index, updated)
      return {
        ...updated,
        status: completed ? "completed" : attempt.status,
        completedAt: completed ? attempt.completedAt ?? Date.now() : null,
      }
    }))
  }

  const recordOccurrenceLocation = (view: "map" | "list", occurrenceId: string) => {
    setAttempts((current) => current.map((attempt, index) => {
      if (index !== taskIndex || attempt.status !== "in-progress" || taskDefinitions[index]?.id !== "find-occurrence") return attempt
      const previousSelection = view === "map" ? attempt.mapOccurrenceId : attempt.listOccurrenceId
      const otherSelection = view === "map" ? attempt.listOccurrenceId : attempt.mapOccurrenceId
      const updated = view === "map"
        ? { ...attempt, mapOccurrenceId: occurrenceId }
        : { ...attempt, listOccurrenceId: occurrenceId }
      const failedSelection = otherSelection !== null && otherSelection !== occurrenceId && previousSelection !== occurrenceId
      const completed = isTaskCompleted(index, updated)
      return {
        ...updated,
        errorCount: attempt.errorCount + Number(failedSelection),
        status: completed ? "completed" : attempt.status,
        completedAt: completed ? attempt.completedAt ?? Date.now() : null,
      }
    }))
  }

  const startTask = (index: number) => {
    setAttempts((current) => current.map((attempt, attemptIndex) =>
      attemptIndex === index && attempt.status === "not-started"
        ? { ...attempt, status: "in-progress", startedAt: Date.now() }
        : attempt,
    ))
  }

  const advanceToNextTask = () => {
    if (!currentAttempt || currentAttempt.status !== "completed") return
    const nextIndex = taskIndex + 1
    setTaskIndex(nextIndex)
    if (nextIndex < taskDefinitions.length) startTask(nextIndex)
  }

  const skipTask = () => {
    if (!currentAttempt || currentAttempt.status !== "in-progress") return
    setAttempts((current) => current.map((attempt, index) => index === taskIndex
      ? { ...attempt, status: "skipped", skippedAt: Date.now() }
      : attempt,
    ))
    const nextIndex = taskIndex + 1
    setTaskIndex(nextIndex)
    if (nextIndex < taskDefinitions.length) startTask(nextIndex)
  }

  const toTaskMetrics = (taskAttempts: TaskAttempt[]) => createTaskMetrics(
    taskDefinitions.map((definition, index) => ({
      taskId: definition.id,
      ...taskAttempts[index],
    })),
  )

  const confirmAbandon = () => {
    const endedAt = Date.now()
    const finalAttempts = attempts.map((attempt, index) =>
      index === taskIndex && attempt.status === "in-progress"
        ? { ...attempt, status: "abandoned" as const, abandonedAt: endedAt }
        : attempt,
    )
    setAttempts(finalAttempts)
    onAbandon({ tasks: toTaskMetrics(finalAttempts) })
  }

  const finishPracticalTasks = () => {
    onFinish({ tasks: toTaskMetrics(attempts) })
  }

  const mapLocationSelected = Boolean(currentAttempt?.mapOccurrenceId)
  const listLocationSelected = Boolean(currentAttempt?.listOccurrenceId)
  const locationMismatch = mapLocationSelected && listLocationSelected && currentAttempt?.mapOccurrenceId !== currentAttempt?.listOccurrenceId
  const interactionChecklist = [
    { event: "occurrence-opened", label: "Abrir e consultar os detalhes" },
    { event: "comment-added", label: "Publicar um comentário" },
    { event: "support-added", label: "Registrar um apoio" },
    { event: "priority-voted", label: "Registrar um voto de prioridade" },
  ] as const

  return (
    <section className="container mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 pb-24" aria-labelledby="guided-tasks-title">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <ClipboardList aria-hidden="true" />
            Etapa {currentStage} de 5
          </Badge>
          {!allTasksFinished && <span className="text-sm font-medium text-muted-foreground">Tarefa {taskIndex + 1} de 4</span>}
        </div>
        <div className="flex flex-col gap-2">
          <Progress value={progress} aria-label="Progresso da avaliação" />
          <ol className="grid grid-cols-2 gap-1.5 sm:grid-cols-4 sm:gap-2" aria-label="Progresso das tarefas práticas">
            {taskDefinitions.map((item, index) => {
              const status = attempts[index].status
              const isCurrent = index === taskIndex && status === "in-progress"
              const label = status === "completed" ? "concluída" : status === "skipped" ? "pulada" : status === "abandoned" ? "abandonada" : isCurrent ? "em andamento" : "a iniciar"
              return (
                <li key={item.id} aria-current={isCurrent ? "step" : undefined} aria-label={`Tarefa ${index + 1}: ${item.title}, ${label}`} className="min-w-0">
                  <div title={`${index + 1}. ${item.title}`} className={`flex min-h-9 items-center justify-center gap-1 rounded-md border px-1 text-center text-[10px] leading-tight sm:text-xs ${status === "completed" ? "border-primary/40 bg-primary/10 text-primary" : status === "skipped" ? "border-border bg-muted text-muted-foreground" : isCurrent ? "border-primary bg-primary/5 font-medium text-foreground" : "border-border text-muted-foreground"}`}>
                    {status === "completed" ? <Check aria-hidden="true" className="size-3 shrink-0" /> : null}
                    <span className="sm:hidden">{index + 1}. {item.title}</span>
                    <span className="hidden min-w-0 truncate sm:inline">{index + 1}. {item.title}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </header>

      {allTasksFinished ? (
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Check aria-hidden="true" className="size-5" />
            </div>
            <CardTitle>Tarefas práticas concluídas</CardTitle>
              <CardDescription>Agora você pode responder ao questionário. As dez afirmações Likert serão obrigatórias; as perguntas abertas são opcionais.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Tarefas concluídas: {attempts.filter((attempt) => attempt.status === "completed").length} · Puladas: {attempts.filter((attempt) => attempt.status === "skipped").length}.
            </p>
            <Alert>
              <LockKeyhole aria-hidden="true" />
              <AlertTitle>Ambiente demonstrativo descartável</AlertTitle>
              <AlertDescription>Ocorrências, comentários, apoios e votos desta etapa permanecem isolados e serão descartados ao sair da avaliação.</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setConfirmExitOpen(true)}>
              <X data-icon="inline-start" />
              Desistir e descartar
            </Button>
            <Button onClick={finishPracticalTasks}>
              Ir ao questionário
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <span className="text-sm font-semibold">{taskIndex + 1}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-1">
                <CardTitle id="guided-tasks-title" className="text-lg">{task.title}</CardTitle>
                <CardDescription className="leading-relaxed">{task.instruction}</CardDescription>
              </div>
            </CardHeader>
            {task.id === "find-occurrence" && (
              <CardContent className="pt-0">
                <div className="flex flex-wrap gap-2 text-xs" aria-live="polite">
                  <span className={`rounded-full border px-3 py-1 ${currentAttempt.events.includes("list-viewed") ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground"}`}>Lista: {listLocationSelected ? "ocorrência localizada" : currentAttempt.events.includes("list-viewed") ? "selecione uma ocorrência" : "a consultar"}</span>
                  <span className={`rounded-full border px-3 py-1 ${currentAttempt.events.includes("map-viewed") ? "border-primary/40 bg-primary/10 text-primary" : "text-muted-foreground"}`}>Mapa: {mapLocationSelected ? "ocorrência localizada" : currentAttempt.events.includes("map-viewed") ? "selecione uma ocorrência" : "a consultar"}</span>
                </div>
                {locationMismatch && <p className="mt-2 text-sm text-amber-600" role="status">Selecione a mesma ocorrência na lista e no mapa para concluir esta tarefa.</p>}
              </CardContent>
            )}
            {task.id === "interact-with-occurrence" && (
              <CardContent className="pt-0">
                <ol className="grid gap-2 sm:grid-cols-2" aria-label="Ações necessárias para concluir a tarefa">
                  {interactionChecklist.map(({ event, label }) => {
                    const completed = currentAttempt.events.includes(event)
                    return <li key={event} className={`flex items-center gap-2 text-sm ${completed ? "text-primary" : "text-muted-foreground"}`}>
                      {completed ? <Check aria-hidden="true" className="size-4" /> : <span aria-hidden="true" className="size-4 rounded-full border" />}
                      {label}
                    </li>
                  })}
                </ol>
                {currentAttempt.result && <p className="mt-2 text-sm text-amber-600" role="status">{currentAttempt.result}</p>}
              </CardContent>
            )}
            {task.id === "register-test" && (
              <CardContent className="pt-0">
                <Alert>
                  <ShieldAlert aria-hidden="true" />
                  <AlertTitle>Use somente dados fictícios</AlertTitle>
                  <AlertDescription>Não informe endereço residencial ou outros dados pessoais. Escolha um ponto qualquer no mapa demonstrativo.</AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>

          {task.view === "explore" ? (
            <div className="h-[calc(100dvh-16rem)] min-h-[400px] overflow-hidden rounded-xl border bg-background">
              <ExplorePage
                embedded
                allowDetails={task.id === "interact-with-occurrence"}
                onResearchAction={(action, occurrenceId) => recordTaskAction(action, { occurrenceId })}
                onOccurrenceLocated={recordOccurrenceLocation}
              />
            </div>
          ) : task.view === "register" ? (
            <RegisterPage
              demoMode
              onSuccess={() => recordTaskAction("occurrence-added", { result: "occurrence-added" })}
              onResearchError={() => recordTaskAction("interaction-error")}
            />
          ) : (
            <AdminEvaluationStage onComplete={(event, result) => recordTaskAction(event, { result })} />
          )}

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setConfirmExitOpen(true)}>
              <X data-icon="inline-start" />
              Desistir da avaliação
            </Button>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="button" variant="outline" onClick={skipTask} disabled={currentAttempt?.status === "completed"}>
                <SkipForward data-icon="inline-start" />
                Pular esta tarefa
              </Button>
              <Button type="button" onClick={advanceToNextTask} disabled={currentAttempt?.status !== "completed"}>
                Próxima tarefa
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </div>
          {currentAttempt?.errorCount ? (
            <p className="flex items-center gap-2 text-xs text-muted-foreground" aria-live="polite">
              <AlertCircle aria-hidden="true" className="size-3.5" />
              {currentAttempt.errorCount} tentativa(s) não concluída(s) nesta tarefa.
            </p>
          ) : null}
        </>
      )}

      <AlertDialog open={confirmExitOpen} onOpenChange={setConfirmExitOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desistir da avaliação?</AlertDialogTitle>
            <AlertDialogDescription>
              Você pode sair sem concluir. Todos os dados demonstrativos desta sessão serão descartados e não aparecerão na navegação pública.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar avaliação</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAbandon}>Desistir e descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
