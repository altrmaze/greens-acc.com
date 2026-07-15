import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

/**
 * Unauthorized — 403 page rendered when an authenticated user attempts
 * to access a route that their role does not permit.
 */
export default function Unauthorized() {
  const navigate = useNavigate();
  const { user, role, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Icon */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full
          bg-red-900/30 border border-red-700/50 mb-6">
          <span className="text-4xl select-none">🔒</span>
        </div>

        {/* Status */}
        <p className="text-red-500 font-mono text-xs uppercase tracking-widest mb-2">
          HTTP 403 — Access Denied
        </p>
        <h1 className="text-2xl font-extrabold text-slate-100 mb-3">
          Insufficient Clearance
        </h1>
        <p className="text-slate-400 text-sm mb-6">
          Your current role
          {role ? (
            <span className="mx-1 px-2 py-0.5 bg-slate-800 border border-slate-700
              rounded text-slate-300 font-mono text-xs">{role}</span>
          ) : null}
          does not have permission to access this section.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-lg bg-slate-800 border border-slate-700
              text-slate-300 text-sm font-semibold hover:bg-slate-700 transition-colors"
          >
            ← Go Back
          </button>

          {user ? (
            <button
              onClick={signOut}
              className="px-5 py-2.5 rounded-lg bg-red-900/40 border border-red-700/50
                text-red-300 text-sm font-semibold hover:bg-red-900/60 transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm
                font-semibold hover:bg-emerald-500 transition-colors"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
