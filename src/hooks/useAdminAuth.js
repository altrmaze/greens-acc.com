import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { handleDevLogin } from '../utils/devLogin';
import {
  ADMIN_ACCESS_EVENT,
  hasUnlockedAdminAccess,
  isAdminAccessConfigured,
  tryUnlockAdminAccess,
} from '../utils/adminAccess';

export const useAdminAuth = () => {
  const [userRole, setUserRole] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLocked, setIsLocked] = useState(true);
  const [loading, setLoading] = useState(true);
  const [isAdminPassConfigured, setIsAdminPassConfigured] = useState(() => isAdminAccessConfigured());

  useEffect(() => {
    const syncAdminAccessState = () => {
      const configured = isAdminAccessConfigured();
      setIsAdminPassConfigured(configured);
      setIsLocked(isAdmin ? (!configured || !hasUnlockedAdminAccess()) : true);
    };

    syncAdminAccessState();

    if (typeof window === 'undefined') {
      return undefined;
    }

    window.addEventListener(ADMIN_ACCESS_EVENT, syncAdminAccessState);
    return () => window.removeEventListener(ADMIN_ACCESS_EVENT, syncAdminAccessState);
  }, [isAdmin]);

  useEffect(() => {
    let isMounted = true;

    async function checkUser() {
      try {
        if (isMounted) {
          setLoading(true);
          setIsAdminPassConfigured(isAdminAccessConfigured());
        }

        let { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          await handleDevLogin();
          ({ data: { user } } = await supabase.auth.getUser());
        }

        if (!user) {
          if (!isMounted) {
            return;
          }

          setUserRole(null);
          setIsAdmin(false);
          setIsLocked(true);
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
          console.error('Greens ACC Auth Error:', error);
        }

        const resolvedRole = data?.role ?? user.user_metadata?.role ?? null;
        const admin = resolvedRole === 'admin';
        const configured = isAdminAccessConfigured();

        setUserRole(resolvedRole);
        setIsAdmin(admin);
        setIsAdminPassConfigured(configured);
        setIsLocked(admin ? (!configured || !hasUnlockedAdminAccess()) : false);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        console.error('Greens ACC Auth Error:', error);
        setUserRole(null);
        setIsAdmin(false);
        setIsLocked(true);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkUser();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const verifyAdminPassword = useCallback((passwordInput) => {
    if (!isAdmin) {
      return false;
    }

    const configured = isAdminAccessConfigured();
    setIsAdminPassConfigured(configured);

    if (!configured) {
      setIsLocked(true);
      return false;
    }

    const unlocked = tryUnlockAdminAccess(passwordInput);
    setIsLocked(!unlocked);
    return unlocked;
  }, [isAdmin]);

  return {
    userRole,
    isAdmin,
    isLocked,
    loading,
    isAdminPassConfigured,
    verifyAdminPassword,
  };
};
