"use client"

import { useEffect, useRef } from "react"
import { AdminPage } from "@/components/admin-page"
import { useApp } from "@/lib/app-context"

export type AdminEvaluationTaskId = "admin-panel"
export type AdminEvaluationEvent = "admin-status-resolved" | "admin-status-attempt-failed"

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
      .filter((occurrence) => occurrence.status !== "resolvida")
      .forEach((occurrence) => onCompleteRef.current("admin-status-attempt-failed", occurrence.id))

    const completedOccurrence = changedFromPending.find((occurrence) => occurrence.status === "resolvida")
    if (completedOccurrence) {
      onCompleteRef.current("admin-status-resolved", completedOccurrence.id)
    }
  }, [occurrences])

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <p className="text-sm text-muted-foreground">Simulação isolada: as alterações não modificam ocorrências públicas.</p>
      <AdminPage evaluationMode />
    </div>
  )
}
