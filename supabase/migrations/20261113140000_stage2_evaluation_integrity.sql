ALTER TABLE public.evaluation_participants
  ADD COLUMN status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'withdrawn')),
  ADD COLUMN started_at timestamptz,
  ADD COLUMN questionnaire_started_at timestamptz,
  ADD COLUMN completed_at timestamptz,
  ADD COLUMN withdrawn_at timestamptz,
  ADD COLUMN total_duration_ms bigint CHECK (total_duration_ms IS NULL OR total_duration_ms >= 0),
  ADD COLUMN questionnaire_duration_ms bigint CHECK (questionnaire_duration_ms IS NULL OR questionnaire_duration_ms >= 0),
  ADD CONSTRAINT evaluation_participant_lifecycle_check CHECK (
    (status = 'in_progress' AND completed_at IS NULL AND withdrawn_at IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND withdrawn_at IS NULL)
    OR (status = 'withdrawn' AND completed_at IS NULL AND withdrawn_at IS NOT NULL)
  );

ALTER TABLE public.evaluation_tasks
  ADD COLUMN attempt_number integer NOT NULL DEFAULT 1 CHECK (attempt_number > 0),
  ADD COLUMN status text NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'completed', 'failed', 'skipped', 'interrupted'));

ALTER TABLE public.evaluation_tasks
  DROP CONSTRAINT IF EXISTS evaluation_tasks_participant_id_task_key_key;
ALTER TABLE public.evaluation_tasks
  ADD CONSTRAINT evaluation_tasks_participant_task_attempt_unique
    UNIQUE (participant_id, task_key, attempt_number);

