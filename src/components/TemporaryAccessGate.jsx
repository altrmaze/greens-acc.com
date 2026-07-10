import { useState } from 'react';

/**
 * TemporaryAccessGate
 *
 * A development-only routing helper that lets authorised staff jump directly
 * to their role dashboard during initial testing.
 *
 * Security notes:
 *  - Navigation targets are taken exclusively from ROLE_ROUTES (allowlist).
 *    Raw user input is NEVER interpolated into a URL, preventing open-redirect
 *    attacks (CWE-601).
 *  - This component does NOT bypass DashboardGuard.  Navigating to a route
 *    still requires the user to hold the matching Supabase role; unauthenticated
 *    visitors will see the access-denied screen.
 *  - Remove or gate behind DevGate before deploying to production.
 */

/** Explicit allowlist — only these routes are reachable via this component. */
const ROLE_ROUTES = {
  admin:           '/dashboard/admin',
  engineer:        '/dashboard/engineer',
  accounting:      '/dashboard/accounting',
  accountant:      '/dashboard/accounting',
  account_manager: '/dashboard/account-manager',
  financial:       '/dashboard/financial-manager',
  analyzer:        '/dashboard/analyzer',
};

export default function TemporaryAccessGate() {
  const [roleInput, setRoleInput] = useState('');
  const [error, setError]         = useState('');

  // Direct admin shortcut
  const handleAdminAccess = () => {
    window.location.href = ROLE_ROUTES.admin;
  };

  // Role-based routing via allowlist
  const handleRoleAccess = (e) => {
    e.preventDefault();
    const key = roleInput.trim().toLowerCase();

    if (!key) {
      setError('Please enter a job description / role.');
      return;
    }

    const destination = ROLE_ROUTES[key];
    if (!destination) {
      setError(`Unknown role "${key}". Valid roles: ${Object.keys(ROLE_ROUTES).join(', ')}.`);
      return;
    }

    window.location.href = destination;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">

        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900/60 mb-3">
            <span className="text-2xl">🌿</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Greens ACC</h1>
          <p className="mt-1 text-xs text-slate-400">
            Temporary developer access gate — select your role to continue.
          </p>
        </div>

        {/* Quick admin button */}
        <button
          onClick={handleAdminAccess}
          className="w-full mb-4 rounded-lg bg-red-700/80 px-4 py-2.5 text-sm font-semibold
            text-white hover:bg-red-600 active:bg-red-800 transition"
        >
          🔑 Enter as Super Admin
        </button>

        <div className="my-4 flex items-center gap-2">
          <hr className="flex-1 border-slate-700" />
          <span className="text-xs text-slate-500">or enter role</span>
          <hr className="flex-1 border-slate-700" />
        </div>

        {/* Role form */}
        <form onSubmit={handleRoleAccess} className="space-y-4">
          <div>
            <label
              htmlFor="role-input"
              className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide"
            >
              Job Description / Role
            </label>
            <input
              id="role-input"
              type="text"
              autoComplete="off"
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              placeholder="e.g. engineer, accounting…"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5
                text-sm text-slate-100 placeholder-slate-500 outline-none
                focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 font-medium">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold
              text-white hover:bg-emerald-500 active:bg-emerald-700 transition"
          >
            Go to Dashboard →
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-600">
          Dev gate · All routes still enforce Supabase role checks
        </p>
      </div>
    </div>
  );
}
