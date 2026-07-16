-- ============================================================
-- Migration 08: Auto-Profile Trigger & Backfill
-- Greens ACC — Corporate Trade Platform
-- ============================================================
-- 1. Creates a SECURITY DEFINER function that is fired by a
--    trigger on auth.users AFTER INSERT, automatically inserting
--    a default public.profiles row for every new auth account.
-- 2. Backfills profile rows for existing auth.users who have no
--    corresponding profile (accounts created before this migration).
--
-- Default role: 'analyzer' (read-only, no privileged access).
-- Admins must manually promote accounts to 'admin' or 'developer'
-- via the Admin Control Room user-management panel.
-- ============================================================

-- 1. Function: auto-create a profile row for every new auth user.
--    SECURITY DEFINER runs as the function owner so the INSERT
--    succeeds even during the trigger's pre-session context where
--    auth.uid() is not yet set.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_username TEXT;
  v_base     TEXT;
  v_suffix   INT := 0;
BEGIN
  -- Derive a base username from the email address (part before '@').
  v_base := LOWER(SPLIT_PART(COALESCE(NEW.email, ''), '@', 1));
  -- Sanitise: replace any character that is not alphanumeric or underscore.
  v_base := REGEXP_REPLACE(v_base, '[^a-z0-9_]', '_', 'g');
  -- Ensure the username is at least 3 characters.
  IF LENGTH(v_base) < 3 THEN
    v_base := v_base || '_user';
  END IF;
  v_username := v_base;

  -- Resolve uniqueness by appending an incrementing suffix when needed.
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_suffix   := v_suffix + 1;
    v_username := v_base || '_' || v_suffix::TEXT;
  END LOOP;

  INSERT INTO public.profiles (id, username, role, priority_level, display_name, email)
  VALUES (
    NEW.id,
    v_username,
    'analyzer',   -- safe default: read-only, no privileged access
    6,            -- lowest priority level (see role reference in migration 01)
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      v_username
    ),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;  -- idempotent: never overwrite an existing profile

  RETURN NEW;
END;
$$;

-- Restrict direct invocation: the function is called only by the trigger.
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC;

-- 2. Trigger: fires AFTER every INSERT on auth.users.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- 3. Backfill: insert placeholder profiles for auth users who were created
--    before this migration and therefore have no profile row yet.
DO $$
DECLARE
  r          RECORD;
  v_username TEXT;
  v_base     TEXT;
  v_suffix   INT;
BEGIN
  FOR r IN
    SELECT au.id,
           au.email,
           au.raw_user_meta_data
    FROM   auth.users au
    WHERE  NOT EXISTS (
               SELECT 1 FROM public.profiles p WHERE p.id = au.id
           )
  LOOP
    v_base   := LOWER(SPLIT_PART(COALESCE(r.email, ''), '@', 1));
    v_base   := REGEXP_REPLACE(v_base, '[^a-z0-9_]', '_', 'g');
    IF LENGTH(v_base) < 3 THEN
      v_base := v_base || '_user';
    END IF;
    v_suffix   := 0;
    v_username := v_base;

    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
      v_suffix   := v_suffix + 1;
      v_username := v_base || '_' || v_suffix::TEXT;
    END LOOP;

    INSERT INTO public.profiles (id, username, role, priority_level, display_name, email)
    VALUES (
      r.id,
      v_username,
      'analyzer',
      6,
      COALESCE(
        r.raw_user_meta_data->>'full_name',
        r.raw_user_meta_data->>'name',
        v_username
      ),
      r.email
    )
    ON CONFLICT (id) DO NOTHING;
  END LOOP;
END;
$$;

-- ============================================================
-- Post-migration note:
-- Run the following in your Supabase SQL editor to promote an
-- existing auth user to admin (replace the UUID accordingly):
--
--   UPDATE public.profiles
--   SET role = 'admin', priority_level = 1, can_approve_deals = true
--   WHERE id = '<your-auth-user-uuid>';
-- ============================================================
