export const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null

export function summarizeEvaluationDurations(participants: { status: string; total_duration_ms: number | null }[]) {
  const completed = participants.filter((participant) => participant.status === "completed")
  const durations = completed.flatMap((participant) => participant.total_duration_ms === null ? [] : [participant.total_duration_ms])
  return {
    completedCount: completed.length,
    comparableCount: durations.length,
    averageTotalDurationMs: average(durations),
  }
}

export interface EvaluationResult {
  totalDurationMs: number | null
  tasks: { taskKey: string; status: string; durationMs: number | null }[]
  comparison: ReturnType<typeof summarizeEvaluationDurations> | null
}

export function formatEvaluationDuration(durationMs: number | null) {
  if (durationMs === null) return "Não disponível"
  const seconds = Math.round(durationMs / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  return hours > 0 ? `${hours}h ${minutes}min ${remainder}s` : `${minutes}min ${String(remainder).padStart(2, "0")}s`
}
