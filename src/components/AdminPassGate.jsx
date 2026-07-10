import { useState } from 'react';
import { tryUnlockAdminAccess } from '../utils/adminAccess';

export function AdminPassGate({
  configured = true,
  onUnlock = () => {},
  verifyPassword = tryUnlockAdminAccess,
}) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event) {
    event.preventDefault();

    if (!configured) {
      return;
    }

    if (verifyPassword(password)) {
      setPassword('');
      setError('');
      onUnlock();
      return;
    }

    setError('Administrative access denied. Incorrect passphrase.');
  }

  return (
    <div className="max-w-2xl mx-auto my-12 rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
      <div className="border-b border-slate-200 bg-slate-950 px-6 py-4">
        <div className="text-xs font-semibold tracking-[0.28em] text-emerald-400 uppercase">
          Greens ACC Security Layer
        </div>
        <h2 className="mt-2 text-2xl font-bold text-white">
          Administrative Firewall Lock
        </h2>
        <p className="mt-2 text-sm text-slate-300">
          Administrative sessions require an additional client-side access pass before
          privileged modules can be mounted.
        </p>
      </div>

      <div className="px-6 py-6">
        {!configured ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            Administrative access is currently locked because <code>VITE_APP_PASS</code>
            {' '}is not configured for this build.
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="admin-passphrase">
                Administrative passphrase
              </label>
              <input
                id="admin-passphrase"
                type="password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  if (error) {
                    setError('');
                  }
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
                autoComplete="current-password"
                placeholder="Enter administrative passphrase"
              />
            </div>

            {error ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              Unlock Administrative Modules
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
