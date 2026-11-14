"use client"

import { useState } from "react"
import { Download, LockKeyhole, RefreshCw } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Results = {
  totals: { participants: number; completed: number; abandoned: number; completionRate: number | null; averageQuestionnaireDurationMs: number | null }
  taskSummary: { taskKey: string; completed: number; completionRate: number | null; averageDurationMs: number | null }[]
  likert: { questionKey: string; average: number | null; distribution: number[] }[]
  openAnswers: { participant_id: string; question_key: string; answer: unknown }[]
}

function formatSeconds(value: number | null) {
  return value === null ? "—" : `${(value / 1000).toFixed(1)} s`
}

function csvValue(value: unknown) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`
}

export function AdminResultsPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)

  const loadResults = async (shouldSignIn = true) => {
    setLoading(true)
    setError(null)
    const supabase = createClient()
    if (shouldSignIn) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
      if (loginError) {
        const message = loginError.message.toLowerCase()
        setError(message.includes("confirm") ? "Confirme o e-mail da conta administrativa antes de entrar." : "Credenciais administrativas inválidas.")
        setLoading(false)
        return
      }
    }
    const response = await fetch("/api/admin/evaluation-results", { cache: "no-store" })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      if (response.status === 403) setError(payload.error ?? "A conta autenticada não tem permissão administrativa.")
      else if (response.status === 401) setError("A sessão administrativa expirou. Entre novamente.")
      else setError("Falha de comunicação com o servidor ao consultar o Supabase.")
      setAuthenticated(response.status !== 401)
    } else {
      setResults(payload)
      setAuthenticated(true)
    }
    setLoading(false)
  }

  const logout = async () => {
    await createClient().auth.signOut()
    setResults(null)
    setAuthenticated(false)
    setEmail("")
    setPassword("")
    setError("Sessão administrativa encerrada.")
  }

  const exportCsv = () => {
    if (!results) return
    const rows = [
      ["Métrica", "Valor"],
      ["Participantes", results.totals.participants],
      ["Concluídas", results.totals.completed],
      ["Abandonos", results.totals.abandoned],
      ["Taxa de conclusão", results.totals.completionRate === null ? "" : `${(results.totals.completionRate * 100).toFixed(1)}%`],
      ...results.taskSummary.map((task) => [`Tarefa ${task.taskKey} - tempo médio`, formatSeconds(task.averageDurationMs)]),
      ["Questionário - tempo médio", formatSeconds(results.totals.averageQuestionnaireDurationMs)],
      ...results.likert.map((item) => [`${item.questionKey} - média`, item.average?.toFixed(2) ?? ""]),
      ...results.openAnswers.map((answer) => [answer.question_key, answer.answer]),
    ]
    const blob = new Blob([rows.map((row) => row.map(csvValue).join(",")).join("\n")], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "resultados-avaliacao.csv"
    anchor.click()
    URL.revokeObjectURL(url)
  }

  if (!results) {
    return (
      <section className="container mx-auto max-w-xl px-4 py-12">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><LockKeyhole className="size-5" />Resultados da Pesquisa</CardTitle></CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">Entre com uma conta autenticada que esteja cadastrada em <code>admin_users</code>.</p>
            <div className="flex flex-col gap-2"><Label htmlFor="admin-email">E-mail administrativo</Label><Input id="admin-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
            <div className="flex flex-col gap-2"><Label htmlFor="admin-password">Senha</Label><Input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></div>
            {error && <Alert variant="destructive"><AlertTitle>Acesso negado</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="flex-1" onClick={() => loadResults(true)} disabled={loading || !email || !password}>{loading ? "Validando..." : "Entrar e carregar resultados"}</Button>
              <Button className="flex-1" variant="outline" onClick={() => loadResults(false)} disabled={loading}>Verificar sessão existente</Button>
            </div>
          </CardContent>
        </Card>
      </section>
    )
  }

  return (
    <section className="container mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Resultados da Pesquisa</h1><p className="text-sm text-muted-foreground">Dados reais retornados pelo Supabase, protegidos por autenticação administrativa.</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" onClick={() => loadResults(false)}><RefreshCw className="mr-2 size-4" />Atualizar</Button><Button variant="outline" onClick={logout}>Sair</Button><Button onClick={exportCsv}><Download className="mr-2 size-4" />Exportar CSV</Button></div></div>
      {results.totals.participants === 0 ? <Alert><AlertTitle>Nenhuma avaliação registrada</AlertTitle><AlertDescription>Os resultados aparecerão aqui quando participantes concluírem ou abandonarem a avaliação.</AlertDescription></Alert> : <>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["Participantes", results.totals.participants], ["Concluídas", results.totals.completed], ["Abandonos", results.totals.abandoned], ["Taxa de conclusão", results.totals.completionRate === null ? "—" : `${(results.totals.completionRate * 100).toFixed(1)}%`]].map(([label, value]) => <Card key={String(label)}><CardContent className="pt-6"><p className="text-2xl font-bold">{value}</p><p className="text-sm text-muted-foreground">{label}</p></CardContent></Card>)}</div>
        <Card><CardHeader><CardTitle>Tempos e conclusão por tarefa</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Tarefa</TableHead><TableHead>Concluídas</TableHead><TableHead>Taxa</TableHead><TableHead>Tempo médio</TableHead></TableRow></TableHeader><TableBody>{results.taskSummary.map((task) => <TableRow key={task.taskKey}><TableCell><Badge variant="outline">{task.taskKey}</Badge></TableCell><TableCell>{task.completed}</TableCell><TableCell>{task.completionRate === null ? "—" : `${(task.completionRate * 100).toFixed(1)}%`}</TableCell><TableCell>{formatSeconds(task.averageDurationMs)}</TableCell></TableRow>)}<TableRow><TableCell>Questionário</TableCell><TableCell>{results.totals.completed}</TableCell><TableCell>—</TableCell><TableCell>{formatSeconds(results.totals.averageQuestionnaireDurationMs)}</TableCell></TableRow></TableBody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle>Médias Likert e distribuição</CardTitle></CardHeader><CardContent><Table><TableHeader><TableRow><TableHead>Questão</TableHead><TableHead>Média</TableHead><TableHead>Respostas 1 · 2 · 3 · 4 · 5</TableHead></TableRow></TableHeader><TableBody>{results.likert.map((item) => <TableRow key={item.questionKey}><TableCell>{item.questionKey}</TableCell><TableCell>{item.average?.toFixed(2) ?? "—"}</TableCell><TableCell>{item.distribution.join(" · ")}</TableCell></TableRow>)}</TableBody></Table></CardContent></Card>
        <Card><CardHeader><CardTitle>Respostas abertas</CardTitle></CardHeader><CardContent className="flex flex-col gap-3">{results.openAnswers.length ? results.openAnswers.map((answer, index) => <div key={`${answer.participant_id}-${answer.question_key}-${index}`} className="rounded-md border p-3"><p className="text-sm font-medium">{answer.question_key}</p><p className="whitespace-pre-wrap text-sm text-muted-foreground">{String(answer.answer ?? "")}</p></div>) : <p className="text-sm text-muted-foreground">Nenhuma resposta aberta registrada.</p>}</CardContent></Card>
      </>}
    </section>
  )
}
