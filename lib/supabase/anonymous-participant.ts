import { createClient } from "@/lib/supabase/client"
import type { Json } from "@/lib/supabase/database.types"

export class EvaluationRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code?: string) {
    super(message)
  }
}

async function getAnonymousAccessToken() {
  const { data, error } = await createClient().auth.getSession()
  if (error) throw error
  const session = data.session
  if (!session || session.user.is_anonymous !== true) return null
  return session.access_token
}

async function sendEvaluationAction(body: Record<string, unknown>) {
  const token = await getAnonymousAccessToken()
  if (!token) throw new EvaluationRequestError("Sessão anônima não iniciada.", 401)
  const response = await fetch("/api/evaluation", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string; code?: string }
    throw new EvaluationRequestError(payload.error ?? "Falha ao salvar a avaliação.", response.status, payload.code)
  }
}

export async function startEvaluation(demographicData: Record<string, string>) {
  await sendEvaluationAction({ action: "start", demographicData })
}

export async function recordEvaluationTasks(tasks: Json[], practicalDurationMs: number) {
  await sendEvaluationAction({ action: "tasks", tasks, practicalDurationMs })
}

export async function finalizeEvaluation(answers: Json[]) {
  await sendEvaluationAction({ action: "finalize", answers })
}

export async function withdrawEvaluation() {
  try {
    await sendEvaluationAction({ action: "withdraw" })
  } catch {
    // Withdrawal must never block the participant from leaving the study.
  }
}

export async function startAnonymousParticipant(nickname: string) {
  const normalizedNickname = nickname.trim()

  if (normalizedNickname.length < 1 || normalizedNickname.length > 40) {
    throw new Error("O apelido deve ter entre 1 e 40 caracteres.")
  }

  const supabase = createClient()
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) throw sessionError

  let user = sessionData.session?.user ?? null

  if (!user) {
    const { data, error } = await supabase.auth.signInAnonymously()
    if (error) throw error
    user = data.user
  }

  if (!user) throw new Error("Não foi possível iniciar uma sessão anônima.")
  if (user.is_anonymous !== true) {
    throw new Error("Esta ação exige uma sessão anônima de participante.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .update({ nickname: normalizedNickname })
    .eq("user_id", user.id)
    .select("user_id")
    .single()

  if (profileError) throw profileError
  if (!profile) throw new Error("Não foi possível salvar o apelido do participante.")

  return user.id
}
