import { createHmac, timingSafeEqual } from "node:crypto"
import { cookies } from "next/headers"

const COOKIE_NAME = "fiscalizasp_admin_session"
const SESSION_DURATION_SECONDS = 60 * 60 * 8
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

const attempts = new Map<string, { count: number; resetAt: number }>()

type SessionPayload = { sub: "admin"; exp: number }

function secret() {
  return process.env.ADMIN_SESSION_SECRET
}

function sign(value: string) {
  return createHmac("sha256", secret() ?? "").update(value).digest("base64url")
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export function isAdminConfigured() {
  return Boolean(process.env.ADMIN_NAME && process.env.ADMIN_ACCESS_CODE && secret())
}

export function credentialsMatch(name: string, code: string) {
  if (!isAdminConfigured()) return false
  return safeEqual(name.trim(), process.env.ADMIN_NAME!) && safeEqual(code, process.env.ADMIN_ACCESS_CODE!)
}

export function canAttempt(key: string) {
  const now = Date.now()
  const current = attempts.get(key)
  if (!current || current.resetAt <= now) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  if (current.count >= MAX_ATTEMPTS) return false
  current.count += 1
  return true
}

export function createAdminToken() {
  const payload: SessionPayload = { sub: "admin", exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS }
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url")
  return `${encoded}.${sign(encoded)}`
}

export async function setAdminSession() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, createAdminToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  })
}

export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 })
}

export async function hasAdminSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return false
  const [encoded, signature] = token.split(".")
  if (!encoded || !signature || !secret() || !safeEqual(signature, sign(encoded))) return false
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString()) as SessionPayload
    return payload.sub === "admin" && payload.exp > Math.floor(Date.now() / 1000)
  } catch {
    return false
  }
}

export const adminSessionCookieName = COOKIE_NAME
