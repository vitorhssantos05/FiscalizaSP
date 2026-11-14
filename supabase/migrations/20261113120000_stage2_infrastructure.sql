DO $$ BEGIN
  CREATE TYPE public.occurrence_category AS ENUM ('buraco', 'iluminacao', 'vazamento', 'lixo', 'sinalizacao', 'outros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.occurrence_status AS ENUM ('pendente', 'em_analise', 'resolvida');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.priority_level AS ENUM ('baixa', 'media', 'alta');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  CREATE TYPE public.occurrence_feedback_type AS ENUM ('confirmacao_resolucao', 'contestacao_resolucao', 'contestacao_existencia');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.is_anonymous_participant()
RETURNS boolean LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT auth.uid() IS NOT NULL
    AND COALESCE((SELECT auth.jwt() ->> 'is_anonymous'), 'false') = 'true'
$$;
REVOKE ALL ON FUNCTION public.is_anonymous_participant() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_anonymous_participant() TO authenticated;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname text CHECK (nickname IS NULL OR char_length(btrim(nickname)) BETWEEN 1 AND 40),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT public.is_anonymous_participant()));
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()) AND (SELECT public.is_anonymous_participant()))
  WITH CHECK (user_id = (SELECT auth.uid()) AND nickname IS NOT NULL AND (SELECT public.is_anonymous_participant()));
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT (user_id, nickname, created_at, updated_at) ON public.profiles TO authenticated;
GRANT UPDATE (nickname) ON public.profiles TO authenticated;
DROP TRIGGER IF EXISTS profiles_set_updated_at ON public.profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.handle_anonymous_auth_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.is_anonymous THEN
    INSERT INTO public.profiles (user_id) VALUES (NEW.id) ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_anonymous_auth_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS fiscalizasp_create_anonymous_profile ON auth.users;
CREATE TRIGGER fiscalizasp_create_anonymous_profile AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_anonymous_auth_user();

CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_users FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_users TO service_role;

CREATE TABLE IF NOT EXISTS public.occurrences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  description text NOT NULL CHECK (char_length(btrim(description)) BETWEEN 1 AND 5000),
  category public.occurrence_category NOT NULL,
  status public.occurrence_status NOT NULL DEFAULT 'pendente',
  initial_priority public.priority_level NOT NULL DEFAULT 'media',
  neighborhood text NOT NULL CHECK (char_length(btrim(neighborhood)) BETWEEN 1 AND 120),
  address text NOT NULL CHECK (char_length(btrim(address)) BETWEEN 1 AND 300),
  latitude double precision NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude double precision NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  image_path text CHECK (image_path IS NULL OR (char_length(btrim(image_path)) > 0 AND image_path !~* '^(data:|https?://)')),
  author_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  is_demo boolean NOT NULL DEFAULT false,
  support_count integer NOT NULL DEFAULT 0 CHECK (support_count >= 0),
  priority_votes_baixa integer NOT NULL DEFAULT 0 CHECK (priority_votes_baixa >= 0),
  priority_votes_media integer NOT NULL DEFAULT 0 CHECK (priority_votes_media >= 0),
  priority_votes_alta integer NOT NULL DEFAULT 0 CHECK (priority_votes_alta >= 0),
  confirmations integer NOT NULL DEFAULT 0 CHECK (confirmations >= 0),
  contestations integer NOT NULL DEFAULT 0 CHECK (contestations >= 0),
  existence_contestations integer NOT NULL DEFAULT 0 CHECK (existence_contestations >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS occurrences_created_at_idx ON public.occurrences (created_at DESC);
CREATE INDEX IF NOT EXISTS occurrences_category_status_idx ON public.occurrences (category, status, created_at DESC);
ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS occurrences_public_read ON public.occurrences;
CREATE POLICY occurrences_public_read ON public.occurrences FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS occurrences_insert_anonymous_owner ON public.occurrences;
CREATE POLICY occurrences_insert_anonymous_owner ON public.occurrences FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid()) AND is_demo = false AND status = 'pendente'
    AND (SELECT public.is_anonymous_participant())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.nickname IS NOT NULL)
  );
REVOKE ALL ON public.occurrences FROM anon, authenticated;
GRANT SELECT (id, title, description, category, status, initial_priority, neighborhood, address, latitude, longitude, image_path, is_demo, support_count, priority_votes_baixa, priority_votes_media, priority_votes_alta, confirmations, contestations, existence_contestations, created_at, updated_at)
  ON public.occurrences TO anon, authenticated;
GRANT INSERT (title, description, category, initial_priority, neighborhood, address, latitude, longitude, image_path, author_id)
  ON public.occurrences TO authenticated;
