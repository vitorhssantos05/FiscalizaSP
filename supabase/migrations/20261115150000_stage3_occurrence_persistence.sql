-- Community interactions go through SECURITY DEFINER functions so the
-- one-action-per-participant rules are enforced by the database.
CREATE OR REPLACE FUNCTION public.require_participant_with_nickname()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.is_anonymous_participant() OR NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.user_id = v_user_id AND p.nickname IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'anonymous_identity_and_nickname_required' USING ERRCODE = '42501';
  END IF;
  RETURN v_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.require_participant_with_nickname() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.support_occurrence(p_occurrence_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_user_id uuid := public.require_participant_with_nickname();
BEGIN
  PERFORM 1 FROM public.occurrences o WHERE o.id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'occurrence_not_found' USING ERRCODE = 'P0002';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.occurrence_feedback f
    WHERE f.occurrence_id = p_occurrence_id AND f.user_id = v_user_id
      AND f.feedback_type = 'contestacao_existencia'
  ) THEN
    RETURN false;
  END IF;
  INSERT INTO public.supports (occurrence_id, supporter_id)
    VALUES (p_occurrence_id, v_user_id)
    ON CONFLICT (occurrence_id, supporter_id) DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.support_occurrence(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.support_occurrence(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_occurrence_feedback(
  p_occurrence_id uuid,
  p_feedback_type public.occurrence_feedback_type
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id uuid := public.require_participant_with_nickname();
  v_status public.occurrence_status;
BEGIN
  SELECT o.status INTO v_status FROM public.occurrences o WHERE o.id = p_occurrence_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'occurrence_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF p_feedback_type = 'contestacao_existencia' THEN
    IF EXISTS (
      SELECT 1 FROM public.supports s
      WHERE s.occurrence_id = p_occurrence_id AND s.supporter_id = v_user_id
    ) THEN
      RETURN false;
    END IF;
  ELSE
    IF v_status <> 'resolvida' OR EXISTS (
      SELECT 1 FROM public.occurrence_feedback f
      WHERE f.occurrence_id = p_occurrence_id AND f.user_id = v_user_id
        AND f.feedback_type IN ('confirmacao_resolucao', 'contestacao_resolucao')
    ) THEN
      RETURN false;
    END IF;
  END IF;

  INSERT INTO public.occurrence_feedback (occurrence_id, user_id, feedback_type)
    VALUES (p_occurrence_id, v_user_id, p_feedback_type)
    ON CONFLICT (occurrence_id, user_id, feedback_type) DO NOTHING;
  RETURN FOUND;
END;
$$;
REVOKE ALL ON FUNCTION public.record_occurrence_feedback(uuid, public.occurrence_feedback_type) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_occurrence_feedback(uuid, public.occurrence_feedback_type) TO authenticated;

-- Each participant may change a priority vote at most once.
DROP FUNCTION IF EXISTS public.cast_priority_vote(uuid, public.priority_level) CASCADE;
CREATE FUNCTION public.cast_priority_vote(p_occurrence_id uuid, p_priority public.priority_level)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_user_id uuid := public.require_participant_with_nickname();
  v_existing public.priority_votes%ROWTYPE;
BEGIN
  PERFORM 1 FROM public.occurrences o WHERE o.id = p_occurrence_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'occurrence_not_found' USING ERRCODE = 'P0002';
  END IF;

  SELECT * INTO v_existing FROM public.priority_votes v
  WHERE v.occurrence_id = p_occurrence_id AND v.user_id = v_user_id FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO public.priority_votes (occurrence_id, user_id, priority)
      VALUES (p_occurrence_id, v_user_id, p_priority);
    RETURN true;
  END IF;

  IF v_existing.priority = p_priority OR v_existing.change_count >= 1 THEN
    RETURN false;
  END IF;

  UPDATE public.priority_votes
    SET priority = p_priority, change_count = change_count + 1, updated_at = now()
    WHERE id = v_existing.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.cast_priority_vote(uuid, public.priority_level) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cast_priority_vote(uuid, public.priority_level) TO authenticated;

-- Lets a returning participant restore only their own interaction state.
CREATE OR REPLACE FUNCTION public.get_my_occurrence_interactions()
RETURNS TABLE (
  occurrence_id uuid,
  has_supported boolean,
  resolution_feedback public.occurrence_feedback_type,
  has_contested_existence boolean,
  priority public.priority_level,
  priority_change_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  WITH me AS (SELECT auth.uid() AS id WHERE public.is_anonymous_participant()),
  ids AS (
    SELECT s.occurrence_id FROM public.supports s, me WHERE s.supporter_id = me.id
    UNION SELECT f.occurrence_id FROM public.occurrence_feedback f, me WHERE f.user_id = me.id
    UNION SELECT v.occurrence_id FROM public.priority_votes v, me WHERE v.user_id = me.id
  )
  SELECT
    ids.occurrence_id,
    EXISTS (SELECT 1 FROM public.supports s, me WHERE s.occurrence_id = ids.occurrence_id AND s.supporter_id = me.id),
    (SELECT f.feedback_type FROM public.occurrence_feedback f, me
      WHERE f.occurrence_id = ids.occurrence_id AND f.user_id = me.id
        AND f.feedback_type IN ('confirmacao_resolucao', 'contestacao_resolucao') LIMIT 1),
    EXISTS (SELECT 1 FROM public.occurrence_feedback f, me
      WHERE f.occurrence_id = ids.occurrence_id AND f.user_id = me.id AND f.feedback_type = 'contestacao_existencia'),
    v.priority,
    v.change_count
  FROM ids
  LEFT JOIN public.priority_votes v
    ON v.occurrence_id = ids.occurrence_id AND v.user_id = (SELECT me.id FROM me)
$$;
REVOKE ALL ON FUNCTION public.get_my_occurrence_interactions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_occurrence_interactions() TO authenticated;

-- Direct inserts would bypass the interaction rules above.
DROP POLICY IF EXISTS supports_insert_owner ON public.supports;
DROP POLICY IF EXISTS occurrence_feedback_insert_owner ON public.occurrence_feedback;
REVOKE INSERT ON public.supports, public.occurrence_feedback FROM anon, authenticated;
DROP FUNCTION IF EXISTS public.set_occurrence_resolution_feedback(uuid, public.occurrence_feedback_type);

-- Occurrence photos are shown to every visitor; uploads stay scoped to the owner's folder.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES ('occurrence-images', 'occurrence-images', true, 3145728, ARRAY['image/jpeg', 'image/png', 'image/webp']::text[])
  ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
DROP POLICY IF EXISTS occurrence_images_owner_read ON storage.objects;
DROP POLICY IF EXISTS occurrence_images_public_read ON storage.objects;
CREATE POLICY occurrence_images_public_read ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'occurrence-images');
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
