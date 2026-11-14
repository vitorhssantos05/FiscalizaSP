"use client"

import { useEffect, useState } from "react"
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

type ResearchPhase = "introduction" | "profile" | "review" | "transition" | "tasks" | "questionnaire" | "completed" | "declined"
type AnswerKey = "ageRange" | "smartphoneUse" | "digitalFamiliarity" | "platformExperience"
type Answers = Record<AnswerKey, string>

type Question = {
  key: AnswerKey
  title: string
  description: string
  options: { value: string; label: string }[]
}

const emptyAnswers: Answers = {
  ageRange: "",
  smartphoneUse: "",
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
    key: "smartphoneUse",
    title: "Com que frequência você usa um smartphone?",
    description: "Considere o uso no seu dia a dia.",
    options: [
      { value: "daily", label: "Todos os dias" },
      { value: "weekly", label: "Algumas vezes por semana" },
      { value: "rarely", label: "Raramente" },
      { value: "never", label: "Não uso smartphone" },
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
  const [consentAccepted, setConsentAccepted] = useState(false)
  const [answers, setAnswers] = useState<Answers>(emptyAnswers)
  const [missingAnswers, setMissingAnswers] = useState<AnswerKey[]>([])
  const [taskSummary, setTaskSummary] = useState<GuidedTaskSummary | null>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [phase])

  const clearDraft = () => {
    setConsentAccepted(false)
    setAnswers(emptyAnswers)
    setMissingAnswers([])
  }

  const declineParticipation = () => {
    clearDraft()
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

  const finishE1 = () => setPhase("transition")

  const finishTasks = (summary: GuidedTaskSummary) => {
    setTaskSummary(summary)
    setPhase("questionnaire")
  }

  const finishQuestionnaire = () => {
    clearDraft()
    setPhase("completed")
  }

  const abandonEvaluation = () => {
    clearDraft()
    setPhase("declined")
  }

  const restart = () => {
    clearDraft()
    setTaskSummary(null)
    setPhase("introduction")
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
          {phase !== "declined" && phase !== "transition" && phase !== "completed" && (
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
              Esta pesquisa acadêmica busca entender como as pessoas se relacionam com ferramentas digitais de participação cidadã e fiscalização da infraestrutura urbana. As respostas deste protótipo são apenas demonstrativas e não serão enviadas nem armazenadas.
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
                Você responderá perguntas gerais de perfil e, em seguida, poderá localizar ocorrências, consultar detalhes e interagir, registrar um caso demonstrativo, consultar o painel administrativo e responder ao questionário. As respostas e interações ficam isoladas nesta sessão; não há coleta oficial de dados.
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
                  O consentimento é necessário para continuar. Você pode desistir depois e descartar as respostas provisórias.
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
            <CardDescription>Confira o perfil antes de encerrar esta etapa demonstrativa. Nada será enviado.</CardDescription>
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
              <AlertDescription>Elas permanecem somente na memória do navegador e serão descartadas ao concluir a avaliação ou desistir.</AlertDescription>
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

      {phase === "completed" && (
        <Card>
          <CardHeader>
            <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Check aria-hidden="true" className="size-6" />
            </div>
            <CardTitle>Avaliação demonstrativa concluída</CardTitle>
            <CardDescription>Obrigado por avaliar sua experiência com o FiscalizaSP.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Tarefas práticas concluídas: {taskSummary?.completed ?? 0} · Puladas: {taskSummary?.skipped ?? 0}.
            </p>
            <Alert>
              <LockKeyhole aria-hidden="true" />
              <AlertTitle>Dados de teste descartados</AlertTitle>
              <AlertDescription>Nenhuma ocorrência, comentário, apoio ou voto desta avaliação foi publicado ou preservado.</AlertDescription>
            </Alert>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Esta avaliação ainda é demonstrativa e não constitui uma coleta oficial de dados científicos.
            </p>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="button" variant="outline" onClick={restart}>
              Voltar ao início da apresentação
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
        Protótipo demonstrativo · Sem conexão com banco de dados · Sem coleta ou envio de respostas
      </p>
    </section>
  )
}
