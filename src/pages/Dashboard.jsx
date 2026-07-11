import React, { useState, useEffect } from 'react';

const SUPABASE_URL =
  import.meta?.env?.VITE_SUPABASE_URL ||
  window.__ENV__?.SUPABASE_URL ||
  '';

const FUNCTION_BASE = `${SUPABASE_URL}/functions/v1/greens-acc`;

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    faults_detected: 0,
    healed_incidents: 0,
    status: 'NOMINAL',
    green_box_automation: 'ACTIVE',
    green_bubbles_sandbox: 'SHIELDED',
    multi_agent_orchestration: 'IDLE',
    last_heal_timestamp: 'Never',
  });
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${FUNCTION_BASE}/api/system/status`);
      const data = await res.json();
      setMetrics(data.healing_blends_regime);
    } catch (err) {
      console.error('Dashboard sync error:', err);
    }
  };

  const triggerHeal = async () => {
    setLoading(true);
    try {
      await fetch(`${FUNCTION_BASE}/api/system/force-heal`, { method: 'POST' });
      alert('Manual Override: Healing Blends Regime Activated.');
      setTimeout(fetchStatus, 2000);
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
      ? 'text-emerald-600'
      : metrics.status === 'HEALING_ACTIVE'
      ? 'text-amber-500'
      : 'text-red-500';

  return (
    <section className="max-w-4xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">
            🟢 Healing Blends Regime
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            System health monitor · auto-refresh every 5 s
          </p>
        </div>
        <button
          onClick={triggerHeal}
          disabled={loading}
          className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold
            hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending…' : '⚡ Force Heal'}
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="System Status"
          value={<span className={statusColor}>{metrics.status}</span>}
        />
        <MetricCard label="Faults Detected" value={metrics.faults_detected} />
        <MetricCard label="Healed Incidents" value={metrics.healed_incidents} />
        <MetricCard
          label="Green Box Automation"
          value={metrics.green_box_automation}
        />
        <MetricCard
          label="Green Bubbles Sandbox"
          value={metrics.green_bubbles_sandbox}
        />
        <MetricCard
          label="Multi-Agent Orchestration"
          value={metrics.multi_agent_orchestration}
        />
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Last heal: {metrics.last_heal_timestamp}
      </p>
    </section>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4">
      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-lg font-bold text-slate-800">{value}</p>
    </div>
  );
}
