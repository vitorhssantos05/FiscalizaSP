import { NextResponse } from "next/server"
import { createAdminSupabase } from "@/lib/supabase/admin"
import { summarizeEvaluationDurations, type EvaluationResult } from "@/lib/evaluation-results"

export const dynamic = "force-dynamic"

const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" }

export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Sessão ausente." }, { status: 401, headers })

  const supabase = createAdminSupabase()
  const { data: auth, error: authError } = await supabase.auth.getUser(token)
  if (authError || !auth.user || auth.user.is_anonymous !== true) {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401, headers })
  }

  const { data: participant, error: participantError } = await supabase
    .from("evaluation_participants")
    .select("status,total_duration_ms")
    .eq("user_id", auth.user.id)
    .maybeSingle()

  if (participantError) return NextResponse.json({ error: "Não foi possível consultar seu resultado." }, { status: 500, headers })
  if (participant?.status !== "completed") {
    return NextResponse.json({ error: "Não há avaliação concluída nesta sessão." }, { status: 409, headers })
  }

  const { data: tasks, error: tasksError } = await supabase
    .from("evaluation_tasks")
    .select("task_key,status,duration_ms")
    .eq("participant_id", auth.user.id)
  if (tasksError) return NextResponse.json({ error: "Não foi possível consultar suas tarefas." }, { status: 500, headers })

  const participants: { status: string; total_duration_ms: number | null }[] = []
  let comparison: EvaluationResult["comparison"] = null
  // Paginate so PostgREST's row limit never silently truncates the reference average.
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase
      .from("evaluation_participants")
      .select("total_duration_ms")
      .eq("status", "completed")
      .order("user_id")
      .range(offset, offset + 999)
    if (error) break
    participants.push(...data.map((row) => ({ ...row, status: "completed" })))
    if (data.length < 1000) {
      comparison = summarizeEvaluationDurations(participants)
      break
    }
  }

  return NextResponse.json({
    totalDurationMs: participant.total_duration_ms,
    tasks: tasks.map((task) => ({ taskKey: task.task_key, status: task.status, durationMs: task.duration_ms })),
    comparison,
  } satisfies EvaluationResult, { headers })
}
