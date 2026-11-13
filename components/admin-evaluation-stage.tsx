"use client"

import { useMemo, useState } from "react"
import { Check, ShieldAlert } from "lucide-react"
import { AdminPage } from "@/components/admin-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useApp } from "@/lib/app-context"
import { categoryLabels, type Occurrence, type OccurrenceCategory, type OccurrenceStatus } from "@/lib/types"

export type AdminEvaluationTaskId = "admin-indicators" | "admin-categories" | "admin-status"
export type AdminEvaluationEvent = "admin-indicators-consulted" | "admin-category-identified" | "admin-status-changed"

interface AdminEvaluationStageProps {
  taskId: AdminEvaluationTaskId
  onComplete: (event: AdminEvaluationEvent, result: string) => void
  onInteractionError: (result?: string) => void
}

export function AdminEvaluationStage({ taskId, onComplete, onInteractionError }: AdminEvaluationStageProps) {
  const { occurrences } = useApp()
  const [selectedCategory, setSelectedCategory] = useState<OccurrenceCategory | "">("")
  const [answerFeedback, setAnswerFeedback] = useState<"correct" | "incorrect" | null>(null)

  const categoryCounts = useMemo(() => {
    const counts = new Map<OccurrenceCategory, number>()
    occurrences.forEach((occurrence) => {
      counts.set(occurrence.category, (counts.get(occurrence.category) ?? 0) + 1)
    })
    return Array.from(counts, ([category, count]) => ({
      category,
      label: categoryLabels[category],
      count,
    }))
  }, [occurrences])

  const highestCategoryCount = Math.max(0, ...categoryCounts.map((category) => category.count))
  const mostFrequentCategories = categoryCounts
    .filter((category) => category.count === highestCategoryCount)
    .map((category) => category.category)

  const checkCategoryAnswer = () => {
    if (!selectedCategory) {
      onInteractionError()
      return
    }

    if (mostFrequentCategories.includes(selectedCategory)) {
      setAnswerFeedback("correct")
      onComplete("admin-category-identified", selectedCategory)
      return
    }

    setAnswerFeedback("incorrect")
    onInteractionError(selectedCategory)
  }

  const handleStatusChange = (occurrence: Occurrence, nextStatus: OccurrenceStatus) => {
    if (taskId === "admin-status" && occurrence.status === "pendente" && nextStatus === "em_analise") {
      onComplete("admin-status-changed", occurrence.id)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>Simulação administrativa isolada</AlertTitle>
        <AlertDescription>Este painel usa somente os dados demonstrativos desta avaliação. Não concede privilégios administrativos e nenhuma alteração será publicada na navegação pública.</AlertDescription>
      </Alert>

      <AdminPage onResearchStatusChange={taskId === "admin-status" ? handleStatusChange : undefined} />

      {taskId === "admin-indicators" && (
        <Card>
          <CardHeader>
            <CardTitle>Indicadores consultados?</CardTitle>
            <CardDescription>Depois de observar os indicadores gerais do painel, confirme para registrar esta tarefa como concluída.</CardDescription>
          </CardHeader>
          <CardFooter className="justify-end border-t pt-6">
            <Button onClick={() => onComplete("admin-indicators-consulted", "indicators-viewed")}>
              Já consultei os indicadores
              <Check data-icon="inline-end" />
            </Button>
          </CardFooter>
        </Card>
      )}

      {taskId === "admin-categories" && (
        <Card>
          <CardHeader>
            <CardTitle>Qual categoria apresenta mais ocorrências?</CardTitle>
            <CardDescription>Use o gráfico “Por Categoria” exibido acima. As opções e a resposta válida são calculadas a partir dos mesmos dados demonstrativos do painel.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {categoryCounts.length > 0 ? (
              <RadioGroup
                value={selectedCategory}
                onValueChange={(value) => {
                  setSelectedCategory(value as OccurrenceCategory)
                  setAnswerFeedback(null)
                }}
                aria-label="Categoria com mais ocorrências"
                className="grid gap-2 sm:grid-cols-2"
              >
                {categoryCounts.map(({ category, label, count }) => {
                  const optionId = `admin-category-${category}`
                  return (
                    <Label key={category} htmlFor={optionId} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 font-normal hover:bg-accent/50">
                      <RadioGroupItem id={optionId} value={category} />
                      <span>{label}</span>
                    </Label>
                  )
                })}
              </RadioGroup>
            ) : (
              <p className="text-sm text-muted-foreground">Não há ocorrências para comparar nesta sessão.</p>
            )}
            {answerFeedback === "correct" && (
              <Alert>
                <Check aria-hidden="true" />
                <AlertTitle>Resposta coerente com os dados demonstrativos</AlertTitle>
                <AlertDescription>A categoria selecionada está entre as que apresentam mais ocorrências.</AlertDescription>
              </Alert>
            )}
            {answerFeedback === "incorrect" && (
              <Alert variant="destructive">
                <ShieldAlert aria-hidden="true" />
                <AlertTitle>Revise os gráficos</AlertTitle>
                <AlertDescription>Essa categoria não tem o maior número de ocorrências nesta sessão. Você pode tentar novamente.</AlertDescription>
              </Alert>
            )}
          </CardContent>
          <CardFooter className="justify-end border-t pt-6">
            <Button onClick={checkCategoryAnswer} disabled={!selectedCategory || answerFeedback === "correct"}>
              Conferir resposta
            </Button>
          </CardFooter>
        </Card>
      )}

      {taskId === "admin-status" && (
        <Alert>
          <ShieldAlert aria-hidden="true" />
          <AlertTitle>Alteração somente demonstrativa</AlertTitle>
          <AlertDescription>A tarefa só é concluída ao mudar uma ocorrência de Pendente para Em análise no seletor da tabela acima. A contagem do painel acompanha a mudança dentro desta sessão isolada.</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
