export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type Table<Row, Required extends keyof Row = never> = {
  Row: Row
  Insert: Pick<Row, Required> & Partial<Omit<Row, Required>>
  Update: Partial<Row>
  Relationships: []
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
      occurrences: Table<Occurrence, "title" | "description" | "category" | "neighborhood" | "address" | "latitude" | "longitude" | "author_id">
      comments: Table<Comment, "occurrence_id" | "author_id" | "author_nickname" | "message">
      supports: Table<Support, "occurrence_id" | "supporter_id">
      priority_votes: Table<PriorityVote, "occurrence_id" | "user_id" | "priority">
      occurrence_feedback: Table<OccurrenceFeedback, "occurrence_id" | "user_id" | "feedback_type">
      evaluation_participants: Table<EvaluationParticipant, "user_id">
      evaluation_tasks: Table<EvaluationTask, "participant_id" | "task_key">
      evaluation_answers: Table<EvaluationAnswer, "participant_id" | "question_key" | "answer">
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
