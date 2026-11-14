import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import type { Database } from "@/lib/supabase/database.types"
import { requireSupabaseConfig } from "@/lib/supabase/config"

export async function createClient() {
  const { url, key } = requireSupabaseConfig()
  const cookieStore = await cookies()

  return createServerClient<Database>(
    url,
    key,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            )
          } catch {
            // Server Components cannot write cookies; proxy.ts refreshes them.
          }
        },
      },
    },
  )
}
