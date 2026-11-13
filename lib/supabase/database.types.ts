export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Relationship<
  ForeignKey extends string,
  Column extends string,
  ReferencedTable extends string,
  ReferencedColumn extends string,
  OneToOne extends boolean = false,
> = {
  foreignKeyName: ForeignKey
  columns: [Column]
  isOneToOne: OneToOne
  referencedRelation: ReferencedTable
  referencedColumns: [ReferencedColumn]
}

type Table<
  Row,
  Required extends keyof Row = never,
  Relations extends unknown[] = [],
> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>
  Update: Partial<Row>
  Relationships: Relations
}

type Category = "buraco" | "iluminacao" | "vazamento" | "lixo" | "sinalizacao" | "outros"
type Status = "pendente" | "em_analise" | "resolvida"
type Priority = "baixa" | "media" | "alta"
type FeedbackType = "confirmacao_resolucao" | "contestacao_resolucao" | "contestacao_existencia"

type Profile = {
  user_id: string
  nickname: string | null
  created_at: string
  updated_at: string
}
type Occurrence = {
  id: string
  title: string
  description: string
  category: Category
  status: Status
  initial_priority: Priority
  neighborhood: string
  address: string
  latitude: number
  longitude: number
  image_path: string | null
  author_id: string
  is_demo: boolean
  support_count: number
  priority_votes_baixa: number
  priority_votes_media: number
  priority_votes_alta: number
  confirmations: number
  contestations: number
  existence_contestations: number
  created_at: string
  updated_at: string
}
type Comment = {
  id: string
  occurrence_id: string
  author_id: string
  author_nickname: string
  message: string
  created_at: string
}
type Support = {
  id: string
  occurrence_id: string
  supporter_id: string
  created_at: string
}
type PriorityVote = {
  id: string
  occurrence_id: string
  user_id: string
  priority: Priority
  change_count: number
  created_at: string
  updated_at: string
}
type OccurrenceFeedback = {
  id: string
  occurrence_id: string
  user_id: string
  feedback_type: FeedbackType
  created_at: string
}
type EvaluationParticipant = {
  user_id: string
  consent_given: boolean
  consented_at: string | null
  demographic_data: Json
  created_at: string
  updated_at: string
}
type EvaluationTask = {
  id: string
  participant_id: string
  task_key: string
  started_at: string | null
  completed_at: string | null
  duration_ms: number | null
  result: Json
  created_at: string
}
type EvaluationAnswer = {
  id: string
  participant_id: string
  question_key: string
  answer: Json
  answered_at: string
}

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.18" }
  public: {
    Tables: {
      profiles: Table<Profile, "user_id">
      occurrences: Table<
        Occurrence,
        "title" | "description" | "category" | "neighborhood" | "address" | "latitude" | "longitude" | "author_id",
        [Relationship<"occurrences_author_id_fkey", "author_id", "profiles", "user_id">]
      >
      comments: Table<
        Comment,
        "occurrence_id" | "author_id" | "author_nickname" | "message",
        [
          Relationship<"comments_author_id_fkey", "author_id", "profiles", "user_id">,
          Relationship<"comments_occurrence_id_fkey", "occurrence_id", "occurrences", "id">
        ]
      >
      supports: Table<
        Support,
        "occurrence_id" | "supporter_id",
        [
          Relationship<"supports_occurrence_id_fkey", "occurrence_id", "occurrences", "id">,
          Relationship<"supports_supporter_id_fkey", "supporter_id", "profiles", "user_id">
        ]
      >
      priority_votes: Table<
        PriorityVote,
        "occurrence_id" | "user_id" | "priority",
        [
          Relationship<"priority_votes_occurrence_id_fkey", "occurrence_id", "occurrences", "id">,
          Relationship<"priority_votes_user_id_fkey", "user_id", "profiles", "user_id">
        ]
      >
      occurrence_feedback: Table<
        OccurrenceFeedback,
        "occurrence_id" | "user_id" | "feedback_type",
        [
          Relationship<"occurrence_feedback_occurrence_id_fkey", "occurrence_id", "occurrences", "id">,
          Relationship<"occurrence_feedback_user_id_fkey", "user_id", "profiles", "user_id">
        ]
      >
      evaluation_participants: Table<
        EvaluationParticipant,
        "user_id",
        [Relationship<"evaluation_participants_user_id_fkey", "user_id", "profiles", "user_id", true>]
      >
      evaluation_tasks: Table<
        EvaluationTask,
        "participant_id" | "task_key",
        [Relationship<"evaluation_tasks_participant_id_fkey", "participant_id", "evaluation_participants", "user_id">]
      >
      evaluation_answers: Table<
        EvaluationAnswer,
        "participant_id" | "question_key" | "answer",
        [Relationship<"evaluation_answers_participant_id_fkey", "participant_id", "evaluation_participants", "user_id">]
      >
    }
    Views: { [_ in never]: never }
    Functions: {
      cast_priority_vote: { Args: { p_occurrence_id: string; p_priority: Priority }; Returns: undefined }
      is_anonymous_participant: { Args: never; Returns: boolean }
    }
    Enums: {
      occurrence_category: Category
      occurrence_status: Status
      priority_level: Priority
      occurrence_feedback_type: FeedbackType
    }
    CompositeTypes: { [_ in never]: never }
  }
}
