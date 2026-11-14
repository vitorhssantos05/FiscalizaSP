"use client"

import { useState } from "react"
import { ArrowLeft, ArrowRight, Check, ClipboardCheck, LockKeyhole, X } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

const statements = [
  "A interface do FiscalizaSP é simples e fácil de utilizar.",
  "A navegação entre as funcionalidades é intuitiva.",
  "Foi fácil localizar as funcionalidades necessárias.",
  "O processo de registro de ocorrências é claro e compreensível.",
  "As informações apresentadas sobre as ocorrências são organizadas.",
  "Os recursos de comentários, apoios e votação são fáceis de utilizar.",
  "Os indicadores e gráficos administrativos são fáceis de compreender.",
  "O FiscalizaSP pode contribuir para o acompanhamento de problemas de infraestrutura urbana.",
  "O desempenho da plataforma durante a avaliação foi satisfatório.",
  "Eu utilizaria uma plataforma como o FiscalizaSP para acompanhar problemas urbanos.",
]

const scale = [
  { value: "1", label: "Discordo totalmente" },
  { value: "2", label: "Discordo parcialmente" },
  { value: "3", label: "Nem concordo nem discordo" },
  { value: "4", label: "Concordo parcialmente" },
  { value: "5", label: "Concordo totalmente" },
  { value: "prefer-not", label: "Prefiro não responder" },
]

type LikertAnswer = 1 | 2 | 3 | 4 | 5 | "prefer-not" | null

type QuestionnaireAnswers = {
  likert: LikertAnswer[]
  difficulties: string
  improvements: string
}

const emptyAnswers: QuestionnaireAnswers = {
  likert: statements.map(() => null),
  difficulties: "",
  improvements: "",
}

interface EvaluationQuestionnaireProps {
  onFinish: () => void
  onAbandon: () => void
}

