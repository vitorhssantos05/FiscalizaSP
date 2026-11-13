import { createClient } from "@/lib/supabase/client"

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

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ nickname: normalizedNickname })
    .eq("user_id", user.id)

  if (profileError) throw profileError

  return user.id
}
