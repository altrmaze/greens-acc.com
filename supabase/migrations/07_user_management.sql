-- ============================================================
-- Migration 07: Phase 4 User Management
-- Greens ACC — Corporate Trade Platform
-- ============================================================
-- Adds 'staff' and 'user' roles, extends the profiles table
-- with display_name, email, status, and invited_by columns,
-- creates the immutable user_audit_logs table, and installs
-- three SECURITY DEFINER helpers:
--   admin_list_users()   — paginated user listing with email
--   admin_count_users()  — total count for pagination
--   log_user_action()    — admin-only audit-log writer
-- ============================================================

-- 1. Extend role enum with 'staff' and 'user'
DO $$
BEGIN
    ALTER TYPE public.user_team_role ADD VALUE IF NOT EXISTS 'staff';
EXCEPTION WHEN others THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TYPE public.user_team_role ADD VALUE IF NOT EXISTS 'user';
EXCEPTION WHEN others THEN NULL;
END $$;

-- 2. Extend profiles with user-management columns
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS display_name TEXT,
    ADD COLUMN IF NOT EXISTS email        TEXT,
    ADD COLUMN IF NOT EXISTS status       TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'invited', 'suspended')),
    ADD COLUMN IF NOT EXISTS invited_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Performance indices for new columns
CREATE INDEX IF NOT EXISTS idx_profiles_status ON public.profiles (status);
CREATE INDEX IF NOT EXISTS idx_profiles_email  ON public.profiles (email);

-- 3. Immutable audit log for user-management actions
CREATE TABLE IF NOT EXISTS public.user_audit_logs (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    target_id   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
    action      TEXT        NOT NULL,
    old_values  JSONB,
    new_values  JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_audit_logs_actor      ON public.user_audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_target     ON public.user_audit_logs (target_id);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_action     ON public.user_audit_logs (action);
CREATE INDEX IF NOT EXISTS idx_user_audit_logs_created_at ON public.user_audit_logs (created_at DESC);

-- Enable RLS on user_audit_logs
ALTER TABLE public.user_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can read all audit log entries; no direct client writes
DROP POLICY IF EXISTS "user_audit_logs_admin_select" ON public.user_audit_logs;
CREATE POLICY "user_audit_logs_admin_select"
    ON public.user_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. SECURITY DEFINER: admin_list_users
--    Returns paginated user records including email from auth.users.
--    Only callable by users with the 'admin' role.
CREATE OR REPLACE FUNCTION public.admin_list_users(
    p_search TEXT    DEFAULT NULL,
    p_role   TEXT    DEFAULT NULL,
    p_status TEXT    DEFAULT NULL,
    p_limit  INT     DEFAULT 20,
    p_offset INT     DEFAULT 0
)
RETURNS TABLE (
    id             UUID,
    email          TEXT,
    display_name   TEXT,
    username       TEXT,
    role           public.user_team_role,
    status         TEXT,
    priority_level INT,
    invited_by     UUID,
    created_at     TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        COALESCE(p.email, au.email::TEXT)  AS email,
        p.display_name,
        p.username,
        p.role,
        p.status,
        p.priority_level,
        p.invited_by,
        p.created_at,
        p.updated_at
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE (
        p_search IS NULL OR p_search = ''
        OR au.email   ILIKE '%' || p_search || '%'
        OR p.email    ILIKE '%' || p_search || '%'
        OR p.display_name ILIKE '%' || p_search || '%'
        OR p.username     ILIKE '%' || p_search || '%'
    )
    AND (p_role   IS NULL OR p_role   = '' OR p.role::TEXT = p_role)
    AND (p_status IS NULL OR p_status = '' OR p.status     = p_status)
    ORDER BY p.created_at DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_list_users TO authenticated;

-- 5. SECURITY DEFINER: admin_count_users
--    Returns total matching row count; used for pagination UI.
CREATE OR REPLACE FUNCTION public.admin_count_users(
    p_search TEXT DEFAULT NULL,
    p_role   TEXT DEFAULT NULL,
    p_status TEXT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count BIGINT;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    SELECT COUNT(*) INTO v_count
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE (
        p_search IS NULL OR p_search = ''
        OR au.email   ILIKE '%' || p_search || '%'
        OR p.email    ILIKE '%' || p_search || '%'
        OR p.display_name ILIKE '%' || p_search || '%'
        OR p.username     ILIKE '%' || p_search || '%'
    )
    AND (p_role   IS NULL OR p_role   = '' OR p.role::TEXT = p_role)
    AND (p_status IS NULL OR p_status = '' OR p.status     = p_status);

    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_count_users FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.admin_count_users TO authenticated;

-- 6. SECURITY DEFINER: log_user_action
--    Inserts an audit record; callable only by admin users.
--    Edge functions bypass this by using the service-role key directly.
CREATE OR REPLACE FUNCTION public.log_user_action(
    p_target_id  UUID,
    p_action     TEXT,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ) THEN
        RAISE EXCEPTION 'Unauthorized: admin role required';
    END IF;

    INSERT INTO public.user_audit_logs (actor_id, target_id, action, old_values, new_values)
    VALUES (auth.uid(), p_target_id, p_action, p_old_values, p_new_values)
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.log_user_action FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.log_user_action TO authenticated;

-- ============================================================
-- Role Reference (Phase 4 active roles)
-- ============================================================
-- admin     (priority 1) — full platform access
-- developer (priority 2) — read-only developer console
-- staff     (priority 3) — operational staff access (not yet activated for login)
-- user      (priority 4) — standard user access (not yet activated for login)
-- ============================================================
