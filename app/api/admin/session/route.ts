import { NextResponse } from "next/server"
import { canAttempt, clearAdminSession, credentialsMatch, isAdminConfigured, setAdminSession } from "@/lib/admin-session"

export async function POST(request: Request) {
  if (!isAdminConfigured()) return NextResponse.json({ error: "Acesso administrativo ainda não configurado no ambiente." }, { status: 503 })
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  if (!canAttempt(ip)) return NextResponse.json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, { status: 429 })
  const body = await request.json().catch(() => ({})) as { name?: string; code?: string }
  if (!credentialsMatch(body.name ?? "", body.code ?? "")) return NextResponse.json({ error: "Nome de administrador ou código inválido." }, { status: 401 })
  await setAdminSession()
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await clearAdminSession()
  return NextResponse.json({ ok: true })
}
