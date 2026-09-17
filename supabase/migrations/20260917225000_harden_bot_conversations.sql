-- PR 87 — explicit deny-all for dormant bot_conversations
--
-- The table is currently unused and has 0 rows. RLS is enabled but had no policy,
-- so row access was denied implicitly while broad table grants still existed.
-- This migration makes the disabled state explicit and removes direct privileges
-- from end-user roles. service_role remains available for trusted backend/admin use.

REVOKE ALL PRIVILEGES ON TABLE public.bot_conversations FROM anon, authenticated;

DROP POLICY IF EXISTS "bot_conversations_disabled" ON public.bot_conversations;

CREATE POLICY "bot_conversations_disabled"
ON public.bot_conversations
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

COMMENT ON POLICY "bot_conversations_disabled" ON public.bot_conversations IS
  'PR87: table is intentionally dormant. End-user roles have no direct privileges and no row access.';

DO $assert$
BEGIN
  IF has_table_privilege('anon', 'public.bot_conversations', 'SELECT') OR
     has_table_privilege('anon', 'public.bot_conversations', 'INSERT') OR
     has_table_privilege('anon', 'public.bot_conversations', 'UPDATE') OR
     has_table_privilege('anon', 'public.bot_conversations', 'DELETE') OR
     has_table_privilege('anon', 'public.bot_conversations', 'TRUNCATE') OR
     has_table_privilege('authenticated', 'public.bot_conversations', 'SELECT') OR
     has_table_privilege('authenticated', 'public.bot_conversations', 'INSERT') OR
     has_table_privilege('authenticated', 'public.bot_conversations', 'UPDATE') OR
     has_table_privilege('authenticated', 'public.bot_conversations', 'DELETE') OR
     has_table_privilege('authenticated', 'public.bot_conversations', 'TRUNCATE') THEN
    RAISE EXCEPTION 'PR87: bot_conversations still has end-user table privileges';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'bot_conversations'
      AND policyname = 'bot_conversations_disabled'
  ) THEN
    RAISE EXCEPTION 'PR87: explicit deny-all policy missing';
  END IF;
END;
$assert$;
