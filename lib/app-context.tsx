"use client"

import {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useRef,
  type ReactNode,
} from "react"
import type {
  Occurrence,
  OccurrenceStatus,
  Priority,
  Comment,
  UserVoteRecord,
} from "@/lib/types"
import { initialOccurrences } from "@/lib/mock-data"
import { calculateDynamicPriority } from "@/lib/types"

type ResolutionFeedback = "confirmation" | "contestation"

interface UserInteractionRecord {
  hasSupported: boolean
  resolutionFeedback: ResolutionFeedback | null
  hasContestedExistence: boolean
}

const emptyUserInteraction: UserInteractionRecord = {
  hasSupported: false,
  resolutionFeedback: null,
  hasContestedExistence: false,
}

interface AppContextType {
  // Temporary MVP nickname; it is not authentication or a trusted identity.
  nickname: string | null
  nicknameDialogOpen: boolean
  requestNickname: (action: () => void) => void
  submitNickname: (name: string) => void
  closeNicknameDialog: () => void

  // Theme state
  isDarkMode: boolean
  toggleDarkMode: () => void

  // Occurrences state
  occurrences: Occurrence[]
  addOccurrence: (occurrence: Omit<Occurrence, "id" | "createdAt" | "supports" | "confirmations" | "contestations" | "comments" | "priorityVotes" | "existenceContestations">) => void
  updateOccurrenceStatus: (id: string, status: OccurrenceStatus) => void
  supportOccurrence: (id: string) => boolean
  voteOnPriority: (id: string, priority: Priority) => boolean
  confirmResolution: (id: string) => boolean
  contestResolution: (id: string) => boolean
  contestExistence: (id: string) => boolean
  addComment: (occurrenceId: string, message: string) => void

  // Interaction limits are demonstrative and scoped to this app session.
  userVotes: UserVoteRecord[]
  getUserVote: (occurrenceId: string) => UserVoteRecord | undefined
  canChangeVote: (occurrenceId: string) => boolean
  getUserInteraction: (occurrenceId: string) => UserInteractionRecord

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

export function AppProvider({
  children,
  initialNickname = null,
}: {
  children: ReactNode
  initialNickname?: string | null
}) {
  // This in-memory label is temporary and must never be treated as authentication.
  const [nickname, setNickname] = useState<string | null>(initialNickname)
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false)
  const pendingNicknameAction = useRef<(() => void) | null>(null)
  const nicknameRef = useRef<string | null>(initialNickname)

  const requestNickname = useCallback((action: () => void) => {
    if (nickname) {
      action()
      return
    }
    pendingNicknameAction.current = action
    setNicknameDialogOpen(true)
  }, [nickname])

  const submitNickname = useCallback((name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    nicknameRef.current = trimmedName
    setNickname(trimmedName)
    setNicknameDialogOpen(false)
    const pendingAction = pendingNicknameAction.current
    pendingNicknameAction.current = null
    pendingAction?.()
  }, [])

