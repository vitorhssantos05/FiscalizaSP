"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

export const taskHints = {
  "find-occurrence": { seconds: 60, initial: "utilize a busca pelo nome ou os filtros para facilitar a localização.", additional: "No mapa, toque em um marcador para ler o resumo. Depois, use a Lista para localizar a mesma ocorrência; a busca e os filtros podem ajudar." },
  "interact-with-occurrence": { seconds: 90, initial: "explore as informações da ocorrência e as opções de interação disponíveis.", additional: "Role os detalhes da mesma ocorrência para encontrar as opções de comentário, apoio e voto de prioridade." },
  "register-test": { seconds: 120, initial: "observe os campos do formulário e preencha as informações solicitadas.", additional: "Confira título, descrição e categoria, selecione um ponto no mapa e procure o botão de registro. A imagem é opcional." },
  "admin-panel": { seconds: 45, initial: "Explore o painel administrativo e conheça as informações disponíveis. Ao final, procure a seção de gerenciamento de ocorrências para realizar a atividade.", additional: "A tabela Gerenciar Ocorrências fica no final da página. Nela, você pode selecionar uma ocorrência e alterar seu status." },
} as const

export function EvaluationTaskHint({ taskId, elapsedSeconds, active, view }: {
  taskId: keyof typeof taskHints
  elapsedSeconds: number
  active: boolean
  view: "map" | "list"
}) {
  const [dismissed, setDismissed] = useState(false)
  const hint = taskHints[taskId]
  const initial = taskId === "find-occurrence" && view === "map"
    ? "toque em um marcador para identificar uma ocorrência."
    : hint.initial

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm leading-snug text-muted-foreground">Dica: {initial}</p>
      {active && !dismissed && elapsedSeconds >= hint.seconds && (
        <Alert className="flex items-start gap-2 px-3 py-2" role="status">
          <AlertDescription className="flex-1">Precisa de ajuda? {hint.additional}</AlertDescription>
          <Button type="button" variant="ghost" size="icon" className="size-11 shrink-0" aria-label="Dispensar dica adicional" onClick={() => setDismissed(true)}><X /></Button>
        </Alert>
      )}
    </div>
  )
}
