import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/database.types"

function createAdminSupabase() {
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function GET() {
  const supabase = createAdminSupabase()

  const [{ data: participants, error: participantsError }, { data: tasks, error: tasksError }, { data: answers, error: answersError }] = await Promise.all([
    supabase.from("evaluation_participants").select("user_id,status,total_duration_ms,questionnaire_duration_ms"),
    supabase.from("evaluation_tasks").select("participant_id,task_key,status,duration_ms"),
    supabase.from("evaluation_answers").select("participant_id,question_key,answer"),
  ])

  if (participantsError || tasksError || answersError) {
    return NextResponse.json({ error: "Não foi possível consultar os resultados." }, { status: 500 })
  }

  const completedParticipants = participants.filter((participant) => participant.status === "completed")
  const taskKeys = [...new Set(tasks.map((task) => task.task_key))].sort()
  const taskSummary = taskKeys.map((taskKey) => {
    const taskRows = tasks.filter((task) => task.task_key === taskKey)
    const completed = taskRows.filter((task) => task.status === "completed")
    return {
      taskKey,
      completed: completed.length,
      completionRate: participants.length ? completed.length / participants.length : null,
      averageDurationMs: completed.length ? completed.reduce((sum, task) => sum + (task.duration_ms ?? 0), 0) / completed.length : null,
    }
  })

  const likertKeys = [...new Set(answers.filter((answer) => answer.question_key !== "difficulties" && answer.question_key !== "improvements").map((answer) => answer.question_key))].sort()
  const likert = likertKeys.map((questionKey) => {
    const values = answers
      .filter((answer) => answer.question_key === questionKey && typeof answer.answer === "number")
      .map((answer) => answer.answer as number)
    return { questionKey, average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null, distribution: [1, 2, 3, 4, 5].map((value) => values.filter((answer) => answer === value).length) }
  })

  return NextResponse.json({
    totals: {
      participants: participants.length,
      completed: completedParticipants.length,
      abandoned: participants.filter((participant) => participant.status === "withdrawn").length,
      completionRate: participants.length ? completedParticipants.length / participants.length : null,
      averageQuestionnaireDurationMs: completedParticipants.length ? completedParticipants.reduce((sum, participant) => sum + (participant.questionnaire_duration_ms ?? 0), 0) / completedParticipants.length : null,
    },
    taskSummary,
    likert,
    openAnswers: answers.filter((answer) => answer.question_key === "difficulties" || answer.question_key === "improvements"),
  })
}
