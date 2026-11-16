"use client"

import { useState } from "react"
import { Building2, Check, Copy, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatEvaluationDuration, type EvaluationResult } from "@/lib/evaluation-results"

export const evaluationInviteUrl = "https://fiscaliza-sp-cmp.vercel.app/"
export const evaluationInviteText = `Participei do desafio cidadão do FiscalizaSP! Explore a plataforma, participe da avaliação acadêmica e compare seu resultado comigo: ${evaluationInviteUrl}`

export function EvaluationShareCard({ result, completedTasks }: { result: EvaluationResult; completedTasks: number }) {
  const [feedback, setFeedback] = useState("")
  const [manualCopy, setManualCopy] = useState(false)
  const [sharing, setSharing] = useState(false)
  const comparison = result.comparison

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(evaluationInviteText)
      setManualCopy(false)
      setFeedback("Convite copiado!")
    } catch {
      setManualCopy(true)
      setFeedback("Não foi possível copiar automaticamente. Selecione e copie o convite abaixo.")
    }
  }

  const shareInvite = async () => {
    if (sharing) return
    setSharing(true)
    try {
      if (navigator.share) {
        await navigator.share({ title: "FiscalizaSP — Desafio Cidadão", text: evaluationInviteText })
        setFeedback("Convite compartilhado.")
      } else {
        await copyInvite()
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") setFeedback("Compartilhamento cancelado. Sua avaliação continua salva.")
      else await copyInvite()
    } finally {
      setSharing(false)
    }
  }

  return (
    <section aria-labelledby="share-title" className="flex flex-col gap-5">
      <div>
        <h2 id="share-title" className="text-xl font-semibold">Sua participação merece ser compartilhada</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Salve uma captura deste cartão. Ele não contém dados pessoais nem respostas da pesquisa.</p>
      </div>
      <article aria-label="Cartão compartilhável" className="mx-auto w-full max-w-sm overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm">
        <header className="bg-primary px-6 py-5 text-primary-foreground">
          <div className="flex items-center gap-3">
            <Building2 aria-hidden="true" className="size-6 shrink-0" />
            <h3 className="text-base font-bold">FiscalizaSP — Desafio Cidadão</h3>
          </div>
        </header>
        <div className="p-6">
          <div className="flex flex-col gap-5">
            <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary"><Check aria-hidden="true" className="size-5" /></div>
            <p className="text-balance text-2xl font-bold tracking-tight">Concluí o desafio cidadão!</p>
            <dl className="grid grid-cols-2 gap-4">
              <div><dt className="text-sm text-muted-foreground">Meu tempo total</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{formatEvaluationDuration(result.totalDurationMs)}</dd></div>
              <div><dt className="text-sm text-muted-foreground">Tarefas concluídas</dt><dd className="mt-1 text-xl font-semibold tabular-nums">{completedTasks}/4</dd></div>
            </dl>
            {comparison && comparison.averageTotalDurationMs !== null && (
              <p className="rounded-lg bg-muted p-3 text-sm leading-relaxed text-muted-foreground">
                Média geral: <strong className="text-foreground">{formatEvaluationDuration(comparison.averageTotalDurationMs)}</strong>
                {comparison.comparableCount === 1 ? " · preliminar, 1 avaliação com tempo registrado." : " · referência de tempo, não de desempenho."}
              </p>
            )}
            <p className="text-sm font-medium leading-relaxed">Participe também e compare seu resultado!</p>
          </div>
        </div>
        <footer className="border-t px-6 py-4 text-sm text-muted-foreground">
          <a href={evaluationInviteUrl} className="break-all underline-offset-4 hover:underline">fiscaliza-sp-cmp.vercel.app</a>
        </footer>
      </article>
      <div className="text-center">
        <h3 className="font-semibold">Desafie um amigo a participar!</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Compartilhe seu resultado e convide outras pessoas a explorar o FiscalizaSP. Cada participação contribui para nossa pesquisa acadêmica!</p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <Button type="button" variant="outline" onClick={copyInvite}><Copy data-icon="inline-start" />Copiar convite</Button>
        <Button type="button" variant="secondary" onClick={shareInvite} disabled={sharing}><Share2 data-icon="inline-start" />Compartilhar</Button>
      </div>
      <p role="status" className="text-center text-sm text-muted-foreground">{feedback || "O compartilhamento é opcional. Os botões enviam somente o convite."}</p>
      {manualCopy && (
        <div className="flex flex-col gap-2">
          <label htmlFor="evaluation-invite" className="text-sm font-medium">Convite para copiar</label>
          <textarea id="evaluation-invite" readOnly value={evaluationInviteText} onFocus={(event) => event.currentTarget.select()} rows={5} className="w-full rounded-lg border bg-background p-3 text-sm text-foreground" />
        </div>
      )}
    </section>
  )
}
