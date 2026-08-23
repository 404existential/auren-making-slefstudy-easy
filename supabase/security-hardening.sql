-- AUREN security hardening
-- Apply this migration in the connected Supabase SQL editor/migrations.
-- This intentionally removes public access to student profiles.

BEGIN;

-- Never expose a SECURITY DEFINER maintenance function through the REST API.
REVOKE EXECUTE ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;

-- Student profiles are private by default: a student can only access their own row.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "users can create own profile" ON public.profiles;
DROP POLICY IF EXISTS "users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "public can read profiles" ON public.profiles;

CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING ((select auth.uid()) = id);

CREATE POLICY "profiles_insert_own"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = id);

CREATE POLICY "profiles_update_own"
ON public.profiles
FOR UPDATE
TO authenticated
USING ((select auth.uid()) = id)
WITH CHECK ((select auth.uid()) = id);

-- Supporting indexes for the question-bank foreign keys.
CREATE INDEX IF NOT EXISTS questions_exam_id_idx ON public.questions (exam_id);
CREATE INDEX IF NOT EXISTS questions_subject_id_idx ON public.questions (subject_id);
CREATE INDEX IF NOT EXISTS questions_topic_id_idx ON public.questions (topic_id);

COMMIT;