DROP TRIGGER IF EXISTS occurrences_set_updated_at ON public.occurrences;
CREATE TRIGGER occurrences_set_updated_at BEFORE UPDATE ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  author_nickname text NOT NULL CHECK (char_length(btrim(author_nickname)) BETWEEN 1 AND 40),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS comments_occurrence_feed_idx ON public.comments (occurrence_id, created_at DESC);
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS comments_public_read ON public.comments;
CREATE POLICY comments_public_read ON public.comments FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS comments_insert_owner ON public.comments;
CREATE POLICY comments_insert_owner ON public.comments FOR INSERT TO authenticated
  WITH CHECK (
    author_id = (SELECT auth.uid()) AND (SELECT public.is_anonymous_participant())
    AND author_nickname = (SELECT p.nickname FROM public.profiles p WHERE p.user_id = (SELECT auth.uid()))
    AND EXISTS (SELECT 1 FROM public.occurrences o WHERE o.id = comments.occurrence_id)
  );
REVOKE ALL ON public.comments FROM anon, authenticated;
GRANT SELECT (id, occurrence_id, author_nickname, message, created_at) ON public.comments TO anon, authenticated;
GRANT INSERT (occurrence_id, author_id, author_nickname, message) ON public.comments TO authenticated;

CREATE TABLE IF NOT EXISTS public.supports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  supporter_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (occurrence_id, supporter_id)
);
CREATE INDEX IF NOT EXISTS supports_occurrence_idx ON public.supports (occurrence_id);
ALTER TABLE public.supports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS supports_public_read ON public.supports;
CREATE POLICY supports_public_read ON public.supports FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS supports_insert_owner ON public.supports;
CREATE POLICY supports_insert_owner ON public.supports FOR INSERT TO authenticated
  WITH CHECK (
    supporter_id = (SELECT auth.uid()) AND (SELECT public.is_anonymous_participant())
    AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = (SELECT auth.uid()) AND p.nickname IS NOT NULL)
  );
REVOKE ALL ON public.supports FROM anon, authenticated;
GRANT SELECT (id, occurrence_id, created_at) ON public.supports TO anon, authenticated;
GRANT INSERT (occurrence_id, supporter_id) ON public.supports TO authenticated;

CREATE TABLE IF NOT EXISTS public.priority_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  priority public.priority_level NOT NULL,
  change_count integer NOT NULL DEFAULT 0 CHECK (change_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (occurrence_id, user_id)
);
CREATE INDEX IF NOT EXISTS priority_votes_occurrence_idx ON public.priority_votes (occurrence_id);
ALTER TABLE public.priority_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS priority_votes_public_read ON public.priority_votes;
CREATE POLICY priority_votes_public_read ON public.priority_votes FOR SELECT TO anon, authenticated USING (true);
REVOKE ALL ON public.priority_votes FROM anon, authenticated;
GRANT SELECT (id, occurrence_id, priority, created_at) ON public.priority_votes TO anon, authenticated;
DROP TRIGGER IF EXISTS priority_votes_set_updated_at ON public.priority_votes;
CREATE TRIGGER priority_votes_set_updated_at BEFORE UPDATE ON public.priority_votes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.maintain_priority_vote_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.occurrences SET
      priority_votes_baixa = priority_votes_baixa + (NEW.priority = 'baixa')::integer,
      priority_votes_media = priority_votes_media + (NEW.priority = 'media')::integer,
      priority_votes_alta = priority_votes_alta + (NEW.priority = 'alta')::integer
    WHERE id = NEW.occurrence_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.occurrences SET
      priority_votes_baixa = priority_votes_baixa - (OLD.priority = 'baixa')::integer,
      priority_votes_media = priority_votes_media - (OLD.priority = 'media')::integer,
      priority_votes_alta = priority_votes_alta - (OLD.priority = 'alta')::integer
    WHERE id = OLD.occurrence_id;
    RETURN OLD;
  ELSE
    UPDATE public.occurrences SET
      priority_votes_baixa = priority_votes_baixa - (OLD.priority = 'baixa')::integer + (NEW.priority = 'baixa')::integer,
      priority_votes_media = priority_votes_media - (OLD.priority = 'media')::integer + (NEW.priority = 'media')::integer,
      priority_votes_alta = priority_votes_alta - (OLD.priority = 'alta')::integer + (NEW.priority = 'alta')::integer
    WHERE id = NEW.occurrence_id;
    RETURN NEW;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.maintain_priority_vote_counts() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS priority_votes_count_insert_delete ON public.priority_votes;
CREATE TRIGGER priority_votes_count_insert_delete AFTER INSERT OR DELETE ON public.priority_votes
  FOR EACH ROW EXECUTE FUNCTION public.maintain_priority_vote_counts();
