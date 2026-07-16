import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { defaultRedirectForRole, isAllowedRole } from '../lib/auth';

/**
 * UnderConstruction — the sole public entry point.
 *
 * • Unauthenticated visitors see the "Under Construction" screen with a
 *   link to /login.
 * • Authenticated users are immediately redirected away from the public
 *   landing page based on their verified role.
 */
export default function UnderConstruction() {
  const { user, role, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate(
        isAllowedRole(role) ? defaultRedirectForRole(role) : '/unauthorized',
        { replace: true }
      );
    }
  }, [loading, user, role, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="text-emerald-400 animate-pulse text-sm font-mono">
          Verifying clearance…
        </span>
      </div>
    );
  }

  if (user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <span className="text-emerald-400 animate-pulse text-sm font-mono">
          Redirecting…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full
          bg-emerald-900/30 border border-emerald-700/40 mb-8">
          <span className="text-4xl select-none">🌿</span>
        </div>

        {/* Brand */}
        <h1 className="text-3xl font-extrabold text-emerald-400 tracking-tight mb-2">
          GREENS ACC
        </h1>

        {/* Status badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
          bg-amber-500/10 border border-amber-500/30 mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse inline-block" />
          <span className="text-amber-400 text-xs font-semibold uppercase tracking-widest">
            Under Construction
          </span>
        </div>

        <p className="text-slate-400 text-sm mb-10 leading-relaxed">
          We are building something great. This platform is currently restricted
          to authorised personnel only.
        </p>

        {/* Login CTA */}
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500
            text-white font-semibold rounded-xl px-8 py-3 text-sm transition-colors"
        >
          Admin Sign In
          <span aria-hidden="true">→</span>
        </button>

        <p className="mt-10 text-xs text-slate-700 font-mono">
          Greens ACC · All rights reserved
        </p>
      </div>
    </div>
  );
}
