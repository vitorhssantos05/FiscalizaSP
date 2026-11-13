DROP POLICY IF EXISTS occurrences_insert_anonymous_owner ON public.occurrences;

CREATE POLICY occurrences_insert_anonymous_owner
ON public.occurrences
FOR INSERT
TO authenticated
WITH CHECK (
  author_id = (SELECT auth.uid())
  AND is_demo = false
  AND status = 'pendente'
  AND (
    image_path IS NULL
    OR image_path ~* (
      '^' || (SELECT auth.uid())::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[^/]+$'
    )
  )
  AND (SELECT public.is_anonymous_participant())
  AND EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = (SELECT auth.uid())
      AND p.nickname IS NOT NULL
  )
);