DROP TRIGGER IF EXISTS priority_votes_count_update ON public.priority_votes;
CREATE TRIGGER priority_votes_count_update AFTER UPDATE OF priority ON public.priority_votes
  FOR EACH ROW WHEN (OLD.priority IS DISTINCT FROM NEW.priority)
  EXECUTE FUNCTION public.maintain_priority_vote_counts();

CREATE OR REPLACE FUNCTION public.cast_priority_vote(p_occurrence_id uuid, p_priority public.priority_level)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.is_anonymous_participant() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = v_user_id AND p.nickname IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'anonymous_identity_and_nickname_required' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.priority_votes (occurrence_id, user_id, priority)
    VALUES (p_occurrence_id, v_user_id, p_priority)
    ON CONFLICT (occurrence_id, user_id) DO UPDATE
      SET priority = EXCLUDED.priority,
          change_count = public.priority_votes.change_count + CASE WHEN public.priority_votes.priority IS DISTINCT FROM EXCLUDED.priority THEN 1 ELSE 0 END,
          updated_at = now();
END;
$$;
REVOKE ALL ON FUNCTION public.cast_priority_vote(uuid, public.priority_level) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_priority_vote(uuid, public.priority_level) TO authenticated;

CREATE OR REPLACE FUNCTION public.seed_initial_priority_vote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  INSERT INTO public.priority_votes (occurrence_id, user_id, priority)
    VALUES (NEW.id, NEW.author_id, NEW.initial_priority);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.seed_initial_priority_vote() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS occurrences_seed_initial_priority_vote ON public.occurrences;
CREATE TRIGGER occurrences_seed_initial_priority_vote AFTER INSERT ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.seed_initial_priority_vote();

CREATE TABLE IF NOT EXISTS public.occurrence_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurrence_id uuid NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  feedback_type public.occurrence_feedback_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (occurrence_id, user_id, feedback_type)
);
CREATE UNIQUE INDEX IF NOT EXISTS occurrence_feedback_resolution_once_idx
  ON public.occurrence_feedback (occurrence_id, user_id)
  WHERE feedback_type IN ('confirmacao_resolucao', 'contestacao_resolucao');
