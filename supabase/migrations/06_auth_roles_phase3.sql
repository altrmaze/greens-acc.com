-- ============================================================
-- Migration 06: Phase 3 Authentication & Role-Based Access
-- Greens ACC — Corporate Trade Platform
-- ============================================================
-- Adds the 'developer' role, hardens RLS policies on profiles,
-- adds a performance index on profiles(role), and creates a
-- SECURITY DEFINER helper so the frontend can look up the
-- current user's own role without accessing auth.users directly.
-- ============================================================

-- 1. Extend the existing role enum with 'developer'.
--    IF NOT EXISTS guard makes this idempotent.
DO $$
BEGIN
    ALTER TYPE public.user_team_role ADD VALUE IF NOT EXISTS 'developer';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. Performance index on profiles(role) — supports fast role lookups
--    used by row-level security policies and role-check queries.
CREATE INDEX IF NOT EXISTS idx_profiles_role
    ON public.profiles (role);

-- 3. Secure server-side helper: returns the authenticated caller's role.
--    SECURITY DEFINER runs as the function owner (bypasses RLS for the
--    single SELECT) so the frontend never needs elevated privileges.
--    The frontend MUST call this function; it must never supply a role
--    itself in any request body or JWT claim.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS public.user_team_role
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT role
    FROM   public.profiles
    WHERE  id = auth.uid()
    LIMIT  1;
$$;

-- Revoke execute from PUBLIC and grant only to authenticated users.
REVOKE EXECUTE ON FUNCTION public.get_my_role() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_my_role() TO authenticated;

-- 4. Ensure the 'profiles_select_own' policy uses auth.uid() correctly
--    (idempotent — drops and recreates to ensure the definition is current).
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() = id);

-- 5. Admin-only INSERT/UPDATE/DELETE policy (replaces the broad ALL policy
--    from migration 01 with explicit per-operation policies for clarity).
DROP POLICY IF EXISTS "profiles_admin_write" ON public.profiles;

DROP POLICY IF EXISTS "profiles_admin_insert" ON public.profiles;
CREATE POLICY "profiles_admin_insert"
    ON public.profiles
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update"
    ON public.profiles
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "profiles_admin_delete" ON public.profiles;
CREATE POLICY "profiles_admin_delete"
    ON public.profiles
    FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================
-- Role Reference (Phase 3 active roles)
-- ============================================================
-- admin     (priority 1) — full platform access
-- developer (priority 5) — read-only developer console
--
-- Roles defined in the enum but NOT yet activated in the UI:
--   account_manager, financial_manager, accounting,
--   software_engineer, analyzer
-- ============================================================
