import React, { useState, useEffect } from 'react';
import AppNav from '../components/AppNav';

const SUPABASE_URL =
  import.meta?.env?.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_URL) ||
  '';

const FUNCTION_BASE = `${SUPABASE_URL}/functions/v1/greens-acc`;

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    faults_detected: 0,
    healed_incidents: 0,
    status: 'NOMINAL',
    green_box_automation: 'ACTIVE RUNNING',
    green_bubbles_sandbox: 'SHIELDED / SECURE',
    multi_agent_orchestration: 'IDLE',
    last_heal_timestamp: 'Never',
  });
  const [waitingCount, setWaitingCount] = useState(0);
  const [roomsCount, setRoomsCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${FUNCTION_BASE}/api/v1/system/status`);
      const data = await res.json();
      setMetrics(data.healing_blends_regime);
      setWaitingCount(data.waiting_areas_count ?? 0);
      setRoomsCount(data.active_rooms_count ?? 0);
    } catch (err) {
      console.error('Dashboard sync error:', err);
      // Using last known / default data — backend sync pending
    }
  };

  const triggerHeal = async () => {
    setLoading(true);
    try {
      await fetch(`${FUNCTION_BASE}/api/v1/system/force-heal?deal_id=deal-777`, {
        method: 'POST',
      });
      alert('Manual Override: Healing Blends Regime Activated.');
      setTimeout(fetchStatus, 2500);
    } catch (err) {
      alert('Failed to send override command.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const statusColor =
    metrics.status === 'NOMINAL'
      ? 'text-emerald-400'
      : metrics.status.startsWith('HEALING')
      ? 'text-amber-400'
      : 'text-red-400';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-emerald-400 tracking-tight">
            🟢 Healing Blends Regime
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            System health monitor · auto-refresh every 5 s
          </p>
          <p className="text-amber-400 text-xs mt-1 font-mono">
            ⚠ Last known data — backend sync pending
          </p>
        </div>
        <button
          onClick={triggerHeal}
          disabled={loading}
          className="hidden sm:block px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold
            hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending…' : '⚡ Force Heal'}
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-16 space-y-6">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="System Status"
            value={<span className={statusColor}>{metrics.status}</span>}
          />
          <MetricCard label="Faults Detected"          value={metrics.faults_detected} />
          <MetricCard label="Healed Incidents"          value={metrics.healed_incidents} />
          <MetricCard label="Last Heal"                 value={metrics.last_heal_timestamp} />
          <MetricCard label="Green Box Automation"      value={metrics.green_box_automation} />
          <MetricCard label="Green Bubbles Sandbox"     value={metrics.green_bubbles_sandbox} />
          <MetricCard label="Multi-Agent Orchestration" value={metrics.multi_agent_orchestration} />
          <MetricCard label="Active Green Rooms"        value={roomsCount} />
        </div>

        <p className="text-xs text-slate-500 font-mono">
          Active waiting areas: {waitingCount}
        </p>

        {/* Mobile Force Heal button */}
        <div className="sm:hidden">
          <button
            onClick={triggerHeal}
            disabled={loading}
            className="w-full px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold
              hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sending…' : '⚡ Force Heal'}
          </button>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-mono mb-1">{label}</p>
      <p className="text-sm font-bold text-slate-100 truncate">{value}</p>
    </div>
  );
}
