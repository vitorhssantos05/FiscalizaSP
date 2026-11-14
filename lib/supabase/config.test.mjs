import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"
import { getSupabaseConfig, requireSupabaseConfig, SUPABASE_UNAVAILABLE_MESSAGE } from "./config.ts"

const names = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]
let original

beforeEach(() => {
  original = Object.fromEntries(names.map((name) => [name, process.env[name]]))
  for (const name of names) delete process.env[name]
})

afterEach(() => {
  for (const name of names) {
    if (original[name] === undefined) delete process.env[name]
    else process.env[name] = original[name]
  }
})

test("missing configuration is unavailable, not a fake client", () => {
  assert.equal(getSupabaseConfig(), null)
  assert.throws(requireSupabaseConfig, { message: SUPABASE_UNAVAILABLE_MESSAGE })
})

test("URL and public key are both required", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
  assert.equal(getSupabaseConfig(), null)
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable"
  assert.equal(getSupabaseConfig(), null)
})

test("publishable key takes precedence over legacy anon key", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co"
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon"
  assert.deepEqual(requireSupabaseConfig(), {
    url: "https://example.supabase.co",
    key: "test-publishable",
  })
})

test("legacy anon key is supported, including a blank publishable key", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = " https://example.supabase.co "
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " "
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon"
  assert.equal(requireSupabaseConfig().key, "test-anon")
  assert.equal(requireSupabaseConfig().url, "https://example.supabase.co")
})

test("invalid or non-HTTP URLs are rejected", () => {
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable"
  for (const url of [" ", "invalid-url", "ftp://example.com"]) {
    process.env.NEXT_PUBLIC_SUPABASE_URL = url
    assert.equal(getSupabaseConfig(), null)
  }
})
