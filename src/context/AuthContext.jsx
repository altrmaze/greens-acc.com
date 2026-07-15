import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

/**
 * AuthContext — single source of truth for authentication and role state.
 *
 * Provides:
 *   user    — Supabase User object, or null when unauthenticated
 *   role    — string role from the `profiles` table (server-side, RLS-protected)
 *             never derived from browser storage or JWT claims alone
 *   loading — true while the initial auth + role check is in flight
 *   signOut — function that calls supabase.auth.signOut()
 */
const AuthContext = createContext(null);

async function fetchRoleFromDB(userId) {
  if (!userId || !supabase) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();
  if (error) return null;
  return data?.role ?? null;
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [role,    setRole]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If Supabase is not configured (missing credentials), skip auth check
    // and leave the user unauthenticated so the app renders correctly.
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    // Restore session on mount — getSession() trusts the persisted JWT
    // (signed by Supabase, not forgeable by the browser).
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      const currentRole = await fetchRoleFromDB(currentUser?.id ?? null);
      if (mounted) {
        setRole(currentRole);
        setLoading(false);
      }
    });

    // Keep user/role in sync on every auth state change.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        const currentRole = await fetchRoleFromDB(currentUser?.id ?? null);
        if (mounted) {
          setRole(currentRole);
          setLoading(false);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = () => supabase?.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, role, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * useAuth — consume the AuthContext.
 * Must be called within a component tree that is wrapped by <AuthProvider>.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }
  return ctx;
}
