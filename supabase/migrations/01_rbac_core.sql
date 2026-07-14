-- ============================================================
-- Migration 01_rbac_core.sql — Production RBAC Schema
-- Greens ACC — Corporate Trade Platform
-- ============================================================
-- This is the consolidated, production-grade RBAC schema.
-- It supersedes 01_rbac_init.sql + 02_subroles.sql.
--
-- ⚠ SECURITY NOTE: Do NOT store plain-text passwords here.
--   Create user accounts exclusively through the Supabase Auth
--   admin dashboard or management API with strong passwords.
-- ============================================================

-- Role hierarchy enum (IF NOT EXISTS guard for idempotency)
DO $$ BEGIN
    CREATE TYPE user_team_role AS ENUM (
        'admin',
        'account_manager',
        'financial_manager',
        'accounting_staff',
        'software_engineer',
        'analyzer'
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Master Profiles Table linked to Supabase Auth
CREATE TABLE IF NOT EXISTS public.profiles (
    id               UUID          REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username         TEXT          UNIQUE NOT NULL,
    role             user_team_role NOT NULL DEFAULT 'analyzer',
    priority_level   INT           NOT NULL,
    can_approve_deals BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Auto-timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated_at();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy 1: users may always read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Policy 2: priority-hierarchy visibility
-- (A user at clearance level N can see profiles at level N or higher number,
--  i.e. equal or lower seniority. Admins bypass via policy 1 union.)
DROP POLICY IF EXISTS "profiles_hierarchy_visibility" ON public.profiles;
CREATE POLICY "profiles_hierarchy_visibility"
    ON public.profiles FOR SELECT
    USING (
        auth.uid() IN (SELECT id FROM public.profiles WHERE role = 'admin')
        OR (SELECT priority_level FROM public.profiles WHERE id = auth.uid()) >= priority_level
    );

-- Policy 3: users update own profile but cannot escalate their role/level
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        role            = (SELECT role           FROM public.profiles WHERE id = auth.uid()) AND
        priority_level  = (SELECT priority_level FROM public.profiles WHERE id = auth.uid())
    );

-- Policy 4: admins have unrestricted write access
DROP POLICY IF EXISTS "profiles_admin_full" ON public.profiles;
CREATE POLICY "profiles_admin_full"
    ON public.profiles FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Propagate can_approve_deals to management roles
UPDATE public.profiles
    SET can_approve_deals = TRUE
    WHERE role IN ('admin', 'account_manager');

-- ============================================================
-- Role Clearance Reference
-- ============================================================
-- Level 1 → admin              — Total platform authority, overrides
-- Level 2 → account_manager    — Analytics, contract auth, manifest approvals
-- Level 3 → financial_manager  — Macro finance, tax config, FX risk
-- Level 4 → accounting_staff   — Data entry ONLY (invoices, billing logs)
-- Level 5 → software_engineer  — Dev console, CodeSpaces terminal
-- Level 6 → analyzer           — Read-only projections & system views
-- ============================================================
