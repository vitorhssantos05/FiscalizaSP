"use client"

import { useEffect, useRef, useState } from "react"
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ClipboardCheck, GraduationCap, LockKeyhole, ShieldCheck, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AppProvider } from "@/lib/app-context"
import { GuidedCitizenTasks, type GuidedTaskSummary } from "@/components/guided-citizen-tasks"
import { EvaluationQuestionnaire } from "@/components/evaluation-questionnaire"
import { createInitialEvaluationMetrics, finalizeEvaluationMetrics, type EvaluationMetrics, type QuestionnaireMetrics } from "@/lib/evaluation-metrics"
import { finalizeEvaluation, startAnonymousParticipant, startEvaluation, withdrawEvaluation } from "@/lib/supabase/anonymous-participant"

type ResearchPhase = "introduction" | "profile" | "review" | "transition" | "tasks" | "questionnaire" | "declined"
type AnswerKey = "ageRange" | "socialMediaUse" | "digitalFamiliarity" | "platformExperience"
type Answers = Record<AnswerKey, string>

type Question = {
  key: AnswerKey
  title: string
  description: string
  options: { value: string; label: string }[]
}

const emptyAnswers: Answers = {
  ageRange: "",
  socialMediaUse: "",
  digitalFamiliarity: "",
  platformExperience: "",
}

const questions: Question[] = [
  {
    key: "ageRange",
    title: "Qual é a sua faixa etária?",
    description: "Não solicitamos sua data de nascimento.",
    options: [
      { value: "18-24", label: "18 a 24 anos" },
      { value: "25-34", label: "25 a 34 anos" },
      { value: "35-44", label: "35 a 44 anos" },
      { value: "45-54", label: "45 a 54 anos" },
      { value: "55+", label: "55 anos ou mais" },
      { value: "prefer-not-to-say", label: "Prefiro não informar" },
    ],
  },
  {
    key: "socialMediaUse",
    title: "Com que frequência você utiliza redes sociais?",
    description: "Considere o uso de redes sociais no seu dia a dia.",
    options: [
      { value: "daily", label: "Diariamente" },
      { value: "several-times-weekly", label: "Algumas vezes por semana" },
      { value: "once-weekly", label: "Uma vez por semana" },
      { value: "rarely", label: "Raramente" },
      { value: "never", label: "Nunca" },
      { value: "prefer-not-to-say", label: "Prefiro não responder" },
    ],
  },
  {
    key: "digitalFamiliarity",
    title: "Como você avalia sua familiaridade com ferramentas digitais?",
    description: "Pense em aplicativos, sites e serviços online.",
    options: [
      { value: "beginner", label: "Pouco familiarizado(a)" },
      { value: "intermediate", label: "Razoavelmente familiarizado(a)" },
      { value: "advanced", label: "Muito familiarizado(a)" },
    ],
  },
  {
    key: "platformExperience",
    title: "Você já usou plataformas digitais para fiscalizar ou reportar problemas urbanos?",
    description: "Por exemplo, canais digitais para comunicar problemas de infraestrutura à cidade.",
    options: [
      { value: "yes", label: "Sim" },
      { value: "no", label: "Não" },
      { value: "unsure", label: "Não tenho certeza" },
    ],
  },
]

const stepLabels = ["Consentimento", "Perfil", "Revisão"]

