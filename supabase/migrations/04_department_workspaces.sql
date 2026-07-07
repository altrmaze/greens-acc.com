-- Department/workspace isolation + profile department controls

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
    workspace_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspaces_department_id ON public.workspaces (department_id);

ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS department_role TEXT NOT NULL DEFAULT 'staff';

ALTER TABLE IF EXISTS public.profiles
    ALTER COLUMN department_role SET DEFAULT 'staff',
    ALTER COLUMN department_role SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_department_id ON public.profiles (department_id);
CREATE INDEX IF NOT EXISTS idx_profiles_department_role ON public.profiles (department_role);

ALTER TABLE IF EXISTS public.security_telemetry
    ADD COLUMN IF NOT EXISTS department_id UUID,
    ADD COLUMN IF NOT EXISTS workspace_queue TEXT NOT NULL DEFAULT 'global-security-telemetry';

CREATE INDEX IF NOT EXISTS idx_security_telemetry_department_id ON public.security_telemetry (department_id);
CREATE INDEX IF NOT EXISTS idx_security_telemetry_workspace_queue ON public.security_telemetry (workspace_queue);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individuals to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow individuals to insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Department members can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Department members can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Department members can insert their own profile" ON public.profiles;

CREATE POLICY "Department members can read profiles"
    ON public.profiles
    FOR SELECT
    USING (
        auth.uid() = id
        OR department_id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Department members can update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (
        auth.uid() = id
        AND department_id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    )
    WITH CHECK (
        auth.uid() = id
        AND department_id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
        AND department_role IN ('dept_lead', 'staff')
        AND lower(role) <> 'manager'
    );

CREATE POLICY "Department members can insert their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (
        auth.uid() = id
        AND department_role IN ('dept_lead', 'staff')
        AND lower(role) <> 'manager'
    );

DROP POLICY IF EXISTS "Department members can read departments" ON public.departments;
DROP POLICY IF EXISTS "Department members can update departments" ON public.departments;
DROP POLICY IF EXISTS "Department members can insert departments" ON public.departments;

CREATE POLICY "Department members can read departments"
    ON public.departments
    FOR SELECT
    USING (
        id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Department members can update departments"
    ON public.departments
    FOR UPDATE
    USING (
        id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    )
    WITH CHECK (
        id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Department members can insert departments"
    ON public.departments
    FOR INSERT
    WITH CHECK (
        id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Department members can read workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Department members can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Department members can insert workspaces" ON public.workspaces;

CREATE POLICY "Department members can read workspaces"
    ON public.workspaces
    FOR SELECT
    USING (
        department_id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Department members can update workspaces"
    ON public.workspaces
    FOR UPDATE
    USING (
        department_id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    )
    WITH CHECK (
        department_id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );

CREATE POLICY "Department members can insert workspaces"
    ON public.workspaces
    FOR INSERT
    WITH CHECK (
        department_id = (
            SELECT p.department_id
            FROM public.profiles p
            WHERE p.id = auth.uid()
        )
    );
