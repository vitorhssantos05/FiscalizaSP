import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"
import { test } from "node:test"
import vm from "node:vm"
import ts from "typescript"

const require = createRequire(import.meta.url)
function load(relative, overrides = {}) {
  const source = readFileSync(new URL(relative, import.meta.url), "utf8")
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  const exports = {}
  vm.runInNewContext(compiled, { exports, require: (name) => overrides[name] ?? require(name), console })
  return exports
}
const metrics = load("../lib/evaluation-results.ts")
const row = (status, duration) => ({ status, total_duration_ms: duration })

function endpoint({ status = "completed", authenticated = true, anonymous = true, total = 1000, population = [row("completed", 1000)], aggregateError = false, tasks = [{ task_key: "find-occurrence", status: "skipped", duration_ms: null }] } = {}) {
  const calls = []
  const supabase = {
    auth: { getUser: async () => ({ data: { user: authenticated ? { id: "own-user", is_anonymous: anonymous } : null }, error: null }) },
    from(table) {
      const call = { table, filters: [] }
      calls.push(call)
      const query = {
        select(fields) { call.fields = fields; return query },
        eq(key, value) { call.filters.push([key, value]); return query },
        order() { return query },
        range(start, end) { return Promise.resolve({ data: population.slice(start, end + 1).map(({ total_duration_ms }) => ({ total_duration_ms })), error: aggregateError ? new Error("offline") : null }) },
        maybeSingle() { return Promise.resolve({ data: status ? row(status, total) : null, error: null }) },
        then(resolve) { return Promise.resolve({ data: tasks, error: null }).then(resolve) },
      }
      return query
    },
  }
  const route = load("../app/api/evaluation/result/route.ts", {
    "@/lib/supabase/admin": { createAdminSupabase: () => supabase },
    "@/lib/evaluation-results": metrics,
  })
  return { calls, get: (token = "test-only-token") => route.GET(new Request("http://localhost/api/evaluation/result?user_id=someone-else", { headers: token ? { Authorization: `Bearer ${token}` } : {} })) }
}

test("média preserva zero, ignora null e exclui sessões não concluídas", () => {
  const summary = metrics.summarizeEvaluationDurations([row("completed", null), row("completed", 0), row("completed", 2000), row("in_progress", 8000), row("withdrawn", 9000)])
  assert.equal(summary.averageTotalDurationMs, 1000)
  assert.equal(summary.completedCount, 3)
  assert.equal(summary.comparableCount, 2)
})

test("nenhum tempo, um participante e nova conclusão", () => {
  assert.equal(metrics.summarizeEvaluationDurations([row("completed", null)]).averageTotalDurationMs, null)
  assert.equal(metrics.summarizeEvaluationDurations([]).comparableCount, 0)
  const participants = [row("completed", 1000)]
  assert.equal(metrics.summarizeEvaluationDurations(participants).comparableCount, 1)
  participants.push(row("completed", 3000))
  assert.equal(metrics.summarizeEvaluationDurations(participants).averageTotalDurationMs, 2000)
})

test("formatação distingue ausência de zero e suporta horas", () => {
  assert.equal(metrics.formatEvaluationDuration(null), "Não disponível")
  assert.equal(metrics.formatEvaluationDuration(0), "0min 00s")
  assert.equal(metrics.formatEvaluationDuration(174000), "2min 54s")
  assert.equal(metrics.formatEvaluationDuration(3601000), "1h 0min 1s")
})

test("endpoint exige sessão anônima válida e conclusão salva", async () => {
  assert.equal((await endpoint().get(null)).status, 401)
  assert.equal((await endpoint({ authenticated: false }).get()).status, 401)
  assert.equal((await endpoint({ anonymous: false }).get()).status, 401)
  for (const status of [null, "in_progress", "withdrawn"]) {
    const api = endpoint({ status })
    assert.equal((await api.get()).status, 409)
    assert.equal(api.calls.length, 1)
  }
})

test("resultado é do usuário validado, sem IDs nem respostas de terceiros", async () => {
  const api = endpoint({ total: null })
  const response = await api.get()
  assert.equal(response.status, 200)
  assert.equal(response.headers.get("cache-control"), "private, no-store")
  const result = await response.json()
  assert.deepEqual(Object.keys(result).sort(), ["comparison", "tasks", "totalDurationMs"])
  assert.equal(result.totalDurationMs, null)
  assert.deepEqual(result.tasks, [{ taskKey: "find-occurrence", status: "skipped", durationMs: null }])
  assert.ok(api.calls[0].filters.some(([key, value]) => key === "user_id" && value === "own-user"))
  assert.ok(api.calls[1].filters.some(([key, value]) => key === "participant_id" && value === "own-user"))
  assert.equal(api.calls[2].fields, "total_duration_ms")
  assert.ok(api.calls[2].filters.some(([key, value]) => key === "status" && value === "completed"))
})

test("agregação percorre mais de 1000 registros sem truncamento", async () => {
  const api = endpoint({ population: [...Array.from({ length: 1000 }, () => row("completed", 1000)), row("completed", 3000), row("completed", null)] })
  const result = await (await api.get()).json()
  assert.equal(result.comparison.completedCount, 1002)
  assert.equal(result.comparison.comparableCount, 1001)
  assert.equal(result.comparison.averageTotalDurationMs, 1003000 / 1001)
})

test("falha da comparação não apaga resultados nem inventa média", async () => {
  const result = await (await endpoint({ aggregateError: true }).get()).json()
  assert.equal(result.totalDurationMs, 1000)
  assert.equal(result.comparison, null)
})

test("consulta posterior reflete novas conclusões", async () => {
  const population = [row("completed", 1000)]
  const api = endpoint({ population })
  assert.equal((await (await api.get()).json()).comparison.averageTotalDurationMs, 1000)
  population.push(row("completed", 3000))
  assert.equal((await (await api.get()).json()).comparison.averageTotalDurationMs, 2000)
})
