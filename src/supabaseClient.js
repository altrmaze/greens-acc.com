import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client — credentials are read from environment variables.
 *
 * For local/static builds, set in a .env file:
 *   VITE_SUPABASE_URL=https://your-project.supabase.co
 *   VITE_SUPABASE_ANON_KEY=your-anon-key
 *
 * For the static HTML deployment (index.html), the backend/server.py
 * injects SUPABASE_URL and SUPABASE_ANON_KEY as window.__ENV__ variables.
 */
const supabaseUrl  = import.meta?.env?.VITE_SUPABASE_URL  ?? window.__ENV__?.SUPABASE_URL  ?? '';
const supabaseKey  = import.meta?.env?.VITE_SUPABASE_ANON_KEY ?? window.__ENV__?.SUPABASE_ANON_KEY ?? '';

export const supabase = createClient(supabaseUrl, supabaseKey);
