import { useState } from 'react';

export default function GatewayPage({ onAccessGranted }) {
  const [passcode, setPasscode] = useState('');
  const [status, setStatus] = useState('SYSTEM_READY');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVerification = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    setStatus('VERIFYING_SECURE_TOKEN...');

    try {
      const response = await fetch('/api/v1/auth/verify-gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: passcode }),
      });

      if (response.ok) {
        setStatus('ACCESS_GRANTED_INITIALIZING_TELEMETRY');
        setTimeout(() => {
          if (typeof onAccessGranted === 'function') onAccessGranted();
        }, 1000);
        return;
      }

      setStatus('INVALID_TOKEN_RETRYING...');
      setIsProcessing(false);
    } catch (error) {
      setStatus('HEALING_CONNECTION_AUTONOMOUSLY...');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-72 border-r border-slate-800 p-6 hidden md:block">
        <div className="text-sm tracking-widest text-emerald-400 mb-6">SECURITY ORCHESTRATOR</div>
        <div className="space-y-2">
          <SidebarLink icon="🛡️" label="Gateway Control" active />
          <SidebarLink icon="📡" label="Telemetry Channel" />
          <SidebarLink icon="⚙️" label="AI Legal & Patent Compliance" />
        </div>
      </aside>

      <main className="flex-1 flex items-center justify-center p-6">
        <section className="w-full max-w-xl rounded-2xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl">
          <h1 className="text-2xl font-bold mb-2">Access Gateway</h1>
          <p className="text-sm text-slate-400 mb-6">Enter your secure token to initialize controlled access.</p>

          <form onSubmit={handleVerification} className="space-y-4">
            <label className="block text-xs uppercase tracking-wide text-slate-400">Secure Token</label>
            <input
              type="password"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-emerald-500"
              placeholder="Enter passcode"
              required
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing || !passcode.trim()}
              className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-3 font-semibold"
            >
              {isProcessing ? 'Processing...' : 'Verify & Continue'}
            </button>
          </form>

          <div className="mt-6 rounded-lg bg-slate-950 border border-slate-800 p-4">
            <div className="text-xs text-slate-400 mb-1">Agent Status</div>
            <div className="font-mono text-sm text-emerald-300">{status}</div>
          </div>
        </section>
      </main>
    </div>
  );
}

function SidebarLink({ icon, label, active }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
        active ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/40' : 'text-slate-300'
      }`}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </div>
  );
}
