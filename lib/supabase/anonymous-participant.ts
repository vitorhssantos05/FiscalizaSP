import { createClient } from "@/lib/supabase/client"
import type { Json } from "@/lib/supabase/database.types"

export async function getAnonymousParticipantId() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  const user = data.session?.user
  if (!user || user.is_anonymous !== true) return null
  return user.id
}

export async function startEvaluation(pDemographicData: Record<string, string>) {
  const userId = await getAnonymousParticipantId()
  if (!userId) return false
  const { error } = await createClient().rpc("start_evaluation", {
    p_user_id: userId,
    p_demographic_data: pDemographicData,
  })
  if (error) throw error
  return true
}

export async function finalizeEvaluation(pAnswers: Json[]) {
  const userId = await getAnonymousParticipantId()
  if (!userId) return false
  const { error } = await createClient().rpc("finalize_evaluation", {
    p_user_id: userId,
    p_answers: pAnswers,
  })
  if (error) throw error
  return true
}

export async function withdrawEvaluation() {
  const userId = await getAnonymousParticipantId()
  if (!userId) return
  await createClient().rpc("withdraw_evaluation", { p_user_id: userId })
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
