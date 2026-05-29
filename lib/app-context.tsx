"use client"

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  type ReactNode,
} from "react"
import type {
  Occurrence,
  User,
  OccurrenceStatus,
  Priority,
  Comment,
  UserVoteRecord,
} from "@/lib/types"
import { initialOccurrences, mockUser, mockAdminUser } from "@/lib/mock-data"
import { calculateDynamicPriority } from "@/lib/types"

interface AppContextType {
  // User state
  user: User | null
  isAuthenticated: boolean
  isAdminMode: boolean
  login: (email: string, password: string, asAdmin?: boolean, name?: string) => void
  logout: () => void
  toggleAdminMode: () => void

  // Theme state
  isDarkMode: boolean
  toggleDarkMode: () => void

  // Occurrences state
  occurrences: Occurrence[]
  addOccurrence: (occurrence: Omit<Occurrence, "id" | "createdAt" | "supports" | "confirmations" | "contestations" | "comments" | "priorityVotes" | "existenceContestations">) => void
  updateOccurrenceStatus: (id: string, status: OccurrenceStatus) => void
  supportOccurrence: (id: string) => void
  voteOnPriority: (id: string, priority: Priority) => void
  confirmResolution: (id: string) => void
  contestResolution: (id: string) => void
  contestExistence: (id: string) => void
  addComment: (occurrenceId: string, message: string) => void

  // User vote tracking (Voto Consciente)
  userVotes: UserVoteRecord[]
  getUserVote: (occurrenceId: string) => UserVoteRecord | undefined
  canChangeVote: (occurrenceId: string) => boolean

  // Statistics
  stats: {
    total: number
    pendentes: number
    emAnalise: number
    resolvidas: number
  }

  // Helper to get dynamic priority
  getDynamicPriority: (occurrence: Occurrence) => Priority
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  // User state
  const [user, setUser] = useState<User | null>(null)
  const [isAdminMode, setIsAdminMode] = useState(false)

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Occurrences state
  const [occurrences, setOccurrences] = useState<Occurrence[]>(initialOccurrences)

  // User vote tracking state (Voto Consciente)
  const [userVotes, setUserVotes] = useState<UserVoteRecord[]>([])

