import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

function unauthorized(message: string, status = 403) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return unauthorized("Sessão administrativa ausente.", 401)
  if (user.is_anonymous) return unauthorized("Sessões anônimas não podem acessar resultados.", 403)

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle()
  if (adminError) return NextResponse.json({ error: "Falha ao verificar a autorização administrativa." }, { status: 500 })
  if (!admin) return unauthorized("A conta autenticada não está autorizada como administradora.")

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