ALTER TABLE public.evaluation_answers
  ADD CONSTRAINT evaluation_answer_known_question_check CHECK (
    question_key IN (
      'interface-ease', 'intuitive-navigation', 'find-functionality', 'report-process',
      'organized-info', 'interaction-tools', 'admin-charts', 'urban-impact',
      'performance', 'future-use', 'difficulties', 'improvements'
    )
  ),
  ADD CONSTRAINT evaluation_answer_value_check CHECK (
    (
      question_key IN (
        'interface-ease', 'intuitive-navigation', 'find-functionality', 'report-process',
        'organized-info', 'interaction-tools', 'admin-charts', 'urban-impact',
        'performance', 'future-use'
      )
      AND jsonb_typeof(answer) = 'number'
      AND (answer #>> '{}')::numeric BETWEEN 1 AND 5
      AND trunc((answer #>> '{}')::numeric) = (answer #>> '{}')::numeric
    )
    OR (
      question_key IN ('difficulties', 'improvements')
      AND (
        answer = 'null'::jsonb
        OR (jsonb_typeof(answer) = 'string' AND char_length(answer #>> '{}') <= 1000)
      )
    )
  );

CREATE INDEX IF NOT EXISTS evaluation_participants_status_idx
  ON public.evaluation_participants (status, created_at DESC);
CREATE INDEX IF NOT EXISTS evaluation_tasks_participant_status_idx
  ON public.evaluation_tasks (participant_id, status, task_key);

REVOKE ALL ON public.evaluation_participants, public.evaluation_tasks, public.evaluation_answers
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.evaluation_participants, public.evaluation_tasks, public.evaluation_answers
  TO service_role;

CREATE OR REPLACE FUNCTION public.start_evaluation(
  p_user_id uuid,
  p_demographic_data jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_user_id IS NULL
    OR COALESCE(jsonb_typeof(p_demographic_data), '') <> 'object' THEN
    RAISE EXCEPTION 'valid_anonymous_participant_and_demographics_required' USING ERRCODE = '22023';
  END IF;

  IF pg_catalog.jsonb_object_length(p_demographic_data) <> 4
    OR NOT (p_demographic_data ?& ARRAY['ageRange', 'socialMediaUse', 'digitalFamiliarity', 'platformExperience'])
    OR NOT COALESCE(p_demographic_data->>'ageRange' IN ('18-24', '25-34', '35-44', '45-54', '55+', 'prefer-not-to-say'), false)
    OR NOT COALESCE(p_demographic_data->>'socialMediaUse' IN ('daily', 'several-times-weekly', 'once-weekly', 'rarely', 'never', 'prefer-not-to-say'), false)
    OR NOT COALESCE(p_demographic_data->>'digitalFamiliarity' IN ('beginner', 'intermediate', 'advanced'), false)
    OR NOT COALESCE(p_demographic_data->>'platformExperience' IN ('yes', 'no', 'unsure'), false)
    OR pg_catalog.pg_column_size(p_demographic_data) > 8192
    OR NOT EXISTS (
      SELECT 1 FROM auth.users u WHERE u.id = p_user_id AND u.is_anonymous
    ) THEN
    RAISE EXCEPTION 'valid_anonymous_participant_and_demographics_required' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.evaluation_participants (
    user_id, consent_given, consented_at, demographic_data, status, started_at
  ) VALUES (
    p_user_id, true, pg_catalog.clock_timestamp(), p_demographic_data, 'in_progress', pg_catalog.clock_timestamp()
  );
END;
$$;
REVOKE ALL ON FUNCTION public.start_evaluation(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_evaluation(uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.start_evaluation_task(
  p_user_id uuid,
  p_task_key text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_task_id uuid;
BEGIN
  PERFORM 1 FROM public.evaluation_participants p
  WHERE p.user_id = p_user_id AND p.consent_given AND p.status = 'in_progress'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_consented_evaluation_required' USING ERRCODE = '42501';
  END IF;
  IF COALESCE(char_length(btrim(p_task_key)) NOT BETWEEN 1 AND 120, true) THEN
    RAISE EXCEPTION 'invalid_task_key' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.evaluation_tasks (participant_id, task_key, attempt_number, started_at, status)
  SELECT p_user_id, p_task_key,
    COALESCE(max(t.attempt_number), 0) + 1,
    pg_catalog.clock_timestamp(),
    'in_progress'
  FROM public.evaluation_tasks t
  WHERE t.participant_id = p_user_id AND t.task_key = p_task_key
  RETURNING id INTO v_task_id;

  IF v_task_id IS NULL THEN
    INSERT INTO public.evaluation_tasks (participant_id, task_key, attempt_number, started_at, status)
    VALUES (p_user_id, p_task_key, 1, pg_catalog.clock_timestamp(), 'in_progress')
    RETURNING id INTO v_task_id;
  END IF;
  RETURN v_task_id;
END;
$$;
REVOKE ALL ON FUNCTION public.start_evaluation_task(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_evaluation_task(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.finish_evaluation_task(
  p_user_id uuid,
  p_task_id uuid,
  p_status text,
  p_result jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_finished_at timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF COALESCE(p_status NOT IN ('completed', 'failed', 'skipped', 'interrupted'), true)
    OR COALESCE(jsonb_typeof(p_result), '') <> 'object'
    OR pg_catalog.pg_column_size(p_result) > 8192 THEN
    RAISE EXCEPTION 'invalid_task_outcome' USING ERRCODE = '22023';
  END IF;

  UPDATE public.evaluation_tasks t SET
    status = p_status,
    completed_at = v_finished_at,
    duration_ms = CASE WHEN t.started_at IS NULL THEN NULL
      ELSE greatest(0, floor(extract(epoch FROM (v_finished_at - t.started_at)) * 1000)::bigint)
    END,
    result = p_result
  WHERE t.id = p_task_id AND t.participant_id = p_user_id AND t.status = 'in_progress'
    AND EXISTS (
      SELECT 1 FROM public.evaluation_participants p
      WHERE p.user_id = p_user_id AND p.status = 'in_progress' AND p.consent_given
    );

  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_task_not_found' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_evaluation_task(uuid, uuid, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_evaluation_task(uuid, uuid, text, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.start_evaluation_questionnaire(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  UPDATE public.evaluation_participants SET questionnaire_started_at = pg_catalog.clock_timestamp()
  WHERE user_id = p_user_id AND consent_given AND status = 'in_progress'
    AND questionnaire_started_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'questionnaire_start_not_allowed' USING ERRCODE = '42501';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.start_evaluation_questionnaire(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_evaluation_questionnaire(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.finalize_evaluation(
  p_user_id uuid,
  p_answers jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_participant public.evaluation_participants%ROWTYPE;
  v_finished_at timestamptz := pg_catalog.clock_timestamp();
  v_likert_keys text[] := ARRAY[
    'interface-ease', 'intuitive-navigation', 'find-functionality', 'report-process',
    'organized-info', 'interaction-tools', 'admin-charts', 'urban-impact',
    'performance', 'future-use'
  ];
BEGIN
  SELECT * INTO v_participant
  FROM public.evaluation_participants p
  WHERE p.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND OR NOT v_participant.consent_given OR v_participant.status <> 'in_progress'
    OR v_participant.started_at IS NULL OR v_participant.questionnaire_started_at IS NULL THEN
    RAISE EXCEPTION 'active_consented_evaluation_required' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(jsonb_typeof(p_answers), '') <> 'array' THEN
    RAISE EXCEPTION 'twelve_valid_answers_required' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_answers) <> 12
    OR (SELECT count(DISTINCT a->>'question_key') FROM jsonb_array_elements(p_answers) a) <> 12
    OR (SELECT count(*) FROM jsonb_array_elements(p_answers) a WHERE a->>'question_key' = ANY(v_likert_keys)) <> 10
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_answers) a
      WHERE NOT (
        (
          a->>'question_key' = ANY(v_likert_keys)
          AND jsonb_typeof(a->'answer') = 'number'
          AND (a->>'answer')::numeric BETWEEN 1 AND 5
          AND trunc((a->>'answer')::numeric) = (a->>'answer')::numeric
        )
        OR (
          a->>'question_key' IN ('difficulties', 'improvements')
          AND (
            a->'answer' = 'null'::jsonb
            OR (jsonb_typeof(a->'answer') = 'string' AND char_length(a->>'answer') <= 1000)
          )
        )
      )
    ) THEN
    RAISE EXCEPTION 'twelve_valid_answers_required' USING ERRCODE = '22023';
  END IF;

  UPDATE public.evaluation_tasks SET
    status = 'interrupted',
    completed_at = v_finished_at,
    duration_ms = CASE WHEN started_at IS NULL THEN NULL
      ELSE greatest(0, floor(extract(epoch FROM (v_finished_at - started_at)) * 1000)::bigint)
    END
  WHERE participant_id = p_user_id AND status = 'in_progress';

  INSERT INTO public.evaluation_answers (participant_id, question_key, answer)
  SELECT p_user_id, a->>'question_key', a->'answer'
  FROM jsonb_array_elements(p_answers) a;

  UPDATE public.evaluation_participants SET
    status = 'completed',
    completed_at = v_finished_at,
    total_duration_ms = greatest(0, floor(extract(epoch FROM (v_finished_at - v_participant.started_at)) * 1000)::bigint),
    questionnaire_duration_ms = greatest(0, floor(extract(epoch FROM (v_finished_at - v_participant.questionnaire_started_at)) * 1000)::bigint)
  WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_evaluation(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_evaluation(uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.withdraw_evaluation(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.evaluation_participants p WHERE p.user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  DELETE FROM public.evaluation_answers WHERE participant_id = p_user_id;
  DELETE FROM public.evaluation_tasks WHERE participant_id = p_user_id;
  UPDATE public.evaluation_participants SET
    status = 'withdrawn',
    demographic_data = '{}'::jsonb,
    completed_at = NULL,
    withdrawn_at = pg_catalog.clock_timestamp(),
    total_duration_ms = NULL,
    questionnaire_duration_ms = NULL
  WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.withdraw_evaluation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_evaluation(uuid) TO service_role;
