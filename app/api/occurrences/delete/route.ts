import { NextResponse } from "next/server"
import { createAdminSupabase } from "@/lib/supabase/admin"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const IMAGE_BUCKET = "occurrence-images"

export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  if (!token) return NextResponse.json({ error: "Sessão anônima ausente." }, { status: 401 })

  const supabase = createAdminSupabase()
  const { data: userData, error: userError } = await supabase.auth.getUser(token)
  if (userError || userData?.user?.is_anonymous !== true) {
    return NextResponse.json({ error: "Sessão anônima inválida." }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as { occurrenceId?: unknown } | null
  const occurrenceId = typeof body?.occurrenceId === "string" ? body.occurrenceId : ""
  if (!UUID_PATTERN.test(occurrenceId)) {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 })
  }

  // Demonstration records (is_demo = true) are never deletable.
  const { data, error } = await supabase
    .from("occurrences")
    .delete()
    .eq("id", occurrenceId)
    .eq("is_demo", false)
    .select("id, image_path")
    .maybeSingle()

  if (error) {
    console.error("[occurrences] delete failed", error.code, error.message)
    return NextResponse.json({ error: "Não foi possível excluir a ocorrência." }, { status: 500 })
  }
  if (!data) return NextResponse.json({ error: "Ocorrência não encontrada." }, { status: 404 })

  if (data.image_path) {
    const { error: storageError } = await supabase.storage.from(IMAGE_BUCKET).remove([data.image_path])
    if (storageError) console.error("[occurrences] image cleanup failed", storageError.message)
  }

  return NextResponse.json({ ok: true })
}
