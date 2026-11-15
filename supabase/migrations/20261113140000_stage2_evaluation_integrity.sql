ALTER TABLE public.evaluation_participants
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress',
  ADD COLUMN IF NOT EXISTS started_at timestamptz,
  ADD COLUMN IF NOT EXISTS questionnaire_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS withdrawn_at timestamptz,
  ADD COLUMN IF NOT EXISTS total_duration_ms bigint,
  ADD COLUMN IF NOT EXISTS questionnaire_duration_ms bigint,
  ADD COLUMN IF NOT EXISTS practical_duration_ms bigint;

ALTER TABLE public.evaluation_participants
  DROP CONSTRAINT IF EXISTS evaluation_participant_status_check,
  DROP CONSTRAINT IF EXISTS evaluation_participant_durations_check,
  DROP CONSTRAINT IF EXISTS evaluation_participant_lifecycle_check;
ALTER TABLE public.evaluation_participants
  ADD CONSTRAINT evaluation_participant_status_check
    CHECK (status IN ('in_progress', 'completed', 'withdrawn')),
  ADD CONSTRAINT evaluation_participant_durations_check CHECK (
    (total_duration_ms IS NULL OR total_duration_ms >= 0)
    AND (questionnaire_duration_ms IS NULL OR questionnaire_duration_ms >= 0)
    AND (practical_duration_ms IS NULL OR practical_duration_ms >= 0)
  ),
  ADD CONSTRAINT evaluation_participant_lifecycle_check CHECK (
    (status = 'in_progress' AND completed_at IS NULL AND withdrawn_at IS NULL)
    OR (status = 'completed' AND completed_at IS NOT NULL AND withdrawn_at IS NULL)
    OR (status = 'withdrawn' AND completed_at IS NULL AND withdrawn_at IS NOT NULL)
  );

ALTER TABLE public.evaluation_tasks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress';
ALTER TABLE public.evaluation_tasks
  DROP CONSTRAINT IF EXISTS evaluation_task_status_check,
  DROP CONSTRAINT IF EXISTS evaluation_task_known_key_check;
ALTER TABLE public.evaluation_tasks
  ADD CONSTRAINT evaluation_task_status_check
    CHECK (status IN ('in_progress', 'completed', 'skipped', 'interrupted')),
  ADD CONSTRAINT evaluation_task_known_key_check
    CHECK (task_key IN ('find-occurrence', 'interact-with-occurrence', 'register-test', 'admin-panel'));

ALTER TABLE public.evaluation_answers
  DROP CONSTRAINT IF EXISTS evaluation_answer_known_question_check,
  DROP CONSTRAINT IF EXISTS evaluation_answer_value_check;
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

REVOKE ALL ON public.evaluation_participants, public.evaluation_tasks, public.evaluation_answers
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.evaluation_participants, public.evaluation_tasks, public.evaluation_answers
  TO service_role;

DROP FUNCTION IF EXISTS public.start_evaluation_task(uuid, text);
DROP FUNCTION IF EXISTS public.finish_evaluation_task(uuid, uuid, text, jsonb);
DROP FUNCTION IF EXISTS public.start_evaluation_questionnaire(uuid);

