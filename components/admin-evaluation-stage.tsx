"use client"

import { useEffect, useRef } from "react"
import { ShieldAlert } from "lucide-react"
import { AdminPage } from "@/components/admin-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useApp } from "@/lib/app-context"

export type AdminEvaluationTaskId = "admin-panel"
export type AdminEvaluationEvent = "admin-status-changed" | "admin-status-attempt-failed"

interface AdminEvaluationStageProps {
  onComplete: (event: AdminEvaluationEvent, result: string) => void
}

export function AdminEvaluationStage({ onComplete }: AdminEvaluationStageProps) {
  const { occurrences } = useApp()
  const previousStatuses = useRef(new Map(occurrences.map((occurrence) => [occurrence.id, occurrence.status])))
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const changedFromPending = occurrences.filter((occurrence) =>
      previousStatuses.current.get(occurrence.id) === "pendente" && occurrence.status !== "pendente",
    )
    previousStatuses.current = new Map(occurrences.map((occurrence) => [occurrence.id, occurrence.status]))

    changedFromPending
      .filter((occurrence) => occurrence.status !== "em_analise")
      .forEach((occurrence) => onCompleteRef.current("admin-status-attempt-failed", occurrence.id))

    const completedOccurrence = changedFromPending.find((occurrence) => occurrence.status === "em_analise")
    if (completedOccurrence) {
      onCompleteRef.current("admin-status-changed", completedOccurrence.id)
    }
  }, [occurrences])

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>Painel demonstrativo e isolado</AlertTitle>
        <AlertDescription>Selecione na tabela uma ocorrência com status Pendente e altere para Em análise. A tarefa só será concluída quando essa mudança aparecer nos dados temporários desta avaliação.</AlertDescription>
      </Alert>

      <AdminPage />

      <Alert>
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>Sem acesso administrativo real</AlertTitle>
        <AlertDescription>O painel reutiliza a tabela existente, mas as alterações ficam no AppProvider isolado da avaliação e não modificam ocorrências públicas.</AlertDescription>
      </Alert>
    </div>
  )
}