  const closeNicknameDialog = useCallback(() => {
    pendingNicknameAction.current = null
    setNicknameDialogOpen(false)
  }, [])

  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true)

  // Occurrences state
  const [occurrences, setOccurrences] = useState<Occurrence[]>(initialOccurrences)

  // Interaction limits are temporary and apply only to this app session.
  const [userVotes, setUserVotes] = useState<UserVoteRecord[]>([])
  const userVotesRef = useRef<UserVoteRecord[]>([])
  const [userInteractions, setUserInteractions] = useState<Record<string, UserInteractionRecord>>({})
  const userInteractionsRef = useRef<Record<string, UserInteractionRecord>>({})

  const getUserInteraction = useCallback(
    (occurrenceId: string) => userInteractions[occurrenceId] ?? emptyUserInteraction,
    [userInteractions],
  )

  const updateUserInteraction = useCallback(
    (
      occurrenceId: string,
      update: (current: UserInteractionRecord) => UserInteractionRecord,
    ) => {
      const current = userInteractionsRef.current[occurrenceId] ?? emptyUserInteraction
      const next = update(current)
      if (next === current) return false

      const nextInteractions = {
        ...userInteractionsRef.current,
        [occurrenceId]: next,
      }
      userInteractionsRef.current = nextInteractions
      setUserInteractions(nextInteractions)
      return true
    },
    [],
  )

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
    const added = updateUserInteraction(id, (current) =>
      current.hasSupported ? current : { ...current, hasSupported: true },
    )
    if (!added) return false

    setOccurrences((prev) =>
      prev.map((occ) =>
        occ.id === id ? { ...occ, supports: occ.supports + 1 } : occ,
      ),
    )
    return true
  }, [updateUserInteraction])

  const getUserVote = useCallback(
    (occurrenceId: string): UserVoteRecord | undefined =>
      userVotes.find((vote) => vote.occurrenceId === occurrenceId),
    [userVotes],
  )

  const canChangeVote = useCallback(
    (occurrenceId: string): boolean => {
      const vote = userVotes.find((record) => record.occurrenceId === occurrenceId)
      return !vote || !vote.hasChanged
    },
    [userVotes],
  )

  const voteOnPriority = useCallback((id: string, priority: Priority) => {
    const existingVote = userVotesRef.current.find((vote) => vote.occurrenceId === id)
    if (existingVote?.hasChanged || existingVote?.priority === priority) return false

    const nextVotes = existingVote
      ? userVotesRef.current.map((vote) =>
          vote.occurrenceId === id
            ? { ...vote, priority, hasChanged: true }
            : vote,
        )
      : [...userVotesRef.current, { occurrenceId: id, priority, hasChanged: false }]

    userVotesRef.current = nextVotes
    setUserVotes(nextVotes)
    setOccurrences((prev) =>
      prev.map((occurrence) => {
        if (occurrence.id !== id) return occurrence

        const nextPriorityVotes = { ...occurrence.priorityVotes }
        if (existingVote) {
          nextPriorityVotes[existingVote.priority] = Math.max(
            0,
            nextPriorityVotes[existingVote.priority] - 1,
          )
        }
        nextPriorityVotes[priority] += 1

        return { ...occurrence, priorityVotes: nextPriorityVotes }
      }),
    )
    return true
  }, [])

  const confirmResolution = useCallback((id: string) => {
    const recorded = updateUserInteraction(id, (current) =>
      current.resolutionFeedback
        ? current
        : { ...current, resolutionFeedback: "confirmation" },
    )
    if (!recorded) return false

    setOccurrences((prev) =>
      prev.map((occurrence) =>
        occurrence.id === id
          ? { ...occurrence, confirmations: occurrence.confirmations + 1 }
          : occurrence,
      ),
    )
    return true
  }, [updateUserInteraction])

  const contestResolution = useCallback((id: string) => {
    const recorded = updateUserInteraction(id, (current) =>
      current.resolutionFeedback
        ? current
        : { ...current, resolutionFeedback: "contestation" },
    )
    if (!recorded) return false

    setOccurrences((prev) =>
      prev.map((occurrence) =>
        occurrence.id === id
          ? { ...occurrence, contestations: occurrence.contestations + 1 }
          : occurrence,
      ),
    )
    return true
  }, [updateUserInteraction])

  const contestExistence = useCallback((id: string) => {
    const recorded = updateUserInteraction(id, (current) =>
      current.hasContestedExistence
        ? current
        : { ...current, hasContestedExistence: true },
    )
    if (!recorded) return false

    setOccurrences((prev) =>
      prev.map((occurrence) =>
        occurrence.id === id
          ? { ...occurrence, existenceContestations: occurrence.existenceContestations + 1 }
          : occurrence,
      ),
    )
    return true
  }, [updateUserInteraction])

  const addComment = useCallback((occurrenceId: string, message: string) => {
    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author: nicknameRef.current || nickname || "Visitante",
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
  }, [nickname])

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
      nickname,
      nicknameDialogOpen,
      requestNickname,
      submitNickname,
      closeNicknameDialog,
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
      getUserInteraction,
      stats,
      getDynamicPriority,
    }),
    [
      nickname,
      nicknameDialogOpen,
      requestNickname,
      submitNickname,
      closeNicknameDialog,
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
      getUserInteraction,
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
