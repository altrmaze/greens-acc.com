import React, { useEffect, useState } from 'react';
import { useAdminAuth } from '../hooks/useAdminAuth';

export function AdminPassGate() {
  const {
    isAdmin,
    isLocked,
    loading,
    isAdminPassConfigured,
    verifyAdminPassword,
  } = useAdminAuth();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!loading && isAdmin && !isLocked && isAdminPassConfigured) {
      setUnlocked(true);
    }
  }, [isAdmin, isAdminPassConfigured, isLocked, loading]);

  function handleSubmit(event) {
    event.preventDefault();

    if (!isAdminPassConfigured) {
      setError('Administrative access is locked until VITE_APP_PASS is configured.');
      return;
    }

    if (verifyAdminPassword(password)) {
      setPassword('');
      setError('');
      setUnlocked(true);
      return;
    }

    setError('Administrative access denied. Incorrect passphrase.');
  }

  if (loading) {
    return (
      <div className="p-8 text-gray-400 animate-pulse font-mono text-sm">
        Synchronizing Security Clearances…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="p-6 bg-red-950/40 border border-red-800 text-red-300 rounded-xl max-w-2xl mx-auto my-12 font-sans shadow-2xl">
        <div className="flex items-center gap-3 mb-2 text-red-400 font-bold text-lg">
          <span>⚠️ ACCESS POLICY VIOLATION</span>
        </div>
        <p className="text-sm text-red-400/80">
          Administrative clearance is required before any protected Greens ACC
          dashboard modules can be mounted.
        </p>
      </div>
    );
  }

  if (unlocked && !isLocked) {
    return (
      <div className="p-6 bg-emerald-950/40 border border-emerald-800 text-emerald-300 rounded-xl max-w-2xl mx-auto my-12 font-sans shadow-2xl">
        Administrative clearance verified. Mounting protected modules…
      </div>
    );
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
        {!isAdminPassConfigured ? (
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

export default AdminPassGate;
