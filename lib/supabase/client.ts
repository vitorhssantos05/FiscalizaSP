import { createBrowserClient } from "@supabase/ssr"
import type { Database } from "@/lib/supabase/database.types"
import { requireSupabaseConfig } from "@/lib/supabase/config"

export function createClient() {
  const { url, key } = requireSupabaseConfig()
  return createBrowserClient<Database>(
    url,
    key,
    { cookieOptions: { secure: process.env.NODE_ENV === "production" } },
  )
}
