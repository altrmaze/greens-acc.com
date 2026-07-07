import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

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
    departmentId: null,
    departmentRole: null,
    workspaceId: null,
    workspaceQueue: null,
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
              departmentId: null,
              departmentRole: null,
              workspaceId: null,
              workspaceQueue: null,
              accountStatus: 'inactive',
              canApproveDeals: false,
              priorityLevel: null,
              error: 'Not authenticated',
            }));
          }
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, department_id, department_role')
          .eq('id', user.id)
          .single();

        if (profileError) {
          throw profileError;
        }

        let workspaceId = null;
        let workspaceQueue = null;
        if (profileData?.department_id) {
          const { data: workspaceData, error: workspaceError } = await supabase
            .from('workspaces')
            .select('id, workspace_metadata')
            .eq('department_id', profileData.department_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (workspaceError) {
            throw workspaceError;
          }

          workspaceId = workspaceData?.id ?? null;
          workspaceQueue = workspaceData?.workspace_metadata?.queue_names?.telemetry ?? null;

          if (workspaceId && typeof window !== 'undefined') {
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.set('department_id', profileData.department_id);
            nextUrl.searchParams.set('workspace_id', workspaceId);
            if (workspaceQueue) {
              nextUrl.searchParams.set('workspace_queue', workspaceQueue);
            }
            window.history.replaceState({}, '', nextUrl);
          }
        }

        if (mounted) {
          setContext({
            userId: user.id,
            role: profileData?.role ?? null,
            departmentId: profileData?.department_id ?? null,
            departmentRole: profileData?.department_role ?? null,
            workspaceId,
            workspaceQueue,
            accountStatus: 'active',
            canApproveDeals: false,
            priorityLevel: null,
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
  const roleMatched =
    context.role === requiredRole ||
    context.departmentRole === requiredRole ||
    (allowAdmin && context.role === 'admin');
  const accessGranted =
    accountActive &&
    roleMatched;

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
          dept={context.departmentId ?? 'none'} · dept_role={context.departmentRole ?? 'none'} ·
          workspace={context.workspaceId ?? 'none'} · queue={context.workspaceQueue ?? 'none'} ·
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
