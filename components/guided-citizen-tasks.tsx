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

type CitizenTaskId = "find-occurrence" | "read-details" | "register-test" | "comment" | "support-vote"
type AdminTaskId = "admin-indicators" | "admin-categories" | "admin-status"
type TaskStatus = "not-started" | "in-progress" | "completed" | "skipped" | "abandoned"
type TaskEvent = Exclude<ResearchAction, "interaction-error"> | "occurrence-added" | AdminEvaluationEvent
type TaskDefinition =
  | { id: Exclude<CitizenTaskId, "register-test">; title: string; instruction: string; view: "explore" }
  | { id: "register-test"; title: string; instruction: string; view: "register" }
  | { id: AdminTaskId; title: string; instruction: string; view: "admin" }

type TaskAttempt = {
  status: TaskStatus
  startedAt: number | null
  completedAt: number | null
  skippedAt: number | null
  abandonedAt: number | null
  errorCount: number
  result: string | null
  events: TaskEvent[]
}

export type GuidedTaskSummary = {
  completed: number
  skipped: number
}

const taskDefinitions: TaskDefinition[] = [
  {
    id: "find-occurrence",
    title: "Localizar uma ocorrência",
    instruction: "Use a busca, os filtros ou o mapa para encontrar uma ocorrência demonstrativa e abra o item que localizou.",
    view: "explore",
  },
  {
    id: "read-details",
    title: "Consultar os detalhes",
    instruction: "Abra uma ocorrência demonstrativa e confira as informações apresentadas, como descrição, categoria e localização.",
    view: "explore",
  },
  {
    id: "register-test",
    title: "Registrar uma ocorrência de teste",
    instruction: "Preencha título, descrição e categoria no formulário existente. Para a localização, escolha um ponto fictício no mapa; não use GPS nem informe seu endereço pessoal.",
    view: "register",
  },
  {
    id: "comment",
    title: "Publicar um comentário demonstrativo",
    instruction: "Abra uma ocorrência demonstrativa, escreva um comentário fictício e use a ação de publicar comentários da própria tela.",
    view: "explore",
  },
  {
    id: "support-vote",
    title: "Apoiar e votar",
    instruction: "Em uma ocorrência demonstrativa, registre um apoio e depois escolha e confirme um voto de prioridade.",
    view: "explore",
  },
  {
    id: "admin-indicators",
    title: "Consultar indicadores",
    instruction: "Acesse o painel administrativo demonstrativo e consulte os indicadores gerais das ocorrências.",
    view: "admin",
  },
  {
    id: "admin-categories",
    title: "Interpretar gráficos",
    instruction: "Observe os gráficos por categoria, status e prioridade. Depois, identifique no questionário abaixo qual categoria apresenta mais ocorrências.",
    view: "admin",
  },
  {
    id: "admin-status",
    title: "Alterar status",
    instruction: "No painel demonstrativo, selecione uma ocorrência com status Pendente e altere o status para Em análise usando o controle existente.",
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
  }))
}

function isTaskCompleted(taskIndex: number, events: TaskEvent[]) {
  switch (taskDefinitions[taskIndex]?.id) {
    case "find-occurrence":
    case "read-details":
      return events.includes("occurrence-opened")
    case "register-test":
      return events.includes("occurrence-added")
    case "comment":
      return events.includes("comment-added")
    case "support-vote":
      return events.includes("support-added") && events.includes("priority-voted")
    case "admin-indicators":
      return events.includes("admin-indicators-consulted")
    case "admin-categories":
      return events.includes("admin-category-identified")
    case "admin-status":
      return events.includes("admin-status-changed")
    default:
      return false
  }
}

interface GuidedCitizenTasksProps {
  onFinish: (summary: GuidedTaskSummary) => void
  onAbandon: () => void
}

