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
import useSWR from "swr"
import { toast } from "sonner"
import type {
  Occurrence,
  OccurrenceStatus,
  Priority,
  Comment,
  UserVoteRecord,
} from "@/lib/types"
import { initialOccurrences } from "@/lib/mock-data"

const demonstrationOccurrences: Occurrence[] = initialOccurrences.map((occurrence) => ({
  ...occurrence,
  isDemonstration: true,
}))
const demonstrationOccurrenceIds = new Set(demonstrationOccurrences.map((occurrence) => occurrence.id))
import { calculateDynamicPriority } from "@/lib/types"
import { startAnonymousParticipant } from "@/lib/supabase/anonymous-participant"
import {
  castPriorityVoteRemote,
  createComment,
  createOccurrence,
  fetchMyInteractions,
  fetchOccurrences,
  fetchStoredNickname,
  recordFeedbackRemote,
  supportOccurrenceRemote,
  updateOccurrenceStatusRemote,
  type NewOccurrenceInput,
} from "@/lib/supabase/occurrences"

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

export type { NewOccurrenceInput }

interface AppContextType {
  nickname: string | null
  nicknameDialogOpen: boolean
  isSubmittingNickname: boolean
  requestNickname: (action: () => void) => void
  submitNickname: (name: string) => void
  closeNicknameDialog: () => void

  isDarkMode: boolean
  toggleDarkMode: () => void

  isDemo: boolean
  isLoadingOccurrences: boolean
  occurrencesError: boolean
  occurrences: Occurrence[]
  addOccurrence: (occurrence: NewOccurrenceInput) => Promise<void>
  updateOccurrenceStatus: (id: string, status: OccurrenceStatus) => Promise<void>
  supportOccurrence: (id: string) => Promise<boolean>
  voteOnPriority: (id: string, priority: Priority) => Promise<boolean>
  confirmResolution: (id: string) => Promise<boolean>
  contestResolution: (id: string) => Promise<boolean>
  contestExistence: (id: string) => Promise<boolean>
  addComment: (occurrenceId: string, message: string) => Promise<void>

  userVotes: UserVoteRecord[]
  getUserVote: (occurrenceId: string) => UserVoteRecord | undefined
  canChangeVote: (occurrenceId: string) => boolean
  getUserInteraction: (occurrenceId: string) => UserInteractionRecord

  stats: {
    total: number
    pendentes: number
    emAnalise: number
    resolvidas: number
  }

