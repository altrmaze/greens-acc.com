import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasAdminAccess } from '../lib/auth';

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
 * • loading   → spinner (prevents flash of unauthorized content)
 * • no user   → redirect to /login
 * • non-admin → redirect to /unauthorized
 * • admin     → renders children
 */
export default function AdminRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  if (!hasAdminAccess(role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
