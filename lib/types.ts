export type OccurrenceCategory =
  | "buraco"
  | "iluminacao"
  | "vazamento"
  | "lixo"
  | "sinalizacao"
  | "outros"

export type OccurrenceStatus = "pendente" | "em_analise" | "resolvida"

export type Priority = "baixa" | "media" | "alta"

export interface PriorityVotes {
  baixa: number
  media: number
  alta: number
}

export interface Comment {
  id: string
  author: string
  message: string
  createdAt: Date
}

// Rastreia os votos do usuario e se ele ja alterou o voto
export interface UserVoteRecord {
  occurrenceId: string
  priority: Priority
  hasChanged: boolean // true se o usuario ja alterou o voto uma vez
}

export interface Occurrence {
  id: string
  title: string
  description: string
  category: OccurrenceCategory
  status: OccurrenceStatus
  initialPriority: Priority
  priorityVotes: PriorityVotes
  neighborhood: string
  address: string
  createdAt: Date
  supports: number
  confirmations: number
  contestations: number
  existenceContestations: number
  latitude: number
  longitude: number
  comments: Comment[]
  imageUrl?: string
}

export interface User {
  id: string
  name: string
  email: string
  isAdmin: boolean
  avatar?: string
}

export const categoryLabels: Record<OccurrenceCategory, string> = {
  buraco: "Buraco na via",
  iluminacao: "Iluminação pública",
  vazamento: "Vazamento de água",
  lixo: "Lixo irregular",
  sinalizacao: "Sinalização danificada",
  outros: "Outros",
}

export const statusLabels: Record<OccurrenceStatus, string> = {
  pendente: "Pendente",
  em_analise: "Em análise",
  resolvida: "Resolvida",
}

export const priorityLabels: Record<Priority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
}

export function calculateDynamicPriority(votes: PriorityVotes): Priority {
  const total = votes.baixa + votes.media + votes.alta
  if (total === 0) return "media"

  const weightedScore =
    (votes.baixa * 1 + votes.media * 2 + votes.alta * 3) / total

  // 1.0-1.6 = baixa, 1.7-2.3 = media, 2.4-3.0 = alta
  if (weightedScore >= 2.4) return "alta"
  if (weightedScore >= 1.7) return "media"
  return "baixa"
}

export function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case "alta":
      return "bg-red-500"
    case "media":
      return "bg-orange-400"
    case "baixa":
      return "bg-yellow-300"
  }
}

export function getStatusColor(status: OccurrenceStatus): string {
  switch (status) {
    case "pendente":
      return "bg-orange-500"
    case "em_analise":
      return "bg-blue-500"
    case "resolvida":
      return "bg-green-500"
  }
}