  getDynamicPriority: (occurrence: Occurrence) => Priority
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({
  children,
  initialNickname = null,
  demo = false,
}: {
  children: ReactNode
  initialNickname?: string | null
  // Demo mode keeps every change in memory so guided evaluation tasks never touch real data.
  demo?: boolean
}) {
  const persistent = !demo

  const {
    data: remoteOccurrences,
    error: remoteOccurrencesError,
    isLoading: isLoadingRemoteOccurrences,
    mutate: mutateOccurrences,
  } = useSWR(persistent ? "occurrences" : null, fetchOccurrences, { revalidateOnFocus: true })
  const { data: remoteInteractions, mutate: mutateInteractions } = useSWR(
    persistent ? "my-occurrence-interactions" : null,
    fetchMyInteractions,
  )
  const { data: storedNickname, mutate: mutateStoredNickname } = useSWR(
    persistent ? "stored-nickname" : null,
    fetchStoredNickname,
  )

  const [localNickname, setLocalNickname] = useState<string | null>(initialNickname)
  const nickname = localNickname ?? storedNickname ?? null
  const nicknameRef = useRef<string | null>(initialNickname)
  nicknameRef.current = nickname
  const [nicknameDialogOpen, setNicknameDialogOpen] = useState(false)
  const [isSubmittingNickname, setIsSubmittingNickname] = useState(false)
  const pendingNicknameAction = useRef<(() => void) | null>(null)

  const requestNickname = useCallback((action: () => void) => {
    if (nicknameRef.current) {
      action()
      return
    }
    pendingNicknameAction.current = action
    setNicknameDialogOpen(true)
  }, [])

  const runPendingNicknameAction = useCallback((name: string) => {
    nicknameRef.current = name
    setLocalNickname(name)
    setNicknameDialogOpen(false)
    const pendingAction = pendingNicknameAction.current
    pendingNicknameAction.current = null
    pendingAction?.()
  }, [])

  const submitNickname = useCallback((name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    if (!persistent) {
      runPendingNicknameAction(trimmedName)
      return
    }

    setIsSubmittingNickname(true)
    startAnonymousParticipant(trimmedName)
      .then(() => {
        void mutateStoredNickname(trimmedName, { revalidate: false })
        void mutateInteractions()
        runPendingNicknameAction(trimmedName)
      })
      .catch((error: unknown) => {
        toast.error("Não foi possível iniciar sua participação", {
          description: error instanceof Error ? error.message : "Tente novamente em instantes.",
        })
      })
      .finally(() => setIsSubmittingNickname(false))
  }, [persistent, runPendingNicknameAction, mutateStoredNickname, mutateInteractions])

  const closeNicknameDialog = useCallback(() => {
    pendingNicknameAction.current = null
    setNicknameDialogOpen(false)
  }, [])

  const [isDarkMode, setIsDarkMode] = useState(true)
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

  // In-memory state used only in demo mode.
  // In persistent mode it holds only the "Demonstração" examples, which are never sent to Supabase.
  const [localOccurrences, setLocalOccurrences] = useState<Occurrence[]>(() =>
    persistent ? demonstrationOccurrences : initialOccurrences,
  )
  const [localVotes, setLocalVotes] = useState<UserVoteRecord[]>([])
  const localVotesRef = useRef<UserVoteRecord[]>([])
  const [localInteractions, setLocalInteractions] = useState<Record<string, UserInteractionRecord>>({})
  const localInteractionsRef = useRef<Record<string, UserInteractionRecord>>({})

  const realOccurrences = useMemo(
    () => (persistent ? (remoteOccurrences ?? []) : localOccurrences),
    [persistent, remoteOccurrences, localOccurrences],
  )
  const occurrences = useMemo(() => {
    if (!persistent) return localOccurrences
    const realIds = new Set(realOccurrences.map((occurrence) => occurrence.id))
    return [...realOccurrences, ...localOccurrences.filter((occurrence) => !realIds.has(occurrence.id))]
  }, [persistent, realOccurrences, localOccurrences])
  const userVotes = useMemo(
    () => (persistent ? [...(remoteInteractions?.votes ?? []), ...localVotes] : localVotes),
    [persistent, remoteInteractions, localVotes],
  )
  const userInteractions = useMemo(
    () => (persistent ? { ...localInteractions, ...(remoteInteractions?.interactions ?? {}) } : localInteractions),
    [persistent, remoteInteractions, localInteractions],
  )

  const isLocalOccurrence = useCallback(
    (id: string) => !persistent || demonstrationOccurrenceIds.has(id),
    [persistent],
  )

  const refreshRemote = useCallback(async () => {
    await Promise.all([mutateOccurrences(), mutateInteractions()])
  }, [mutateOccurrences, mutateInteractions])

  const getUserInteraction = useCallback(
    (occurrenceId: string) => userInteractions[occurrenceId] ?? emptyUserInteraction,
    [userInteractions],
  )

  const updateLocalInteraction = useCallback(
    (occurrenceId: string, update: (current: UserInteractionRecord) => UserInteractionRecord) => {
      const current = localInteractionsRef.current[occurrenceId] ?? emptyUserInteraction
      const next = update(current)
      if (next === current) return false

      const nextInteractions = { ...localInteractionsRef.current, [occurrenceId]: next }
      localInteractionsRef.current = nextInteractions
      setLocalInteractions(nextInteractions)
      return true
    },
    [],
  )

  const incrementLocal = useCallback(
    (id: string, field: "supports" | "confirmations" | "contestations" | "existenceContestations") => {
      setLocalOccurrences((prev) =>
        prev.map((occ) => (occ.id === id ? { ...occ, [field]: occ[field] + 1 } : occ)),
      )
    },
    [],
  )

  const addOccurrence = useCallback(async (occurrence: NewOccurrenceInput) => {
    if (persistent) {
      await createOccurrence(occurrence)
      await refreshRemote()
      return
    }

    const { imageFile, ...fields } = occurrence
    const newOccurrence: Occurrence = {
      ...fields,
      id: `occ-${Date.now()}`,
      status: "pendente",
      createdAt: new Date(),
      supports: 0,
      confirmations: 0,
      contestations: 0,
      existenceContestations: 0,
      comments: [],
      imageUrl: imageFile ? URL.createObjectURL(imageFile) : undefined,
      priorityVotes: {
        baixa: occurrence.initialPriority === "baixa" ? 1 : 0,
        media: occurrence.initialPriority === "media" ? 1 : 0,
        alta: occurrence.initialPriority === "alta" ? 1 : 0,
      },
    }
    setLocalOccurrences((prev) => [newOccurrence, ...prev])
  }, [persistent, refreshRemote])

  const updateOccurrenceStatus = useCallback(async (id: string, status: OccurrenceStatus) => {
    if (!isLocalOccurrence(id)) {
      await updateOccurrenceStatusRemote(id, status)
      await mutateOccurrences()
      return
    }
    setLocalOccurrences((prev) => prev.map((occ) => (occ.id === id ? { ...occ, status } : occ)))
  }, [isLocalOccurrence, mutateOccurrences])

  const supportOccurrence = useCallback(async (id: string) => {
    if (!isLocalOccurrence(id)) {
      const added = await supportOccurrenceRemote(id)
      await refreshRemote()
      return added
    }
    const added = updateLocalInteraction(id, (current) =>
      current.hasSupported || current.hasContestedExistence ? current : { ...current, hasSupported: true },
    )
    if (added) incrementLocal(id, "supports")
    return added
  }, [isLocalOccurrence, refreshRemote, updateLocalInteraction, incrementLocal])

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

  const voteOnPriority = useCallback(async (id: string, priority: Priority) => {
    if (!isLocalOccurrence(id)) {
      const recorded = await castPriorityVoteRemote(id, priority)
      await refreshRemote()
      return recorded
    }

    const existingVote = localVotesRef.current.find((vote) => vote.occurrenceId === id)
    if (existingVote?.hasChanged || existingVote?.priority === priority) return false

    const nextVotes = existingVote
      ? localVotesRef.current.map((vote) =>
          vote.occurrenceId === id ? { ...vote, priority, hasChanged: true } : vote,
        )
      : [...localVotesRef.current, { occurrenceId: id, priority, hasChanged: false }]

    localVotesRef.current = nextVotes
    setLocalVotes(nextVotes)
    setLocalOccurrences((prev) =>
      prev.map((occurrence) => {
        if (occurrence.id !== id) return occurrence
        const nextPriorityVotes = { ...occurrence.priorityVotes }
        if (existingVote) {
          nextPriorityVotes[existingVote.priority] = Math.max(0, nextPriorityVotes[existingVote.priority] - 1)
        }
        nextPriorityVotes[priority] += 1
        return { ...occurrence, priorityVotes: nextPriorityVotes }
      }),
    )
    return true
  }, [isLocalOccurrence, refreshRemote])

  const confirmResolution = useCallback(async (id: string) => {
    if (!isLocalOccurrence(id)) {
      const recorded = await recordFeedbackRemote(id, "confirmacao_resolucao")
      await refreshRemote()
      return recorded
    }
    const recorded = updateLocalInteraction(id, (current) =>
      current.resolutionFeedback ? current : { ...current, resolutionFeedback: "confirmation" },
    )
    if (recorded) incrementLocal(id, "confirmations")
    return recorded
  }, [isLocalOccurrence, refreshRemote, updateLocalInteraction, incrementLocal])

  const contestResolution = useCallback(async (id: string) => {
    if (!isLocalOccurrence(id)) {
      const recorded = await recordFeedbackRemote(id, "contestacao_resolucao")
      await refreshRemote()
      return recorded
    }
    const recorded = updateLocalInteraction(id, (current) =>
      current.resolutionFeedback ? current : { ...current, resolutionFeedback: "contestation" },
    )
    if (recorded) incrementLocal(id, "contestations")
    return recorded
  }, [isLocalOccurrence, refreshRemote, updateLocalInteraction, incrementLocal])

  const contestExistence = useCallback(async (id: string) => {
    if (!isLocalOccurrence(id)) {
      const recorded = await recordFeedbackRemote(id, "contestacao_existencia")
      await refreshRemote()
      return recorded
    }
    const recorded = updateLocalInteraction(id, (current) =>
      current.hasContestedExistence || current.hasSupported
        ? current
        : { ...current, hasContestedExistence: true },
    )
    if (recorded) incrementLocal(id, "existenceContestations")
    return recorded
  }, [isLocalOccurrence, refreshRemote, updateLocalInteraction, incrementLocal])

  const addComment = useCallback(async (occurrenceId: string, message: string) => {
    const author = nicknameRef.current
    if (!isLocalOccurrence(occurrenceId)) {
      if (!author) throw new Error("Apelido ausente.")
      await createComment(occurrenceId, author, message)
      await mutateOccurrences()
      return
    }

    const newComment: Comment = {
      id: `comment-${Date.now()}`,
      author: author || "Visitante",
      message,
      createdAt: new Date(),
    }
    setLocalOccurrences((prev) =>
      prev.map((occ) => (occ.id === occurrenceId ? { ...occ, comments: [...occ.comments, newComment] } : occ)),
    )
  }, [isLocalOccurrence, mutateOccurrences])

  const stats = useMemo(() => ({
    total: realOccurrences.length,
    pendentes: realOccurrences.filter((o) => o.status === "pendente").length,
    emAnalise: realOccurrences.filter((o) => o.status === "em_analise").length,
    resolvidas: realOccurrences.filter((o) => o.status === "resolvida").length,
  }), [realOccurrences])

  const getDynamicPriority = useCallback(
    (occurrence: Occurrence) => calculateDynamicPriority(occurrence.priorityVotes),
    [],
  )

  const value = useMemo(
    () => ({
      nickname,
      nicknameDialogOpen,
      isSubmittingNickname,
      requestNickname,
      submitNickname,
      closeNicknameDialog,
      isDarkMode,
      toggleDarkMode,
      isDemo: demo,
      isLoadingOccurrences: persistent && isLoadingRemoteOccurrences,
      occurrencesError: persistent && !!remoteOccurrencesError,
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
      isSubmittingNickname,
      requestNickname,
      submitNickname,
      closeNicknameDialog,
      isDarkMode,
      toggleDarkMode,
      demo,
      persistent,
      isLoadingRemoteOccurrences,
      remoteOccurrencesError,
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
    ],
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
