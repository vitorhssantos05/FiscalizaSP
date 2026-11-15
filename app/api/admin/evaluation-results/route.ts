import { NextResponse } from "next/server"
import { createAdminSupabase } from "@/lib/supabase/admin"
import { evaluationTaskCatalog, likertStatements, openQuestions, profileQuestions } from "@/lib/evaluation-catalog"

export const dynamic = "force-dynamic"

const average = (values: number[]) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null)

export async function GET() {
  const supabase = createAdminSupabase()
  const [participantsResult, tasksResult, answersResult] = await Promise.all([
    supabase.from("evaluation_participants").select("user_id,status,demographic_data,total_duration_ms,questionnaire_duration_ms,practical_duration_ms"),
    supabase.from("evaluation_tasks").select("participant_id,task_key,status,duration_ms,result"),
    supabase.from("evaluation_answers").select("participant_id,question_key,answer"),
  ])

  if (participantsResult.error || tasksResult.error || answersResult.error) {
    console.error("[admin-results] query failed", participantsResult.error ?? tasksResult.error ?? answersResult.error)
    return NextResponse.json({ error: "Não foi possível consultar os resultados." }, { status: 500 })
  }

  const participants = participantsResult.data
  const completedParticipants = participants.filter((participant) => participant.status === "completed")
  const completedIds = new Set(completedParticipants.map((participant) => participant.user_id))
  const tasks = tasksResult.data.filter((task) => completedIds.has(task.participant_id))
  const answers = answersResult.data.filter((answer) => completedIds.has(answer.participant_id))

  const taskSummary = evaluationTaskCatalog.map(({ id, title }) => {
    const rows = tasks.filter((task) => task.task_key === id)
    const completed = rows.filter((task) => task.status === "completed")
    return {
      taskKey: id,
      title,
      completed: completed.length,
      skipped: rows.filter((task) => task.status === "skipped").length,
      completionRate: completedParticipants.length ? completed.length / completedParticipants.length : null,
      averageDurationMs: average(completed.map((task) => task.duration_ms ?? 0)),
    }
  })

  const likert = likertStatements.map(({ id, text, negative }) => {
    const values = answers
      .filter((answer) => answer.question_key === id && typeof answer.answer === "number")
      .map((answer) => (negative ? 6 - (answer.answer as number) : (answer.answer as number)))
    return {
      questionKey: id,
      text,
      responses: values.length,
      average: average(values),
      distribution: [1, 2, 3, 4, 5].map((value) => values.filter((answer) => answer === value).length),
    }
  })

  const profile = profileQuestions.map(({ key, shortTitle, options }) => ({
    key,
    title: shortTitle,
    distribution: options.map((option) => ({
      label: option.label,
      count: completedParticipants.filter((participant) => {
        const data = participant.demographic_data as Record<string, unknown> | null
        return data?.[key] === option.value
      }).length,
    })),
  }))

  const openQuestionTitles = Object.fromEntries(openQuestions.map((question) => [question.id, question.text]))
  const anonymousLabels = new Map(
    completedParticipants.map((participant, index) => [participant.user_id, `P${String(index + 1).padStart(3, "0")}`]),
  )

  return NextResponse.json({
    totals: {
      participants: participants.length,
      completed: completedParticipants.length,
      inProgress: participants.filter((participant) => participant.status === "in_progress").length,
      abandoned: participants.filter((participant) => participant.status === "withdrawn").length,
      completionRate: participants.length ? completedParticipants.length / participants.length : null,
      averageTotalDurationMs: average(completedParticipants.map((participant) => participant.total_duration_ms ?? 0)),
      averagePracticalDurationMs: average(completedParticipants.filter((participant) => participant.practical_duration_ms !== null).map((participant) => participant.practical_duration_ms ?? 0)),
      averageQuestionnaireDurationMs: average(completedParticipants.map((participant) => participant.questionnaire_duration_ms ?? 0)),
      overallLikertAverage: average(likert.flatMap((item) => (item.average === null ? [] : [item.average]))),
    },
    taskSummary,
    likert,
    profile,
    openAnswers: answers
      .filter((answer) => answer.question_key in openQuestionTitles && typeof answer.answer === "string" && answer.answer.trim())
      .map((answer) => ({
        participant_id: anonymousLabels.get(answer.participant_id) ?? "anônimo",
        question_key: answer.question_key,
        question_title: openQuestionTitles[answer.question_key],
        answer: answer.answer,
      })),
  })
}