CREATE OR REPLACE FUNCTION public.start_evaluation(
  p_user_id uuid,
  p_demographic_data jsonb
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_status text;
  v_now timestamptz := pg_catalog.clock_timestamp();
BEGIN
  IF p_user_id IS NULL
    OR COALESCE(jsonb_typeof(p_demographic_data), '') <> 'object'
    OR (SELECT count(*) FROM jsonb_object_keys(p_demographic_data)) <> 5
    OR NOT (p_demographic_data ?& ARRAY['ageRange', 'socialMediaUse', 'digitalFamiliarity', 'platformExperience', 'deviceType'])
    OR NOT COALESCE(p_demographic_data->>'ageRange' IN ('18-24', '25-34', '35-44', '45-54', '55+', 'prefer-not-to-say'), false)
    OR NOT COALESCE(p_demographic_data->>'socialMediaUse' IN ('daily', 'several-times-weekly', 'once-weekly', 'rarely', 'never', 'prefer-not-to-say'), false)
    OR NOT COALESCE(p_demographic_data->>'digitalFamiliarity' IN ('beginner', 'intermediate', 'advanced'), false)
    OR NOT COALESCE(p_demographic_data->>'platformExperience' IN ('yes', 'no', 'unsure'), false)
    OR NOT COALESCE(p_demographic_data->>'deviceType' IN ('smartphone', 'computer', 'tablet', 'other'), false)
    OR NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = p_user_id AND u.is_anonymous)
    OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = p_user_id) THEN
    RAISE EXCEPTION 'valid_anonymous_participant_and_demographics_required' USING ERRCODE = '22023';
  END IF;

  SELECT p.status INTO v_status FROM public.evaluation_participants p
  WHERE p.user_id = p_user_id FOR UPDATE;
  IF v_status = 'completed' THEN
    RAISE EXCEPTION 'evaluation_already_completed' USING ERRCODE = '23505';
  END IF;

  DELETE FROM public.evaluation_answers WHERE participant_id = p_user_id;
  DELETE FROM public.evaluation_tasks WHERE participant_id = p_user_id;

  INSERT INTO public.evaluation_participants (
    user_id, consent_given, consented_at, demographic_data, status, started_at
  ) VALUES (
    p_user_id, true, v_now, p_demographic_data, 'in_progress', v_now
  )
  ON CONFLICT (user_id) DO UPDATE SET
    consent_given = true,
    consented_at = v_now,
    demographic_data = EXCLUDED.demographic_data,
    status = 'in_progress',
    started_at = v_now,
    questionnaire_started_at = NULL,
    completed_at = NULL,
    withdrawn_at = NULL,
    total_duration_ms = NULL,
    questionnaire_duration_ms = NULL,
    practical_duration_ms = NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.start_evaluation(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_evaluation(uuid, jsonb) TO service_role;

CREATE OR REPLACE FUNCTION public.record_evaluation_tasks(
  p_user_id uuid,
  p_tasks jsonb,
  p_practical_duration_ms bigint
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  PERFORM 1 FROM public.evaluation_participants p
  WHERE p.user_id = p_user_id AND p.consent_given AND p.status = 'in_progress'
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'active_consented_evaluation_required' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(jsonb_typeof(p_tasks), '') <> 'array'
    OR jsonb_array_length(p_tasks) <> 4
    OR p_practical_duration_ms IS NULL
    OR p_practical_duration_ms NOT BETWEEN 0 AND 86400000
    OR (SELECT count(DISTINCT t->>'taskId') FROM jsonb_array_elements(p_tasks) t
        WHERE t->>'taskId' IN ('find-occurrence', 'interact-with-occurrence', 'register-test', 'admin-panel')) <> 4
    OR EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_tasks) t
      WHERE NOT (
        COALESCE(t->>'status' IN ('completed', 'skipped'), false)
        AND jsonb_typeof(t->'startedAt') = 'number'
        AND jsonb_typeof(t->'endedAt') = 'number'
        AND (t->>'endedAt')::numeric >= (t->>'startedAt')::numeric
        AND (t->>'endedAt')::numeric - (t->>'startedAt')::numeric <= 86400000
        AND COALESCE(jsonb_typeof(t->'failedAttempts'), 'number') = 'number'
      )
    ) THEN
    RAISE EXCEPTION 'four_valid_tasks_required' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.evaluation_tasks WHERE participant_id = p_user_id;

  INSERT INTO public.evaluation_tasks (participant_id, task_key, started_at, completed_at, duration_ms, status, result)
  SELECT
    p_user_id,
    t->>'taskId',
    pg_catalog.to_timestamp((t->>'startedAt')::double precision / 1000),
    pg_catalog.to_timestamp((t->>'endedAt')::double precision / 1000),
    round((t->>'endedAt')::numeric - (t->>'startedAt')::numeric)::bigint,
    t->>'status',
    jsonb_build_object('failedAttempts', greatest(0, COALESCE((t->>'failedAttempts')::int, 0)))
  FROM jsonb_array_elements(p_tasks) t;

  UPDATE public.evaluation_participants SET
    practical_duration_ms = p_practical_duration_ms,
    questionnaire_started_at = COALESCE(questionnaire_started_at, pg_catalog.clock_timestamp())
  WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.record_evaluation_tasks(uuid, jsonb, bigint) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_evaluation_tasks(uuid, jsonb, bigint) TO service_role;

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
  SELECT * INTO v_participant FROM public.evaluation_participants p
  WHERE p.user_id = p_user_id FOR UPDATE;

  IF FOUND AND v_participant.status = 'completed' THEN
    RETURN;
  END IF;

  IF NOT FOUND OR NOT v_participant.consent_given OR v_participant.status <> 'in_progress'
    OR v_participant.started_at IS NULL OR v_participant.questionnaire_started_at IS NULL THEN
    RAISE EXCEPTION 'active_consented_evaluation_required' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(jsonb_typeof(p_answers), '') <> 'array'
    OR jsonb_array_length(p_answers) <> 12
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

  DELETE FROM public.evaluation_answers WHERE participant_id = p_user_id;
  INSERT INTO public.evaluation_answers (participant_id, question_key, answer)
  SELECT p_user_id, a->>'question_key', a->'answer' FROM jsonb_array_elements(p_answers) a;

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
  PERFORM 1 FROM public.evaluation_participants p
  WHERE p.user_id = p_user_id AND p.status = 'in_progress' FOR UPDATE;
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
    questionnaire_duration_ms = NULL,
    practical_duration_ms = NULL
  WHERE user_id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.withdraw_evaluation(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.withdraw_evaluation(uuid) TO service_role;
