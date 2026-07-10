-- ============================================================
-- Migration 01: RBAC Identity Matrix & Row-Level Security
-- Greens ACC — Corporate Trade Platform
-- ============================================================
-- NOTE: Do NOT store plain-text passwords in source code.
--       Create users via the Supabase Auth admin dashboard or
--       the management API with securely generated passwords.
-- ============================================================

-- Custom team role enumeration
CREATE TYPE user_team_role AS ENUM (
    'admin',
    'account_manager',
    'financial_manager',
    'accounting',
    'software_engineer',
    'analyzer'
);

-- Master Profiles Table — maps to core Supabase Auth instances
CREATE TABLE public.profiles (
    id               UUID          REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    username         TEXT          UNIQUE NOT NULL,
    role             user_team_role NOT NULL DEFAULT 'analyzer',
    priority_level   INT           NOT NULL,
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at       TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row change
CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated_at();

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Each user can read their own profile unconditionally
CREATE POLICY "profiles_select_own"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "profiles_select_admin"
    ON public.profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Hierarchy view: higher-priority users (lower priority_level number) can see
-- profiles at their level or below (higher priority_level number)
CREATE POLICY "profiles_select_hierarchy"
    ON public.profiles FOR SELECT
    USING (
        (
            SELECT priority_level FROM public.profiles WHERE id = auth.uid()
        ) <= priority_level
    );

-- Users may update only their own profile (non-privileged fields)
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (
        -- Prevent self-escalation of role or priority
        role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
        priority_level = (SELECT priority_level FROM public.profiles WHERE id = auth.uid())
    );

-- Admins may insert and update any profile
CREATE POLICY "profiles_admin_write"
    ON public.profiles FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================================
-- Role Priority Reference (for documentation only)
-- ============================================================
-- priority_level 1 → admin            (complete control)
-- priority_level 2 → account_manager
-- priority_level 3 → financial_manager
-- priority_level 4 → accounting        (data entry isolation)
-- priority_level 5 → software_engineer
-- priority_level 6 → analyzer
-- ============================================================
