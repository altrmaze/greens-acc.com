-- Reinforce profiles as required auth-linked identity table
ALTER TABLE IF EXISTS public.profiles
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';

ALTER TABLE IF EXISTS public.profiles
    ALTER COLUMN username DROP NOT NULL,
    ALTER COLUMN role TYPE TEXT USING role::text,
    ALTER COLUMN role SET DEFAULT 'user',
    ALTER COLUMN role SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT now(),
    ALTER COLUMN updated_at SET NOT NULL;

ALTER TABLE IF EXISTS public.profiles
    DROP COLUMN IF EXISTS priority_level,
    DROP COLUMN IF EXISTS can_approve_deals,
    DROP COLUMN IF EXISTS created_at;

ALTER TABLE IF EXISTS public.profiles
    DROP CONSTRAINT IF EXISTS profiles_id_fkey;

ALTER TABLE IF EXISTS public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_unique ON public.profiles (username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.handle_profile_updated_at();

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_hierarchy_visibility" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_full" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow individuals to update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow individuals to insert their own profile" ON public.profiles;

CREATE POLICY "Allow public read access to profiles"
    ON public.profiles
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow individuals to update their own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Allow individuals to insert their own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);
