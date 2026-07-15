import { useAuth } from '../hooks/useAuth';

/**
 * DashboardGuard
 *
 * Wraps any dashboard panel and gates it behind role-based clearance.
 * Uses the shared AuthContext so no additional DB round-trips are needed.
 *
 * @param {string}   requiredRole  - The role string required to view the panel.
 * @param {boolean}  allowAdmin    - Whether the 'admin' role bypasses the gate (default true).
 * @param {ReactNode} children     - The protected panel content.
 */
export function DashboardGuard({ requiredRole, allowAdmin = true, children }) {
  const { role, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-8 text-gray-400 animate-pulse font-mono text-sm">
        Synchronizing Security Clearances…
      </div>
    );
  }

  const accessGranted =
    role === requiredRole || (allowAdmin && role === 'admin');

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
      </div>
    );
  }

  return <>{children}</>;
}
