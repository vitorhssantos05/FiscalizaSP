import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/database.types"
import type { Comment, Occurrence, OccurrenceStatus, Priority, UserVoteRecord } from "@/lib/types"

const IMAGE_BUCKET = "occurrence-images"
const IMAGE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

type OccurrenceRow = Database["public"]["Tables"]["occurrences"]["Row"]
type CommentRow = Database["public"]["Tables"]["comments"]["Row"]

const OCCURRENCE_COLUMNS =
  "id, title, description, category, status, initial_priority, neighborhood, address, latitude, longitude, image_path, support_count, priority_votes_baixa, priority_votes_media, priority_votes_alta, confirmations, contestations, existence_contestations, created_at"

export interface PersistedInteraction {
  hasSupported: boolean
  resolutionFeedback: "confirmation" | "contestation" | null
  hasContestedExistence: boolean
}

export interface PersistedInteractions {
  interactions: Record<string, PersistedInteraction>
  votes: UserVoteRecord[]
}

export type NewOccurrenceInput = Pick<
  Occurrence,
  "title" | "description" | "category" | "initialPriority" | "neighborhood" | "address" | "latitude" | "longitude"
> & { imageFile?: File | null }

function imageUrlFor(path: string | null) {
  if (!path) return undefined
  return createClient().storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl
}

function toComment(row: Pick<CommentRow, "id" | "author_nickname" | "message" | "created_at">): Comment {
  return {
    id: row.id,
    author: row.author_nickname,
    message: row.message,
    createdAt: new Date(row.created_at),
  }
}

function toOccurrence(
  row: Omit<OccurrenceRow, "author_id" | "is_demo" | "updated_at">,
  comments: Comment[],
): Occurrence {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    initialPriority: row.initial_priority,
    priorityVotes: {
      baixa: row.priority_votes_baixa,
      media: row.priority_votes_media,
      alta: row.priority_votes_alta,
    },
    neighborhood: row.neighborhood,
    address: row.address,
    createdAt: new Date(row.created_at),
    supports: row.support_count,
    confirmations: row.confirmations,
    contestations: row.contestations,
    existenceContestations: row.existence_contestations,
    latitude: row.latitude,
    longitude: row.longitude,
    comments,
    imageUrl: imageUrlFor(row.image_path),
  }
}

export async function fetchOccurrences(): Promise<Occurrence[]> {
  const supabase = createClient()
  const { data: rows, error } = await supabase
    .from("occurrences")
    .select(OCCURRENCE_COLUMNS)
    .eq("is_demo", false)
    .order("created_at", { ascending: false })
  if (error) throw error
  if (!rows.length) return []

  const { data: commentRows, error: commentsError } = await supabase
    .from("comments")
    .select("id, occurrence_id, author_nickname, message, created_at")
    .in("occurrence_id", rows.map((row) => row.id))
    .order("created_at", { ascending: true })
  if (commentsError) throw commentsError

  const commentsByOccurrence = new Map<string, Comment[]>()
  for (const comment of commentRows) {
    const list = commentsByOccurrence.get(comment.occurrence_id) ?? []
    list.push(toComment(comment))
    commentsByOccurrence.set(comment.occurrence_id, list)
  }

  return rows.map((row) => toOccurrence(row, commentsByOccurrence.get(row.id) ?? []))
}

async function getAnonymousSessionUser() {
  const { data, error } = await createClient().auth.getSession()
  if (error) throw error
  const user = data.session?.user
  return user && user.is_anonymous === true ? user : null
}

export async function fetchStoredNickname(): Promise<string | null> {
  const user = await getAnonymousSessionUser()
  if (!user) return null
  const { data, error } = await createClient()
    .from("profiles")
    .select("nickname")
    .eq("user_id", user.id)
    .maybeSingle()
  if (error) throw error
  return data?.nickname ?? null
}

export async function fetchMyInteractions(): Promise<PersistedInteractions> {
  const empty: PersistedInteractions = { interactions: {}, votes: [] }
  if (!(await getAnonymousSessionUser())) return empty

  const { data, error } = await createClient().rpc("get_my_occurrence_interactions")
  if (error) throw error

  const result = empty
  for (const row of data ?? []) {
    result.interactions[row.occurrence_id] = {
      hasSupported: row.has_supported,
      hasContestedExistence: row.has_contested_existence,
      resolutionFeedback:
        row.resolution_feedback === "confirmacao_resolucao"
          ? "confirmation"
          : row.resolution_feedback === "contestacao_resolucao"
            ? "contestation"
            : null,
    }
    if (row.priority) {
      result.votes.push({
        occurrenceId: row.occurrence_id,
        priority: row.priority,
        hasChanged: (row.priority_change_count ?? 0) >= 1,
      })
    }
  }
  return result
}

export async function createOccurrence(input: NewOccurrenceInput) {
  const supabase = createClient()
  const user = await getAnonymousSessionUser()
  if (!user) throw new Error("Sessão anônima não iniciada.")

  let imagePath: string | null = null
  if (input.imageFile) {
    const extension = IMAGE_EXTENSIONS[input.imageFile.type]
    if (!extension) throw new Error("Formato de imagem inválido.")
    imagePath = `${user.id}/${crypto.randomUUID()}/imagem.${extension}`
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(imagePath, input.imageFile, { contentType: input.imageFile.type, upsert: false })
    if (uploadError) throw uploadError
  }

  const { error } = await supabase.from("occurrences").insert({
    title: input.title,
    description: input.description,
    category: input.category,
    initial_priority: input.initialPriority,
    neighborhood: input.neighborhood,
    address: input.address,
    latitude: input.latitude,
    longitude: input.longitude,
    image_path: imagePath,
    author_id: user.id,
  })

  if (error) {
    if (imagePath) await supabase.storage.from(IMAGE_BUCKET).remove([imagePath])
    throw error
  }
}

export async function createComment(occurrenceId: string, nickname: string, message: string) {
  const user = await getAnonymousSessionUser()
  if (!user) throw new Error("Sessão anônima não iniciada.")
  const { error } = await createClient().from("comments").insert({
    occurrence_id: occurrenceId,
    author_id: user.id,
    author_nickname: nickname,
    message,
  })
  if (error) throw error
}

export async function supportOccurrenceRemote(occurrenceId: string) {
  const { data, error } = await createClient().rpc("support_occurrence", { p_occurrence_id: occurrenceId })
  if (error) throw error
  return data === true
}

export async function recordFeedbackRemote(
  occurrenceId: string,
  feedback: "confirmacao_resolucao" | "contestacao_resolucao" | "contestacao_existencia",
) {
  const { data, error } = await createClient().rpc("record_occurrence_feedback", {
    p_occurrence_id: occurrenceId,
    p_feedback_type: feedback,
  })
  if (error) throw error
  return data === true
}

export async function castPriorityVoteRemote(occurrenceId: string, priority: Priority) {
  const { data, error } = await createClient().rpc("cast_priority_vote", {
    p_occurrence_id: occurrenceId,
    p_priority: priority,
  })
  if (error) throw error
  return data === true
}

export async function updateOccurrenceStatusRemote(occurrenceId: string, status: OccurrenceStatus) {
  const { data } = await createClient().auth.getSession()
  const token = data.session?.access_token
  const response = await fetch("/api/occurrences/status", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ occurrenceId, status }),
  })
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { error?: string }
    throw new Error(payload.error ?? "Não foi possível atualizar o status.")
  }
}