CREATE INDEX IF NOT EXISTS occurrence_feedback_occurrence_idx ON public.occurrence_feedback (occurrence_id, feedback_type);
ALTER TABLE public.occurrence_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS occurrence_feedback_public_read ON public.occurrence_feedback;
CREATE POLICY occurrence_feedback_public_read ON public.occurrence_feedback FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS occurrence_feedback_insert_owner ON public.occurrence_feedback;
REVOKE ALL ON public.occurrence_feedback FROM anon, authenticated;
GRANT SELECT (id, occurrence_id, feedback_type, created_at) ON public.occurrence_feedback TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_occurrence_resolution_feedback(
  p_occurrence_id uuid,
  p_feedback_type public.occurrence_feedback_type
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL
    OR p_feedback_type NOT IN ('confirmacao_resolucao', 'contestacao_resolucao')
    OR NOT public.is_anonymous_participant()
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.user_id = v_user_id AND p.nickname IS NOT NULL
    ) THEN
    RAISE EXCEPTION 'anonymous_identity_and_resolution_feedback_required' USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.occurrence_feedback
  WHERE occurrence_id = p_occurrence_id
    AND user_id = v_user_id
    AND feedback_type IN ('confirmacao_resolucao', 'contestacao_resolucao')
    AND feedback_type <> p_feedback_type;

  INSERT INTO public.occurrence_feedback (occurrence_id, user_id, feedback_type)
  VALUES (p_occurrence_id, v_user_id, p_feedback_type)
  ON CONFLICT (occurrence_id, user_id, feedback_type) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION public.set_occurrence_resolution_feedback(uuid, public.occurrence_feedback_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_occurrence_resolution_feedback(uuid, public.occurrence_feedback_type) TO authenticated;

CREATE OR REPLACE FUNCTION public.maintain_occurrence_feedback_counts()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_occurrence_id uuid; v_feedback_type public.occurrence_feedback_type; v_delta integer;
BEGIN
  IF TG_OP = 'INSERT' THEN v_occurrence_id := NEW.occurrence_id; v_feedback_type := NEW.feedback_type; v_delta := 1;
  ELSE v_occurrence_id := OLD.occurrence_id; v_feedback_type := OLD.feedback_type; v_delta := -1; END IF;
  IF v_feedback_type = 'confirmacao_resolucao' THEN
    UPDATE public.occurrences SET confirmations = confirmations + v_delta WHERE id = v_occurrence_id;
  ELSIF v_feedback_type = 'contestacao_resolucao' THEN
    UPDATE public.occurrences SET contestations = contestations + v_delta WHERE id = v_occurrence_id;
  ELSE
    UPDATE public.occurrences SET existence_contestations = existence_contestations + v_delta WHERE id = v_occurrence_id;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.maintain_occurrence_feedback_counts() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS occurrence_feedback_maintain_counts ON public.occurrence_feedback;
CREATE TRIGGER occurrence_feedback_maintain_counts AFTER INSERT OR DELETE ON public.occurrence_feedback
  FOR EACH ROW EXECUTE FUNCTION public.maintain_occurrence_feedback_counts();

CREATE OR REPLACE FUNCTION public.maintain_support_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.occurrences SET support_count = support_count + 1 WHERE id = NEW.occurrence_id;
    RETURN NEW;
  END IF;
  UPDATE public.occurrences SET support_count = support_count - 1 WHERE id = OLD.occurrence_id;
  RETURN OLD;
END;
$$;
REVOKE ALL ON FUNCTION public.maintain_support_count() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS supports_maintain_count ON public.supports;
CREATE TRIGGER supports_maintain_count AFTER INSERT OR DELETE ON public.supports
  FOR EACH ROW EXECUTE FUNCTION public.maintain_support_count();

CREATE TABLE IF NOT EXISTS public.evaluation_participants (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  consent_given boolean NOT NULL DEFAULT false,
  consented_at timestamptz,
  demographic_data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(demographic_data) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((consent_given = false AND consented_at IS NULL) OR (consent_given = true AND consented_at IS NOT NULL))
);
CREATE TABLE IF NOT EXISTS public.evaluation_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.evaluation_participants(user_id) ON DELETE CASCADE,
  task_key text NOT NULL CHECK (char_length(btrim(task_key)) BETWEEN 1 AND 120),
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms bigint CHECK (duration_ms IS NULL OR duration_ms >= 0),
  result jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(result) = 'object'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, task_key),
  CHECK (completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at)
);
CREATE TABLE IF NOT EXISTS public.evaluation_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES public.evaluation_participants(user_id) ON DELETE CASCADE,
  question_key text NOT NULL CHECK (char_length(btrim(question_key)) BETWEEN 1 AND 120),
  answer jsonb NOT NULL,
  answered_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (participant_id, question_key)
);
CREATE INDEX IF NOT EXISTS evaluation_tasks_participant_idx ON public.evaluation_tasks (participant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS evaluation_answers_participant_idx ON public.evaluation_answers (participant_id, answered_at DESC);
ALTER TABLE public.evaluation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluation_answers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.evaluation_participants, public.evaluation_tasks, public.evaluation_answers FROM anon, authenticated;
DROP TRIGGER IF EXISTS evaluation_participants_set_updated_at ON public.evaluation_participants;
CREATE TRIGGER evaluation_participants_set_updated_at BEFORE UPDATE ON public.evaluation_participants
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('occurrence-images', 'occurrence-images', false, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
  ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS occurrence_images_public_read ON storage.objects;
DROP POLICY IF EXISTS occurrence_images_owner_read ON storage.objects;
CREATE POLICY occurrence_images_owner_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'occurrence-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND (SELECT public.is_anonymous_participant())
  );
DROP POLICY IF EXISTS occurrence_images_insert_own_path ON storage.objects;
CREATE POLICY occurrence_images_insert_own_path ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'occurrence-images'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
    AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    AND pg_catalog.array_length(storage.foldername(name), 1) = 2
    AND storage.filename(name) ~* '[.](jpg|jpeg|png|webp)$'
    AND (SELECT public.is_anonymous_participant())
  );
DROP POLICY IF EXISTS occurrence_images_delete_own_path ON storage.objects;
CREATE POLICY occurrence_images_delete_own_path ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'occurrence-images' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text AND (SELECT public.is_anonymous_participant()));

CREATE OR REPLACE FUNCTION public.set_occurrence_status(
  p_occurrence_id uuid,
  p_status public.occurrence_status
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL
    OR public.is_anonymous_participant()
    OR NOT EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = v_user_id) THEN
    RAISE EXCEPTION 'trusted_admin_required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.occurrences SET status = p_status WHERE id = p_occurrence_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'occurrence_not_found' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.set_occurrence_status(uuid, public.occurrence_status) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_occurrence_status(uuid, public.occurrence_status) TO authenticated;

CREATE OR REPLACE VIEW public.occurrence_priority_weights
WITH (security_invoker = true) AS
SELECT
  id AS occurrence_id,
  priority_votes_baixa + priority_votes_media + priority_votes_alta AS vote_count,
  priority_votes_baixa + (2 * priority_votes_media) + (3 * priority_votes_alta) AS weighted_score
FROM public.occurrences;
GRANT SELECT ON public.occurrence_priority_weights TO anon, authenticated;
