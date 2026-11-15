import { NextResponse } from "next/server"
import { createAdminSupabase } from "@/lib/supabase/admin"

const STATUSES = ["pendente", "em_analise", "resolvida"] as const
type Status = (typeof STATUSES)[number]
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Sessão anônima ausente." }, { status: 401 })

  const supabase = createAdminSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || userData?.user?.is_anonymous !== true) {
    return NextResponse.json({ error: "Sessão anônima inválida." }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { occurrenceId?: unknown; status?: unknown } | null
  const occurrenceId = typeof body?.occurrenceId === "string" ? body.occurrenceId : ""
  const status = body?.status as Status
  if (!UUID_PATTERN.test(occurrenceId) || !STATUSES.includes(status)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  const { data, error } = await supabase
    .from("occurrences")
    .update({ status })
    .eq("id", occurrenceId)
    .eq("is_demo", false)
    .select("id")
    .maybeSingle()

  if (error) {
    console.error("[occurrences] status update failed", error.code, error.message)
    return NextResponse.json({ error: "Não foi possível atualizar o status." }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: "Ocorrência não encontrada." }, { status: 404 })

  return NextResponse.json({ ok: true })
}