export function GuidedCitizenTasks({ onFinish, onAbandon }: GuidedCitizenTasksProps) {
  const [taskIndex, setTaskIndex] = useState(0)
  const [attempts, setAttempts] = useState<TaskAttempt[]>(createInitialAttempts)
  const [confirmExitOpen, setConfirmExitOpen] = useState(false)
  const [adminStageStarted, setAdminStageStarted] = useState(false)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [taskIndex])

  const task = taskDefinitions[taskIndex]
  const currentAttempt = attempts[taskIndex]
  const isAdminTransition = taskIndex === 5 && !adminStageStarted
  const allTasksFinished = taskIndex >= taskDefinitions.length
  const progress = allTasksFinished ? 100 : (taskIndex / taskDefinitions.length) * 100
  const recordAction = (
    action: ResearchAction | "occurrence-added" | AdminEvaluationEvent,
    result?: string,
  ) => {
    setAttempts((current) =>
      current.map((attempt, index) => {
        if (index !== taskIndex || attempt.status !== "in-progress") return attempt

        if (action === "interaction-error") {
          return { ...attempt, result: result ?? attempt.result, errorCount: attempt.errorCount + 1 }
        }

        const events = attempt.events.includes(action) ? attempt.events : [...attempt.events, action]
        const completed = isTaskCompleted(index, events)
        return {
          ...attempt,
          events,
          result: result ?? attempt.result,
          status: completed ? "completed" : attempt.status,
          completedAt: completed ? attempt.completedAt ?? Date.now() : null,
        }
      }),
    )
  }

  const startTask = (index: number) => {
    setAttempts((current) =>
      current.map((attempt, attemptIndex) =>
        attemptIndex === index && attempt.status === "not-started"
          ? { ...attempt, status: "in-progress", startedAt: Date.now() }
          : attempt,
      ),
    )
  }

  const advanceToNextTask = () => {
    if (!currentAttempt || currentAttempt.status !== "completed") return

    const nextIndex = taskIndex + 1
    setTaskIndex(nextIndex)
    if (nextIndex < 5) startTask(nextIndex)
    if (nextIndex > 5 && nextIndex < taskDefinitions.length) startTask(nextIndex)
  }

  const skipTask = () => {
    if (!currentAttempt || currentAttempt.status !== "in-progress") return

    setAttempts((current) =>
      current.map((attempt, index) =>
        index === taskIndex
          ? { ...attempt, status: "skipped", skippedAt: Date.now() }
          : attempt,
      ),
    )
    const nextIndex = taskIndex + 1
    setTaskIndex(nextIndex)
    if (nextIndex < 5) startTask(nextIndex)
    if (nextIndex > 5 && nextIndex < taskDefinitions.length) startTask(nextIndex)
  }

  const startAdminTasks = () => {
    setAdminStageStarted(true)
    startTask(5)
  }

  const confirmAbandon = () => {
    setAttempts((current) =>
      current.map((attempt, index) =>
        index === taskIndex && attempt.status === "in-progress"
          ? { ...attempt, status: "abandoned", abandonedAt: Date.now() }
          : attempt,
      ),
    )
    onAbandon()
  }

  const finishEvaluation = () => {
    onFinish({
      completed: attempts.filter((attempt) => attempt.status === "completed").length,
      skipped: attempts.filter((attempt) => attempt.status === "skipped").length,
    })
  }

  return (
    <section className="container mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 pb-24" aria-labelledby="guided-tasks-title">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <ClipboardList aria-hidden="true" />
            Avaliação demonstrativa · {taskIndex >= 5 ? "E3" : "E2"}
          </Badge>
          {isAdminTransition ? (
            <span className="text-sm font-medium text-muted-foreground">Tarefas cidadãs concluídas ou puladas · 5/8 no total</span>
          ) : !allTasksFinished ? (
            <span className="text-sm font-medium text-muted-foreground">Tarefa {taskIndex + 1} de 8</span>
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <Progress value={progress} aria-label="Progresso das tarefas cidadãs" />
          <ol className="grid grid-cols-4 gap-1.5 sm:grid-cols-8 sm:gap-2" aria-label="Situação das tarefas">
            {taskDefinitions.map((item, index) => {
              const status = attempts[index].status
              const isCurrent = index === taskIndex && status === "in-progress"
              const label = status === "completed" ? "concluída" : status === "skipped" ? "pulada" : status === "abandoned" ? "abandonada" : isCurrent ? "em andamento" : "a iniciar"
              return (
                <li key={item.id} aria-current={isCurrent ? "step" : undefined} aria-label={`Tarefa ${index + 1}: ${item.title}, ${label}`} className="min-w-0">
                  <div title={`${index + 1}. ${item.title}`} className={`flex min-h-9 items-center justify-center gap-1 rounded-md border px-1 text-center text-[10px] leading-tight sm:text-xs ${status === "completed" ? "border-primary/40 bg-primary/10 text-primary" : status === "skipped" ? "border-border bg-muted text-muted-foreground" : isCurrent ? "border-primary bg-primary/5 font-medium text-foreground" : "border-border text-muted-foreground"}`}>
                    {status === "completed" ? <Check aria-hidden="true" className="size-3 shrink-0" /> : null}
                    <span className="sm:hidden">{index + 1}</span>
                    <span className="hidden min-w-0 truncate sm:inline">{index + 1}. {item.title}</span>
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      </header>

      {isAdminTransition ? (
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ShieldAlert aria-hidden="true" className="size-5" />
            </div>
            <CardTitle>Etapa E2 concluída</CardTitle>
            <CardDescription>Agora você pode experimentar três tarefas administrativas no painel demonstrativo existente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <LockKeyhole aria-hidden="true" />
              <AlertTitle>O painel está isolado</AlertTitle>
              <AlertDescription>As tarefas E3 usam o mesmo estado de teste temporário da E2. Não concedem acesso administrativo real, e mudanças de status serão descartadas ao sair.</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setConfirmExitOpen(true)}>
              <X data-icon="inline-start" />
              Desistir e descartar
            </Button>
            <Button onClick={startAdminTasks}>
              Iniciar tarefas administrativas (E3)
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      ) : allTasksFinished ? (
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Check aria-hidden="true" className="size-5" />
            </div>
            <CardTitle>Etapa E3 concluída</CardTitle>
            <CardDescription>Obrigado por experimentar as tarefas administrativas simuladas do FiscalizaSP.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Você concluiu {attempts.filter((attempt) => attempt.status === "completed").length} tarefa(s) e pulou {attempts.filter((attempt) => attempt.status === "skipped").length}. Essas informações existem somente nesta sessão.
            </p>
            <Alert>
              <LockKeyhole aria-hidden="true" />
              <AlertTitle>Ambiente demonstrativo descartável</AlertTitle>
              <AlertDescription>Ocorrências, comentários, apoios, votos e alterações administrativas criados durante a avaliação serão descartados ao finalizar.</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={() => setConfirmExitOpen(true)}>
              <X data-icon="inline-start" />
              Desistir e descartar
            </Button>
            <Button onClick={finishEvaluation}>
              Finalizar e descartar dados de teste
              <Check data-icon="inline-end" />
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
                <CardTitle className="text-lg">{task.title}</CardTitle>
                <CardDescription className="leading-relaxed">{task.instruction}</CardDescription>
              </div>
            </CardHeader>
            {task.id === "register-test" && (
              <CardContent className="pt-0">
                <Alert>
                  <ShieldAlert aria-hidden="true" />
                  <AlertTitle>Use somente dados fictícios</AlertTitle>
                  <AlertDescription>Não informe endereço residencial ou outros dados pessoais. Escolha um ponto qualquer no mapa de demonstração.</AlertDescription>
                </Alert>
              </CardContent>
            )}
          </Card>

          {task.view === "explore" ? (
            <div className="h-[calc(100dvh-16rem)] min-h-[400px] overflow-hidden rounded-xl border bg-background">
              <ExplorePage embedded onResearchAction={recordAction} />
            </div>
          ) : task.view === "register" ? (
            <RegisterPage
              demoMode
              onSuccess={() => recordAction("occurrence-added", "occurrence-added")}
              onResearchError={() => recordAction("interaction-error")}
            />
          ) : (
            <AdminEvaluationStage
              taskId={task.id}
              onComplete={recordAction}
              onInteractionError={(result) => recordAction("interaction-error", result)}
            />
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
                {taskIndex === taskDefinitions.length - 1 ? "Ver conclusão" : "Próxima tarefa"}
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
              Você pode sair sem concluir. Todos os dados de teste desta sessão serão descartados e não aparecerão na navegação pública.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar tarefas</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAbandon}>Desistir e descartar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}
