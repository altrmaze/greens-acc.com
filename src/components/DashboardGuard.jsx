import { useAuth } from '../context/AuthContext';
import { hasAdminAccess } from '../lib/auth';

/**
 * DashboardGuard — renders children only when the authenticated user has the
 * required role (or is an admin, unless allowAdmin is explicitly set to false).
 *
 * Used inside already-authenticated pages to conditionally show role-specific
 * panels. Unlike AdminRoute / DeveloperRoute (which redirect unauthenticated
 * users at the router level), DashboardGuard simply hides its subtree — it
 * does not redirect.
 *
 * Props:
 *   requiredRole {string}  — the role the user must hold to see the children
 *   allowAdmin   {boolean} — (default true) when true, admin users always see
 *                            the children regardless of requiredRole
 *   children     {node}    — content to conditionally render
 */
export function DashboardGuard({ requiredRole, allowAdmin = true, children }) {
  const { user, role } = useAuth();

  if (!user) return null;

  // Admin bypass (unless the caller explicitly opted out, e.g. allowAdmin={false})
  if (allowAdmin && hasAdminAccess(role)) return children;

  // Exact role match
  if (role === requiredRole) return children;

  return null;
}
