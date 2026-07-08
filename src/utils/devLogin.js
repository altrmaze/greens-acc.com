import { supabase } from '../supabaseClient';

const devTestUserEmail = import.meta?.env?.VITE_TEST_USER_EMAIL ?? '';
const devTestUserPassword = import.meta?.env?.VITE_TEST_USER_PASSWORD ?? '';

let devLoginPromise = null;

export function hasDevLoginCredentials() {
  return Boolean(import.meta?.env?.DEV && devTestUserEmail && devTestUserPassword);
}

export async function handleDevLogin() {
  if (!hasDevLoginCredentials()) {
    return { data: null, error: null, skipped: true };
  }

  if (!devLoginPromise) {
    devLoginPromise = (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session) {
        return { data: sessionData, error: null, skipped: false };
      }

      const result = await supabase.auth.signInWithPassword({
        email: devTestUserEmail,
        password: devTestUserPassword,
      });

      return { ...result, skipped: false };
    })();
  }

  return devLoginPromise;
}
