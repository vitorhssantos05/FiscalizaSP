import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import type { Database } from "@/lib/supabase/database.types"
import { getSupabaseConfig, SUPABASE_UNAVAILABLE_MESSAGE } from "@/lib/supabase/config"

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })
  const config = getSupabaseConfig()

  if (!config) {
    // Only the public landing page can run without a configured auth service.
    if (request.nextUrl.pathname === "/" && ["GET", "HEAD"].includes(request.method)) {
      return response
    }
    return NextResponse.json(
      { error: SUPABASE_UNAVAILABLE_MESSAGE },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    )
  }

  const supabase = createServerClient<Database>(
    config.url,
    config.key,
    {
      cookieOptions: { secure: process.env.NODE_ENV === "production" },
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  await supabase.auth.getUser()
  return response
}
