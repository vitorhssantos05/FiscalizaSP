export const SUPABASE_UNAVAILABLE_MESSAGE =
  "O serviço de autenticação e dados está indisponível. A configuração do Supabase precisa ser concluída."

export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()

  if (!url || !key) return null

  try {
    const parsedUrl = new URL(url)
    if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") return null
  } catch {
    return null
  }

  return { url, key }
}

export function requireSupabaseConfig() {
  const config = getSupabaseConfig()
  if (!config) throw new Error(SUPABASE_UNAVAILABLE_MESSAGE)
  return config
}