  // Auth functions
  const login = useCallback((email: string, _password: string, asAdmin = false, name?: string) => {
    // Mock login - always succeeds
    if (asAdmin) {
      setUser(mockAdminUser)
      setIsAdminMode(true)
    } else {
      const userName = name || email.split("@")[0] || "Usuario"
      const userEmail = email || "usuario@email.com"
      setUser({
        id: `user-${Date.now()}`,
        name: userName,
        email: userEmail,
        isAdmin: false,
        avatar: undefined,
      })
      setIsAdminMode(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setIsAdminMode(false)
    setUserVotes([]) // Limpa votos ao fazer logout
  }, [])

  const toggleAdminMode = useCallback(() => {
    setIsAdminMode((prev) => !prev)
  }, [])

  // Theme functions
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const newValue = !prev
      if (newValue) {
        document.documentElement.classList.add("dark")
      } else {
        document.documentElement.classList.remove("dark")
      }
      return newValue
    })
  }, [])

  // Occurrence functions
  const addOccurrence = useCallback(
    (
      occurrence: Omit<
        Occurrence,
        "id" | "createdAt" | "supports" | "confirmations" | "contestations" | "comments" | "priorityVotes" | "existenceContestations"
      >
    ) => {
      const newOccurrence: Occurrence = {
        ...occurrence,
        id: `occ-${Date.now()}`,
        createdAt: new Date(),
        supports: 0,
        confirmations: 0,
        contestations: 0,
        existenceContestations: 0,
        comments: [],
        priorityVotes: {
          baixa: occurrence.initialPriority === "baixa" ? 1 : 0,
          media: occurrence.initialPriority === "media" ? 1 : 0,
          alta: occurrence.initialPriority === "alta" ? 1 : 0,
        },
      }
      setOccurrences((prev) => [newOccurrence, ...prev])
    },
    []
  )

  const updateOccurrenceStatus = useCallback(
    (id: string, status: OccurrenceStatus) => {
      setOccurrences((prev) =>
        prev.map((occ) => (occ.id === id ? { ...occ, status } : occ))
      )
    },
    []
  )

  const supportOccurrence = useCallback((id: string) => {
    setOccurrences((prev) =>
      prev.map((occ) =>
        occ.id === id ? { ...occ, supports: occ.supports + 1 } : occ
      )
    )
  }, [])

  // Vote tracking helper functions
  const getUserVote = useCallback((occurrenceId: string): UserVoteRecord | undefined => {
    return userVotes.find(v => v.occurrenceId === occurrenceId)
  }, [userVotes])

  const canChangeVote = useCallback((_occurrenceId: string): boolean => {
    // MVP: permite votos ilimitados para testes
    // Implementacao futura: limitar a uma alteracao por ocorrencia
    return true
  }, [])

  const voteOnPriority = useCallback((id: string, priority: Priority) => {
    const existingVote = userVotes.find(v => v.occurrenceId === id)

    // Atualiza os votos na ocorrencia
    setOccurrences((prev) =>
      prev.map((occ) => {
        if (occ.id !== id) return occ
        
        // Se esta alterando o voto, remove o voto anterior e adiciona o novo
        if (existingVote) {
          return {
            ...occ,
            priorityVotes: {
              ...occ.priorityVotes,
              [existingVote.priority]: Math.max(0, occ.priorityVotes[existingVote.priority] - 1),
              [priority]: occ.priorityVotes[priority] + 1,
            },
          }
        }
        
        // Primeiro voto
        return {
          ...occ,
          priorityVotes: {
            ...occ.priorityVotes,
            [priority]: occ.priorityVotes[priority] + 1,
          },
        }
      })
    )

    // Atualiza o registro de votos do usuario (sem limitar alteracoes - MVP)
    setUserVotes((prev) => {
      const existing = prev.find(v => v.occurrenceId === id)
      if (existing) {
        return prev.map(v => 
          v.occurrenceId === id 
            ? { ...v, priority, hasChanged: true }
            : v
        )
      }
      return [...prev, { occurrenceId: id, priority, hasChanged: false }]
    })
  }, [userVotes])

  const confirmResolution = useCallback((id: string) => {
    setOccurrences((prev) =>
      prev.map((occ) =>
        occ.id === id
          ? { ...occ, confirmations: occ.confirmations + 1 }
          : occ
      )
    )
  }, [])

  const contestResolution = useCallback((id: string) => {
    setOccurrences((prev) =>
      prev.map((occ) =>
        occ.id === id
          ? { ...occ, contestations: occ.contestations + 1 }
          : occ
      )
    )
  }, [])

  const contestExistence = useCallback((id: string) => {
    setOccurrences((prev) =>
      prev.map((occ) =>
        occ.id === id
          ? { ...occ, existenceContestations: occ.existenceContestations + 1 }
          : occ
      )
    )
  }, [])

  const addComment = useCallback((occurrenceId: string, message: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author: user?.name || "Usuario Anonimo",
      message,
      createdAt: new Date(),
    }
    setOccurrences((prev) =>
      prev.map((occ) =>
        occ.id === occurrenceId
          ? { ...occ, comments: [...occ.comments, newComment] }
          : occ
      )
    )
  }, [user?.name])

  // Statistics
  const stats = useMemo(() => {
    return {
      total: occurrences.length,
      pendentes: occurrences.filter((o) => o.status === "pendente").length,
      emAnalise: occurrences.filter((o) => o.status === "em_analise").length,
      resolvidas: occurrences.filter((o) => o.status === "resolvida").length,
    }
  }, [occurrences])

  // Helper function
  const getDynamicPriority = useCallback((occurrence: Occurrence) => {
    return calculateDynamicPriority(occurrence.priorityVotes)
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: user !== null,
      isAdminMode,
      login,
      logout,
      toggleAdminMode,
      isDarkMode,
      toggleDarkMode,
      occurrences,
      addOccurrence,
      updateOccurrenceStatus,
      supportOccurrence,
      voteOnPriority,
      confirmResolution,
      contestResolution,
      contestExistence,
      addComment,
      userVotes,
      getUserVote,
      canChangeVote,
      stats,
      getDynamicPriority,
    }),
    [
      user,
      isAdminMode,
      login,
      logout,
      toggleAdminMode,
      isDarkMode,
      toggleDarkMode,
      occurrences,
      addOccurrence,
      updateOccurrenceStatus,
      supportOccurrence,
      voteOnPriority,
      confirmResolution,
      contestResolution,
      contestExistence,
      addComment,
      userVotes,
      getUserVote,
      canChangeVote,
      stats,
      getDynamicPriority,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider")
  }
  return context
}
