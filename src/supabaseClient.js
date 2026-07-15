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
 *
 * IMPORTANT: use `||` (not `??`) so that empty-string values injected by
 * CI when secrets are unset fall through to the window.__ENV__ fallback.
 * `??` only catches null/undefined, not empty strings.
 */
const supabaseUrl = import.meta?.env?.VITE_SUPABASE_URL
  || window.__ENV__?.SUPABASE_URL
  || '';
const supabaseKey = import.meta?.env?.VITE_SUPABASE_ANON_KEY
  || window.__ENV__?.SUPABASE_ANON_KEY
  || '';

/**
 * Guard: createClient throws "supabaseKey is required." when either
 * credential is empty.  Export null and let callers degrade gracefully
 * (showing Under Construction / a config error) rather than crashing the
 * entire React app with a blank white screen.
 */
let _client = null;
if (supabaseUrl && supabaseKey) {
  try {
    _client = createClient(supabaseUrl, supabaseKey);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[supabaseClient] Failed to initialise Supabase client:', err.message);
  }
}

export const supabase = _client;
