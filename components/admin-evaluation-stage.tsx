"use client"

import { useState } from "react"
import { Check, ShieldAlert } from "lucide-react"
import { AdminPage } from "@/components/admin-page"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

export type AdminEvaluationTaskId = "admin-panel"
export type AdminEvaluationEvent = "admin-panel-consulted"

interface AdminEvaluationStageProps {
  onComplete: (event: AdminEvaluationEvent, result: string) => void
}

const panelSections = [
  { id: "indicators", label: "Indicadores gerais" },
  { id: "categories", label: "Gráfico por categoria" },
  { id: "status", label: "Gráfico por status" },
  { id: "priority", label: "Gráfico por prioridade" },
  { id: "table", label: "Tabela de ocorrências" },
] as const

type PanelSectionId = (typeof panelSections)[number]["id"]

export function AdminEvaluationStage({ onComplete }: AdminEvaluationStageProps) {
  const [consultedSections, setConsultedSections] = useState<PanelSectionId[]>([])
  const allSectionsConsulted = consultedSections.length === panelSections.length

  const toggleSection = (section: PanelSectionId, checked: boolean) => {
    setConsultedSections((current) => checked
      ? current.includes(section) ? current : [...current, section]
      : current.filter((item) => item !== section),
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <Alert>
        <ShieldAlert aria-hidden="true" />
        <AlertTitle>Painel demonstrativo e isolado</AlertTitle>
        <AlertDescription>Consulte os indicadores, gráficos e a tabela. O painel usa somente dados temporários desta avaliação, não concede privilégios reais e nenhuma alteração é publicada na navegação pública.</AlertDescription>
      </Alert>

      <AdminPage />

      <Card>
        <CardHeader>
          <CardTitle>O que você consultou?</CardTitle>
          <CardDescription>Marque cada seção depois de observá-la. Não há perguntas de interpretação nem necessidade de alterar ocorrências.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          {panelSections.map((section) => {
            const inputId = `admin-panel-${section.id}`
            const checked = consultedSections.includes(section.id)
            return (
              <Label key={section.id} htmlFor={inputId} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border p-3 font-normal hover:bg-accent/50">
                <Checkbox id={inputId} checked={checked} onCheckedChange={(value) => toggleSection(section.id, value === true)} />
                <span>{section.label}</span>
              </Label>
            )
          })}
        </CardContent>
        <CardFooter className="justify-end border-t pt-6">
          <Button onClick={() => onComplete("admin-panel-consulted", "all-sections-consulted")} disabled={!allSectionsConsulted}>
            Concluir consulta ao painel
            <Check data-icon="inline-end" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
