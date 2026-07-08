-- Seed or repair the primary administrative profile for local/project setup.
-- This migration intentionally updates only the application profile table.
-- Supabase Auth users must still be created and managed through Auth tooling.

INSERT INTO public.profiles (
    id,
    username,
    role,
    priority_level,
    can_approve_deals
)
VALUES (
    '7cbba498-1f00-43ad-8493-379b3e6a2968',
    'admin-7cbba498',
    'admin',
    1,
    TRUE
)
ON CONFLICT (id) DO UPDATE
SET
    username = EXCLUDED.username,
    role = EXCLUDED.role,
    priority_level = EXCLUDED.priority_level,
    can_approve_deals = EXCLUDED.can_approve_deals;
