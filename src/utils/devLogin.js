import { supabase } from '../supabaseClient';

let devLoginPromise = null;

function getDevLoginCredentials({ warnOnMissing = false } = {}) {
  if (!import.meta?.env?.DEV) {
    return null;
  }

  const email = import.meta?.env?.VITE_TEST_USER_EMAIL?.trim() ?? '';
  const password = import.meta?.env?.VITE_TEST_USER_PASSWORD ?? '';

  if (!email || !password) {
    if (warnOnMissing) {
      console.warn('Dev credentials missing in local Vite env');
    }

    return null;
  }

  return { email, password };
}

export function hasDevLoginCredentials() {
  return Boolean(getDevLoginCredentials());
}

export async function handleDevLogin() {
  const credentials = getDevLoginCredentials({ warnOnMissing: true });
  if (!credentials) {
    return { data: null, error: null, skipped: true };
  }

  if (!devLoginPromise) {
    devLoginPromise = (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        return { data: sessionData, error: null, skipped: false };
      }

      const result = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (result.error) {
        devLoginPromise = null;
      }

      return { ...result, skipped: false };
    })();
  }

  return devLoginPromise;
}
