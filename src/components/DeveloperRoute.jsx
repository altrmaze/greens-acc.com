import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasDeveloperAccess } from '../lib/auth';

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
 * DeveloperRoute — gates a route to authenticated users with the
 * 'developer' or 'admin' role (admins always inherit developer access).
 *
 * • loading       → spinner
 * • no user       → redirect to /login
 * • insufficient  → redirect to /unauthorized
 * • developer/admin → renders children
 */
export default function DeveloperRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user)   return <Navigate to="/login" replace />;
  if (!hasDeveloperAccess(role)) return <Navigate to="/unauthorized" replace />;
  return children;
}
