import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasAdminAccess } from '../lib/auth';

// TEMPORARY TEST MODE ONLY — set to false to restore normal auth gate
const DEV_BYPASS = true;

// TEMPORARY OWNER PREVIEW — remove once the profiles row for this account is
// confirmed to exist in Supabase with role='admin'.
const OWNER_PREVIEW_EMAIL = 'altrmaze00@gmail.com';

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <span className="text-emerald-400 animate-pulse text-sm font-mono">
        Verifying clearance…
      </span>
    </div>
  );
}

/**
 * AdminRoute — gates a route to authenticated users with the 'admin' role.
 *
 * • loading             → spinner (prevents flash of unauthorized content)
 * • no user             → redirect to /login
 * • owner preview email → allow even when profile/role is missing (temporary)
 * • non-admin           → redirect to /unauthorized
 * • admin               → renders children
 */
export default function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (DEV_BYPASS) return children;

  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;

  // Temporary owner bypass: the authenticated Supabase session email is the
  // sole gate — no localStorage, no URL params, no env vars.
  if (user.email === OWNER_PREVIEW_EMAIL) return children;

  if (!hasAdminAccess(role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
