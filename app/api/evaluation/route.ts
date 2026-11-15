import { NextResponse } from "next/server"
import type { Json } from "@/lib/supabase/database.types"
import { createAdminSupabase } from "@/lib/supabase/admin"

type EvaluationRequest =
  | { action: "start"; demographicData: Record<string, string> }
  | { action: "tasks"; tasks: Json[]; practicalDurationMs: number }
  | { action: "finalize"; answers: Json[] }
  | { action: "withdraw" }

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Sessão anônima ausente." }, { status: 401 })

  const supabase = createAdminSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  const user = userData?.user
  if (userError || !user || user.is_anonymous !== true) {
    return NextResponse.json({ error: "Sessão anônima inválida." }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as EvaluationRequest | null
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  let error: { code?: string; message: string } | null = null
  switch (body.action) {
    case "start":
      ({ error } = await supabase.rpc("start_evaluation", { p_user_id: user.id, p_demographic_data: body.demographicData }))
      break
    case "tasks":
      ({ error } = await supabase.rpc("record_evaluation_tasks", {
        p_user_id: user.id,
        p_tasks: body.tasks,
        p_practical_duration_ms: Math.round(Number(body.practicalDurationMs)),
      }))
      break
    case "finalize":
      ({ error } = await supabase.rpc("finalize_evaluation", { p_user_id: user.id, p_answers: body.answers }))
      break
    case "withdraw":
      ({ error } = await supabase.rpc("withdraw_evaluation", { p_user_id: user.id }))
      break
    default:
      return NextResponse.json({ error: "Ação desconhecida." }, { status: 400 })
  }

  if (error) {
    console.error("[evaluation] rpc failed", body.action, error.code, error.message)
    const status = error.code === "23505" ? 409 : error.code === "22023" ? 422 : error.code === "42501" ? 403 : 500
    return NextResponse.json({ error: error.message, code: error.code }, { status })
  }

  return NextResponse.json({ ok: true })
}
