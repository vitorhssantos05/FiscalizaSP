export type EvaluationTaskStatus = "completed" | "skipped" | "interrupted"
export type EvaluationStatus = "in-progress" | "completed" | "abandoned"

export type LikertMetricAnswer =
  | { kind: "rating"; value: 1 | 2 | 3 | 4 | 5 }
  | { kind: "declined" }
  | { kind: "unanswered" }

export interface QuestionnaireMetrics {
  likert: LikertMetricAnswer[]
  openAnswers: {
    difficulties: string | null
    improvements: string | null
  }
}

export interface EvaluationTaskMetric {
  taskId: string
  startedAt: number
  endedAt: number
  durationMs: number
  status: EvaluationTaskStatus
  failedAttempts: number
}

export interface EvaluationMetrics {
  startedAt: number
  endedAt: number | null
  durationMs: number | null
  status: EvaluationStatus
  tasks: EvaluationTaskMetric[]
  completedTasks: number
  skippedTasks: number
  interruptedTasks: number
  questionnaireCompleted: boolean
  questionnaire?: QuestionnaireMetrics
}

export interface TaskMetricSource {
  taskId: string
  status: "not-started" | "in-progress" | "completed" | "skipped" | "abandoned"
  startedAt: number | null
  completedAt: number | null
  skippedAt: number | null
  abandonedAt: number | null
  errorCount: number
}

export function createInitialEvaluationMetrics(startedAt = Date.now()): EvaluationMetrics {
  return {
    startedAt,
    endedAt: null,
    durationMs: null,
    status: "in-progress",
    tasks: [],
    completedTasks: 0,
    skippedTasks: 0,
    interruptedTasks: 0,
    questionnaireCompleted: false,
  }
}

export function createTaskMetrics(sources: TaskMetricSource[]): EvaluationTaskMetric[] {
  return sources.flatMap((source) => {
    if (source.startedAt === null) return []

    const statusByAttempt = {
      completed: "completed",
      skipped: "skipped",
      abandoned: "interrupted",
    } as const
    const status = source.status === "completed" || source.status === "skipped" || source.status === "abandoned"
      ? statusByAttempt[source.status]
      : null
    const endedAt = source.completedAt ?? source.skippedAt ?? source.abandonedAt

    if (!status || endedAt === null) return []

    return [{
      taskId: source.taskId,
      startedAt: source.startedAt,
      endedAt,
      durationMs: Math.max(0, endedAt - source.startedAt),
      status,
      failedAttempts: source.errorCount,
    }]
  })
}

export function finalizeEvaluationMetrics(
  metrics: EvaluationMetrics,
  status: Exclude<EvaluationStatus, "in-progress">,
  endedAt: number,
  questionnaire?: QuestionnaireMetrics,
): EvaluationMetrics {
  const tasks = metrics.tasks
  return {
    ...metrics,
    endedAt,
    durationMs: Math.max(0, endedAt - metrics.startedAt),
    status,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    skippedTasks: tasks.filter((task) => task.status === "skipped").length,
    interruptedTasks: tasks.filter((task) => task.status === "interrupted").length,
    questionnaireCompleted: status === "completed" && questionnaire !== undefined,
    ...(questionnaire ? { questionnaire } : {}),
  }
}
