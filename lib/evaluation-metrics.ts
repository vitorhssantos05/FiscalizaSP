export type EvaluationTaskStatus = "completed" | "skipped" | "interrupted"
export type EvaluationStatus = "in-progress" | "completed" | "abandoned"

export interface LikertMetricAnswer {
  questionId: string
  kind: "rating"
  value: 1 | 2 | 3 | 4 | 5
}

export interface QuestionnaireMetrics {
  likert: LikertMetricAnswer[]
  durationSeconds: number
  openAnswers: {
    difficulties: string | null
    improvements: string | null
  }
}

export interface EvaluationTaskMetric {
  taskId: string
  startedAt: number
  endedAt: number
  durationSeconds: number
  status: EvaluationTaskStatus
  failedAttempts: number
}

export interface EvaluationMetrics {
  startedAt: number
  endedAt: number | null
  durationSeconds: number | null
  status: EvaluationStatus
  tasks: EvaluationTaskMetric[]
  completedTasks: number
  skippedTasks: number
  interruptedTasks: number
  completionRate: number | null
  abandonmentRate: number | null
  averageTaskDurationSeconds: number | null
  questionnaireDurationSeconds: number | null
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
    durationSeconds: null,
    status: "in-progress",
    tasks: [],
    completedTasks: 0,
    skippedTasks: 0,
    interruptedTasks: 0,
    completionRate: null,
    abandonmentRate: null,
    averageTaskDurationSeconds: null,
    questionnaireDurationSeconds: null,
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
      durationSeconds: Math.max(0, endedAt - source.startedAt) / 1000,
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
    durationSeconds: Math.max(0, endedAt - metrics.startedAt) / 1000,
    status,
    completedTasks: tasks.filter((task) => task.status === "completed").length,
    skippedTasks: tasks.filter((task) => task.status === "skipped").length,
    interruptedTasks: tasks.filter((task) => task.status === "interrupted").length,
    completionRate: status === "completed" ? 1 : 0,
    abandonmentRate: status === "abandoned" ? 1 : 0,
    averageTaskDurationSeconds: tasks.length
      ? tasks.reduce((total, task) => total + task.durationSeconds, 0) / tasks.length
      : null,
    questionnaireDurationSeconds: questionnaire?.durationSeconds ?? null,
    questionnaireCompleted: status === "completed" && questionnaire !== undefined,
    ...(questionnaire ? { questionnaire } : {}),
  }
}
