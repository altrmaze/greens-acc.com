import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { handleDevLogin } from '../utils/devLogin';
import {
  hasUnlockedAdminAccess,
  isAdminAccessConfigured,
  tryUnlockAdminAccess,
} from '../utils/adminAccess';

type UserRole = string | null;

interface ProfileRoleRow {
  role: string | null;
}

export interface UseAdminAuthResult {
  userRole: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isAdminLocked: boolean;
  isAdminPassConfigured: boolean;
  verifyAdminPass: (password: string) => boolean;
}

export function useAdminAuth(): UseAdminAuthResult {
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState<boolean>(() => hasUnlockedAdminAccess());

  const isAdminPassConfigured = useMemo(() => isAdminAccessConfigured(), []);

  useEffect(() => {
    let isMounted = true;

    async function fetchUserRole() {
      try {
        let { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          await handleDevLogin();
          ({ data: { user } } = await supabase.auth.getUser());
        }

        if (!user) {
          if (isMounted) {
            setUserRole(null);
          }
          return;
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (!isMounted) {
          return;
        }

        if (error) {
          console.error('Failed to load admin role context', error);
          setUserRole(null);
          return;
        }

        setUserRole((data as ProfileRoleRow | null)?.role ?? null);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUserRole();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isAdminPassConfigured) {
      setAdminUnlocked(false);
      return;
    }

    setAdminUnlocked(hasUnlockedAdminAccess());
  }, [isAdminPassConfigured, userRole]);

  const verifyAdminPass = useCallback((password: string) => {
    if (userRole !== 'admin') {
      return false;
    }

    if (!isAdminPassConfigured) {
      setAdminUnlocked(false);
      return false;
    }

    const unlocked = tryUnlockAdminAccess(password);
    setAdminUnlocked(unlocked);
    return unlocked;
  }, [isAdminPassConfigured, userRole]);

  const isAdmin = userRole === 'admin';
  const isAdminLocked = isAdmin && (!isAdminPassConfigured || !adminUnlocked);

  return {
    userRole,
    loading,
    isAdmin,
    isAdminLocked,
    isAdminPassConfigured,
    verifyAdminPass,
  };
}