export function EvaluationPage() {
  const [phase, setPhase] = useState<ResearchPhase>("introduction")
  const [sessionStatus, setSessionStatus] = useState<"checking" | "active" | "completed">("checking")
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [answers, setAnswers] = useState<Answers>(emptyAnswers)
  const [missingAnswers, setMissingAnswers] = useState<AnswerKey[]>([])
  const [sessionMetrics, setSessionMetrics] = useState<EvaluationMetrics>(() => createInitialEvaluationMetrics())
  const [persistenceError, setPersistenceError] = useState<string | null>(null)
  const completionSubmittedRef = useRef(false)

  useEffect(() => {
    let completed = false
    try {
      completed = window.sessionStorage.getItem("fiscalizasp-evaluation-completed") === "1"
    } catch {
      completed = false
    }
    setSessionStatus(completed ? "completed" : "active")
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [phase])

  const clearDraft = () => {
    setConsentAccepted(false)
    setAnswers(emptyAnswers)
    setMissingAnswers([])
  }

  const declineParticipation = () => {
    const endedMetrics = finalizeEvaluationMetrics(sessionMetrics, "abandoned", Date.now())
    if (endedMetrics.status !== "abandoned") return
    clearDraft()
    setSessionMetrics(createInitialEvaluationMetrics())
    setPhase("declined")
  }

  const beginProfile = () => {
    if (consentAccepted) setPhase("profile")
  }

  const reviewProfile = () => {
    const unanswered = questions
      .filter((question) => !answers[question.key])
      .map((question) => question.key)
    setMissingAnswers(unanswered)
    if (unanswered.length === 0) setPhase("review")
  }

  const finishE1 = async () => {
    setPersistenceError(null)
    try {
      await startAnonymousParticipant("Participante")
      const started = await startEvaluation(answers)
      if (!started) throw new Error("Sessão anônima não iniciada")
      setSessionMetrics(createInitialEvaluationMetrics())
      setPhase("tasks")
      window.scrollTo(0, 0)
    } catch {
      setPersistenceError("Não foi possível iniciar o registro seguro desta avaliação. Tente novamente.")
    }
  }

  const finishTasks = (summary: GuidedTaskSummary) => {
    setSessionMetrics((current) => ({ ...current, tasks: summary.tasks }))
    setPhase("questionnaire")
  }

  const finishQuestionnaire = async (questionnaire: QuestionnaireMetrics) => {
    if (completionSubmittedRef.current) return

    const completedMetrics = finalizeEvaluationMetrics(
      sessionMetrics,
      "completed",
      Date.now(),
      questionnaire,
    )
    if (!completedMetrics.questionnaireCompleted) return
    try {
      await finalizeEvaluation([
        ...questionnaire.likert.map((answer) => ({ question_key: answer.questionId, answer: answer.value })),
        { question_key: "difficulties", answer: questionnaire.openAnswers.difficulties },
        { question_key: "improvements", answer: questionnaire.openAnswers.improvements },
      ])
    } catch {
      setPersistenceError("Não foi possível salvar suas respostas com segurança. Tente novamente.")
      return
    }
    completionSubmittedRef.current = true

    try {
      window.sessionStorage.setItem("fiscalizasp-evaluation-completed", "1")
    } catch {
      // The in-memory guard still applies if browser storage is unavailable.
    }
    clearDraft()
    setSessionMetrics(createInitialEvaluationMetrics())
    setSessionStatus("completed")
  }

  const abandonEvaluation = async (summary?: GuidedTaskSummary) => {
    const abandonedMetrics = finalizeEvaluationMetrics(
      { ...sessionMetrics, tasks: summary?.tasks ?? sessionMetrics.tasks },
      "abandoned",
      Date.now(),
    )
    if (abandonedMetrics.status !== "abandoned") return
    await withdrawEvaluation()

    clearDraft()
    setSessionMetrics(createInitialEvaluationMetrics())
    setPhase("declined")
  }

  const restart = () => {
    clearDraft()
    setSessionMetrics(createInitialEvaluationMetrics())
    setPhase("introduction")
  }

  const startAnotherParticipant = () => {
    completionSubmittedRef.current = false
    try {
      window.sessionStorage.removeItem("fiscalizasp-evaluation-completed")
    } catch {
      // No persistent identity or answers are used for this provisional marker.
    }
    clearDraft()
    setSessionMetrics(createInitialEvaluationMetrics())
    setSessionStatus("active")
    setPhase("introduction")
  }

  if (persistenceError) {
    return (
      <section className="container mx-auto max-w-xl px-4 py-12" aria-live="assertive">
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>Não foi possível salvar a avaliação</AlertTitle>
          <AlertDescription>{persistenceError}</AlertDescription>
        </Alert>
        <Button type="button" className="mt-4" onClick={() => setPersistenceError(null)}>Tentar novamente</Button>
      </section>
    )
  }

  if (sessionStatus === "checking") {
    return (
      <section className="container mx-auto max-w-xl px-4 py-12" aria-live="polite">
        <Card>
          <CardHeader>
            <CardTitle>Verificando esta sessão</CardTitle>
            <CardDescription>Um momento enquanto conferimos se a avaliação já foi concluída nesta aba.</CardDescription>
          </CardHeader>
        </Card>
      </section>
    )
  }

  if (sessionStatus === "completed") {
    return (
      <section className="container mx-auto max-w-xl px-4 py-12" aria-labelledby="completed-session-title">
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Check aria-hidden="true" className="size-6" />
            </div>
            <CardTitle id="completed-session-title">Avaliação já concluída nesta sessão</CardTitle>
            <CardDescription>As respostas e métricas desta avaliação foram salvas no banco de dados. Nenhum dado pessoal identificável é coletado.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">Se outra pessoa for participar neste dispositivo, inicie uma nova sessão de demonstração. O marcador técnico não identifica participantes diferentes.</p>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="button" onClick={startAnotherParticipant}>Iniciar sessão para outra pessoa</Button>
          </CardFooter>
        </Card>
      </section>
    )
  }

  if (phase === "tasks") {
    return (
      <AppProvider initialNickname="Participante">
        <GuidedCitizenTasks onFinish={finishTasks} onAbandon={abandonEvaluation} />
      </AppProvider>
    )
  }

  if (phase === "questionnaire") {
    return <EvaluationQuestionnaire onFinish={finishQuestionnaire} onAbandon={abandonEvaluation} />
  }

  const currentStep = phase === "introduction" ? 1 : phase === "profile" ? 2 : 3
  const progressValue = phase === "introduction" ? 0 : phase === "profile" ? 50 : 100

  return (
    <section className="container mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 md:py-12" aria-labelledby="research-title">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <GraduationCap aria-hidden="true" />
            Pesquisa acadêmica · TGI-II
          </Badge>
          {phase !== "declined" && phase !== "transition" && (
            <span className="text-sm text-muted-foreground">Preparação da avaliação</span>
          )}
        </div>
        <div>
          <h1 id="research-title" className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Pesquisa de experiência cidadã
          </h1>
          <p className="mt-2 max-w-2xl text-pretty leading-relaxed text-muted-foreground">
            Queremos compreender o perfil geral de quem utiliza ferramentas digitais e sua experiência com fiscalização urbana.
          </p>
        </div>
      </header>

      {phase !== "declined" && phase !== "transition" && (
        <div className="flex flex-col gap-3" aria-label={`Parte ${currentStep} de 3: ${stepLabels[currentStep - 1]}`}>
          <div className="flex items-center justify-between gap-2 text-xs font-medium sm:text-sm">
            {stepLabels.map((label, index) => {
              const step = index + 1
              const isComplete = step < currentStep || (step === 1 && consentAccepted && phase !== "introduction")
              const isCurrent = step === currentStep
              return (
                <span key={label} className={isCurrent || isComplete ? "text-primary" : "text-muted-foreground"}>
                  <span className="mr-1.5 inline-flex size-6 items-center justify-center rounded-full border text-xs">
                    {isComplete ? <Check aria-hidden="true" className="size-3.5" /> : step}
                  </span>
                  {label}
                </span>
              )
            })}
          </div>
          <Progress value={progressValue} aria-label="Progresso da pesquisa" />
        </div>
      )}

      {phase === "introduction" && (
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <ClipboardCheck aria-hidden="true" className="size-6" />
            </div>
            <CardTitle>Sobre esta pesquisa</CardTitle>
            <CardDescription>Leia as informações antes de decidir se deseja participar.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <p className="leading-relaxed text-muted-foreground">
              Esta pesquisa acadêmica busca entender como as pessoas se relacionam com ferramentas digitais de participação cidadã e fiscalização da infraestrutura urbana. As respostas serão salvas no banco de dados para análise agregada nos Resultados da Pesquisa.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex gap-3 rounded-lg border bg-muted/30 p-4">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <h2 className="font-medium">Participação voluntária</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Você decide se quer participar e pode desistir a qualquer momento, sem qualquer prejuízo.</p>
                </div>
              </div>
              <div className="flex gap-3 rounded-lg border bg-muted/30 p-4">
                <LockKeyhole aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
                <div>
                  <h2 className="font-medium">Sem identificação pessoal</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Não pedimos nome, e-mail, endereço ou outros dados que identifiquem você.</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <h2 className="font-medium">O que acontece nesta etapa?</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Você responderá perguntas gerais de perfil e, em seguida, poderá localizar ocorrências, consultar detalhes e interagir, registrar um caso demonstrativo e consultar o painel administrativo. Para concluir o questionário final, será necessário responder às dez afirmações de 1 a 5; as duas perguntas abertas serão opcionais. Você poderá revisar tudo e desistir a qualquer momento. As respostas serão exibidas de forma agregada no painel de Resultados da Pesquisa.
              </p>
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-4">
              <Checkbox
                id="research-consent"
                checked={consentAccepted}
                onCheckedChange={(checked) => setConsentAccepted(checked === true)}
                aria-describedby="consent-description"
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor="research-consent" className="cursor-pointer leading-relaxed">
                  Li as informações e aceito participar voluntariamente desta etapa demonstrativa.
                </Label>
                <p id="consent-description" className="text-sm text-muted-foreground">
                  O consentimento é necessário para continuar. No questionário, as dez afirmações serão obrigatórias; as perguntas abertas, opcionais. Você pode desistir depois e descartar as respostas provisórias.
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={declineParticipation}>
              <X data-icon="inline-start" />
              Não desejo participar
            </Button>
            <Button type="button" onClick={beginProfile} disabled={!consentAccepted}>
              Continuar para o perfil
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {phase === "profile" && (
        <Card>
          <CardHeader>
            <CardTitle>Perfil geral</CardTitle>
            <CardDescription>As perguntas são sobre características gerais. Nenhuma resposta identifica você.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-7">
            {questions.map((question, index) => {
              const isMissing = missingAnswers.includes(question.key)
              const errorId = `${question.key}-error`
              return (
                <fieldset key={question.key} className="flex min-w-0 flex-col gap-3" aria-describedby={isMissing ? errorId : undefined}>
                  <legend className="font-medium leading-relaxed">
                    {index + 1}. {question.title}
                    <span className="sr-only"> Obrigatória</span>
                  </legend>
                  <p className="-mt-2 text-sm text-muted-foreground">{question.description}</p>
                  <RadioGroup
                    value={answers[question.key]}
                    onValueChange={(value) => {
                      setAnswers((current) => ({ ...current, [question.key]: value }))
                      setMissingAnswers((current) => current.filter((key) => key !== question.key))
                    }}
                    aria-invalid={isMissing}
                    aria-describedby={isMissing ? errorId : undefined}
                    className="grid gap-2 sm:grid-cols-2"
                  >
                    {question.options.map((option) => {
                      const inputId = `${question.key}-${option.value}`
                      return (
                        <Label
                          key={option.value}
                          htmlFor={inputId}
                          className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 font-normal transition-colors hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                        >
                          <RadioGroupItem id={inputId} value={option.value} aria-label={option.label} />
                          <span>{option.label}</span>
                        </Label>
                      )
                    })}
                  </RadioGroup>
                  {isMissing && <p id={errorId} className="text-sm text-destructive">Selecione uma opção para continuar.</p>}
                </fieldset>
              )
            })}
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setPhase("introduction")}>
              <ArrowLeft data-icon="inline-start" />
              Voltar
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="ghost" onClick={declineParticipation}>
                Desistir e descartar
              </Button>
              <Button type="button" onClick={reviewProfile}>
                Revisar respostas
                <ArrowRight data-icon="inline-end" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {phase === "review" && (
        <Card>
          <CardHeader>
            <CardTitle>Revise suas respostas</CardTitle>
            <CardDescription>Confira o perfil antes de iniciar as tarefas práticas da avaliação.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {questions.map((question) => {
              const selectedOption = question.options.find((option) => option.value === answers[question.key])
              return (
                <div key={question.key} className="flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <h2 className="text-sm font-medium leading-relaxed">{question.title}</h2>
                  <p className="shrink-0 text-sm text-primary sm:text-right">{selectedOption?.label}</p>
                </div>
              )
            })}
            <Alert className="mt-2">
              <LockKeyhole aria-hidden="true" />
              <AlertTitle>Respostas apenas nesta sessão</AlertTitle>
              <AlertDescription>O perfil será usado para iniciar a avaliação acadêmica. As interações das tarefas permanecem demonstrativas e isoladas dos registros públicos.</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="outline" onClick={() => setPhase("profile")}>
              <ArrowLeft data-icon="inline-start" />
              Editar respostas
            </Button>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="ghost" onClick={declineParticipation}>
                Desistir e descartar
              </Button>
              <Button type="button" onClick={finishE1}>
                Concluir preparação
                <Check data-icon="inline-end" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      )}

      {phase === "transition" && (
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Check aria-hidden="true" className="size-6" />
            </div>
            <CardTitle>Preparação concluída</CardTitle>
            <CardDescription>Agora você pode iniciar as tarefas práticas da avaliação demonstrativa.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Alert>
              <AlertTriangle aria-hidden="true" />
              <AlertTitle>Ambiente demonstrativo e isolado</AlertTitle>
              <AlertDescription>As respostas de perfil permanecem somente na memória desta sessão. As tarefas práticas usam dados isolados e nenhuma interação será enviada ou misturada à navegação pública.</AlertDescription>
            </Alert>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Esta avaliação é demonstrativa; não inicia uma coleta oficial de dados nem deve ser usada como instrumento de pesquisa com participantes reais.
            </p>
          </CardContent>
          <CardFooter className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-between">
            <Button type="button" variant="ghost" onClick={declineParticipation}>
              Desistir e descartar dados
            </Button>
            <Button type="button" onClick={() => setPhase("tasks")}>
              Iniciar etapa 1
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {phase === "declined" && (
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <X aria-hidden="true" className="size-6" />
            </div>
            <CardTitle>Participação encerrada</CardTitle>
            <CardDescription>Sua decisão foi respeitada. Nenhuma resposta provisória foi mantida.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Você pode retornar à apresentação sem compromisso. A pesquisa é voluntária e não há qualquer prejuízo por não participar ou desistir.
            </p>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="button" variant="outline" onClick={restart}>
              Voltar à apresentação
            </Button>
          </CardFooter>
        </Card>
      )}

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        Avaliação acadêmica · Tarefas demonstrativas isoladas · Respostas tratadas conforme o consentimento
      </p>
    </section>
  )
}
