import { useState } from 'react';

const SESSION_KEY = 'greens_dev_session';
const TOKEN_VALUE = 'active';

/**
 * DevGate
 *
 * A lightweight developer-access gate driven by the VITE_DEV_GATE_TOKEN
 * environment variable.
 *
 * Behaviour:
 *  - If VITE_DEV_GATE_TOKEN is NOT set the gate is skipped entirely and
 *    children are rendered immediately.  This keeps production deployments
 *    unaffected when the env var is absent.
 *  - If the variable IS set, the user must enter a matching token before
 *    the application mounts.  A successful entry is persisted in
 *    localStorage so the browser session survives page refreshes.
 *
 * Usage:
 *   <DevGate>
 *     <App />
 *   </DevGate>
 *
 * Local development — add to .env.local (never commit this file):
 *   VITE_DEV_GATE_TOKEN=your-local-dev-token
 */
export function DevGate({ children }) {
  const systemToken = import.meta.env.VITE_DEV_GATE_TOKEN;

  // Gate is disabled when the env var is not configured.
  const gateEnabled = Boolean(systemToken);

  const [isUnlocked, setIsUnlocked] = useState(
    !gateEnabled || localStorage.getItem(SESSION_KEY) === TOKEN_VALUE
  );
  const [inputToken, setInputToken] = useState('');
  const [error, setError] = useState('');

  const handleValidation = (e) => {
    e.preventDefault();
    if (inputToken === systemToken) {
      localStorage.setItem(SESSION_KEY, TOKEN_VALUE);
      setIsUnlocked(true);
      setError('');
    } else {
      setError('Access denied. Invalid developer token.');
    }
  };

  // ── Unlocked (or gate disabled) ────────────────────────────────────
  if (isUnlocked) {
    return <>{children}</>;
  }

  // ── Locked maintenance screen ───────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
        {/* Logo / heading */}
        <div className="mb-6 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-emerald-900/60 mb-3">
            <span className="text-2xl">🌿</span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">Greens ACC</h1>
          <p className="mt-1 text-xs text-slate-400">
            This environment is restricted to authorised developers.
          </p>
        </div>

        {/* Token form */}
        <form onSubmit={handleValidation} className="space-y-4">
          <div>
            <label
              htmlFor="dev-token"
              className="block text-xs font-semibold text-slate-400 mb-1 uppercase tracking-wide"
            >
              Developer Access Token
            </label>
            <input
              id="dev-token"
              type="password"
              autoComplete="off"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="Enter token…"
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
            Verify Access
          </button>
        </form>

        <p className="mt-6 text-center text-[11px] text-slate-600">
          Greens ACC · Restricted Developer Environment
        </p>
      </div>
    </div>
  );
}
