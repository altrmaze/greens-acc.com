import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const OPTIONAL_RESOURCE_CODES = new Set(['42P01', 'PGRST205']);

function isOptionalResourceError(error) {
  if (!error) {
    return false;
  }
  return OPTIONAL_RESOURCE_CODES.has(error.code) || /does not exist/i.test(error.message || '');
}

function resolveRole(user, profileData, securityFlags) {
  return (
    profileData?.role ??
    securityFlags?.role ??
    user?.user_metadata?.role ??
    user?.app_metadata?.role ??
    null
  );
}

function parseSecurityFlags(rawFlags) {
  if (!rawFlags) {
    return null;
  }
  if (typeof rawFlags === 'object') {
    return rawFlags;
  }
  if (typeof rawFlags === 'string') {
    try {
      return JSON.parse(rawFlags);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * DashboardGuard
 *
 * Wraps any dashboard panel and gates it behind role-based clearance.
 * Renders children only when the authenticated user's role matches
 * `requiredRole` (or 'admin' if `allowAdmin` is true).
 *
 * @param {string}   requiredRole  - The role string required to view the panel.
 * @param {boolean}  allowAdmin    - Whether the 'admin' role bypasses the gate (default true).
 * @param {ReactNode} children     - The protected panel content.
 */
export function DashboardGuard({ requiredRole, allowAdmin = true, children }) {
  const [context, setContext] = useState({
    userId: null,
    role: null,
    accountStatus: 'active',
    canApproveDeals: false,
    priorityLevel: null,
    error: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      fetchUserContext();
    });

    async function fetchUserContext() {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
          throw userError;
        }

        if (!user) {
          if (mounted) {
            setContext((prev) => ({
              ...prev,
              userId: null,
              role: null,
              accountStatus: 'inactive',
              canApproveDeals: false,
              priorityLevel: null,
              error: 'Not authenticated',
            }));
          }
          return;
        }

        const [{ data: profileData, error: profileError }, { data: accountData, error: accountError }] = await Promise.all([
          supabase
            .from('profiles')
            .select('role, priority_level, can_approve_deals')
            .eq('id', user.id)
            .maybeSingle(),
          supabase
            .from('user_profiles')
            .select('account_status, security_flags')
            .eq('id', user.id)
            .maybeSingle(),
        ]);

        if (profileError) {
          if (!isOptionalResourceError(profileError)) {
            throw profileError;
          }
        }
        if (accountError) {
          if (!isOptionalResourceError(accountError)) {
            throw accountError;
          }
        }

        const securityFlags = parseSecurityFlags(accountData?.security_flags);
        const accountStatus = accountData?.account_status ?? (securityFlags?.suspended ? 'suspended' : 'active');

        if (mounted) {
          setContext({
            userId: user.id,
            role: resolveRole(user, profileData, securityFlags),
            accountStatus,
            canApproveDeals: Boolean(profileData?.can_approve_deals ?? securityFlags?.can_approve_deals),
            priorityLevel: profileData?.priority_level ?? securityFlags?.priority_level ?? null,
            error: null,
          });
        }
      } catch (error) {
        if (mounted) {
          setContext((prev) => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Unable to load security context',
          }));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }
    fetchUserContext();

    return () => {
      mounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-gray-400 animate-pulse font-mono text-sm">
        Synchronizing Security Clearances…
      </div>
    );
  }

  const accountActive = ['active', 'premium'].includes((context.accountStatus || '').toLowerCase());
  const accessGranted =
    accountActive &&
    (context.role === requiredRole || (allowAdmin && context.role === 'admin'));

  if (!accessGranted) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-800 text-red-300 rounded-xl
        max-w-2xl mx-auto my-12 font-sans shadow-2xl">
        <div className="flex items-center gap-3 mb-2 text-red-400 font-bold text-lg">
          <span>⚠️ ACCESS POLICY VIOLATION</span>
        </div>
        <p className="text-sm text-red-400/80">
          Your current credentials do not provide sufficient authorization parameters
          to mount this functional module.
        </p>
        <p className="text-xs mt-3 text-red-300/80 font-mono">
          role={context.role ?? 'none'} · account={context.accountStatus ?? 'unknown'} ·
          approve={String(context.canApproveDeals)} · priority={context.priorityLevel ?? 'n/a'}
        </p>
        {context.error && (
          <p className="text-xs mt-1 text-red-300/80 font-mono">
            reason={context.error}
          </p>
        )}
      </div>
    );
  }

  return <>{children}</>;
}