export function EvaluationQuestionnaire({ onFinish, onAbandon }: EvaluationQuestionnaireProps) {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(emptyAnswers)
  const [view, setView] = useState<"form" | "review">("form")

  const updateLikert = (index: number, value: string | null) => {
    const answer: LikertAnswer = value === "prefer-not" ? value : value ? Number(value) as 1 | 2 | 3 | 4 | 5 : null
    setAnswers((current) => ({
      ...current,
      likert: current.likert.map((currentAnswer, answerIndex) => answerIndex === index ? answer : currentAnswer),
    }))
  }

  const getAnswerLabel = (value: LikertAnswer) => {
    if (value === null) return "Sem resposta"
    return scale.find((option) => option.value === String(value))?.label ?? "Sem resposta"
  }

  return (
    <section className="container mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:py-12" aria-labelledby="questionnaire-title">
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1">
            <ClipboardCheck aria-hidden="true" />
            Etapa 5 de 5
          </Badge>
          <span className="text-sm text-muted-foreground">Questionário demonstrativo</span>
        </div>
        <div>
          <h1 id="questionnaire-title" className="text-balance text-3xl font-bold tracking-tight md:text-4xl">
            Avalie sua experiência
          </h1>
          <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">
            Todas as respostas são opcionais. Você pode deixar perguntas sem resposta, escolher “Prefiro não responder” e revisar tudo antes de finalizar.
          </p>
        </div>
      </header>

      {view === "form" ? (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Etapa 5 de 5 · Questionário</span>
              <span>Respostas opcionais</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Progresso da avaliação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={80}>
              <div className="h-full w-4/5 rounded-full bg-primary" />
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Afirmações sobre a plataforma</CardTitle>
              <CardDescription>Selecione uma opção em cada afirmação ou avance sem responder.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-7">
              {statements.map((statement, index) => {
                const groupId = `likert-${index + 1}`
                return (
                  <fieldset key={statement} className="flex min-w-0 flex-col gap-3 border-b pb-6 last:border-b-0 last:pb-0">
                    <legend className="font-medium leading-relaxed">{index + 1}. {statement}</legend>
                    <RadioGroup
                      value={answers.likert[index] === null ? "" : String(answers.likert[index])}
                      onValueChange={(value) => updateLikert(index, value)}
                      aria-label={`Resposta para a afirmação ${index + 1}`}
                      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3"
                    >
                      {scale.map((option, optionIndex) => {
                        const optionId = `${groupId}-${option.value}`
                        return (
                          <Label key={option.value} htmlFor={optionId} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 font-normal transition-colors hover:bg-accent/50 has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                            <RadioGroupItem id={optionId} value={option.value} aria-label={option.label} />
                            {option.value !== "prefer-not" && <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{option.value}</span>}
                            <span className="text-sm">{option.label}</span>
                            {optionIndex === 5 && <span className="sr-only">, alternativa explícita de recusa</span>}
                          </Label>
                        )
                      })}
                    </RadioGroup>
                    {answers.likert[index] && (
                      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => updateLikert(index, "")}>
                        Limpar resposta
                      </Button>
                    )}
                  </fieldset>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Perguntas abertas</CardTitle>
              <CardDescription>As duas respostas são opcionais e podem ficar em branco.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <Label htmlFor="evaluation-difficulties">Quais dificuldades você encontrou durante a utilização?</Label>
                <Textarea id="evaluation-difficulties" value={answers.difficulties} onChange={(event) => setAnswers((current) => ({ ...current, difficulties: event.target.value }))} rows={3} maxLength={1000} />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="evaluation-improvements">Que melhorias você sugere para o FiscalizaSP?</Label>
                <Textarea id="evaluation-improvements" value={answers.improvements} onChange={(event) => setAnswers((current) => ({ ...current, improvements: event.target.value }))} rows={3} maxLength={1000} />
              </div>
            </CardContent>
          </Card>

          <Alert>
            <LockKeyhole aria-hidden="true" />
            <AlertTitle>Somente nesta demonstração</AlertTitle>
            <AlertDescription>As respostas permanecem apenas na memória desta tela. Não são enviadas, armazenadas ou usadas para coleta oficial.</AlertDescription>
          </Alert>

          <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <Button type="button" variant="ghost" onClick={onAbandon}>
              <X data-icon="inline-start" />
              Desistir da avaliação
            </Button>
            <Button type="button" onClick={() => setView("review")}>
              Revisar respostas
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Etapa 5 de 5 · Revisão</span>
              <span>Pronto para finalizar</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-label="Progresso da avaliação" aria-valuemin={0} aria-valuemax={100} aria-valuenow={95}>
              <div className="h-full w-[95%] rounded-full bg-primary" />
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Revise suas respostas</CardTitle>
              <CardDescription>Confira e, se quiser, volte para alterar qualquer resposta. Questões sem resposta não recebem nota.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {statements.map((statement, index) => (
                <div key={statement} className="flex flex-col gap-1 rounded-lg border p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                  <p className="text-sm font-medium leading-relaxed">{index + 1}. {statement}</p>
                  <p className="shrink-0 text-sm text-primary sm:text-right">{getAnswerLabel(answers.likert[index])}</p>
                </div>
              ))}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border p-4">
                  <h2 className="text-sm font-medium">Dificuldades</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{answers.difficulties || "Sem resposta"}</p>
                </div>
                <div className="rounded-lg border p-4">
                  <h2 className="text-sm font-medium">Melhorias sugeridas</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{answers.improvements || "Sem resposta"}</p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
              <Button type="button" variant="outline" onClick={() => setView("form")}>
                <ArrowLeft data-icon="inline-start" />
                Editar respostas
              </Button>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="ghost" onClick={onAbandon}>Desistir e descartar</Button>
                <Button type="button" onClick={onFinish}>
                  Finalizar avaliação
                  <Check data-icon="inline-end" />
                </Button>
              </div>
            </CardFooter>
          </Card>
          <p className="text-center text-xs text-muted-foreground">Nenhuma resposta será salva ao finalizar.</p>
        </>
      )}
    </section>
  )
}
