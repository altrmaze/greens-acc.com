import { useState, useEffect } from 'react';
import AppNav from '../components/AppNav';
import { DashboardGuard } from '../components/DashboardGuard';

const SUPABASE_URL =
  import.meta?.env?.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_URL) ||
  '';

const FUNCTION_BASE = `${SUPABASE_URL}/functions/v1/greens-acc`;

/** The 0.995 multi-agent consensus safety threshold. */
const SAFETY_THRESHOLD = 0.995;

const PRESIDENTIAL_AGENTS = [
  { id: 'legal',     icon: '⚖️',  name: 'Presidential AI — Legal',     role: 'Contract compliance, sanctions review, legal framework enforcement' },
  { id: 'security',  icon: '🛡️', name: 'Presidential AI — Security',   role: 'Behavioral profiling, threat isolation, kill-switch authority' },
  { id: 'logistics', icon: '🚢', name: 'Presidential AI — Logistics',   role: 'Supply chain verification, shipment manifest cross-check' },
  { id: 'finance',   icon: '💰', name: 'Presidential AI — Finance',     role: 'Transaction risk scoring, FX clearing, ledger balancing' },
  { id: 'media',     icon: '📡', name: 'Presidential AI — Media',       role: 'Press syndication, announcement verification, public record audit' },
];

/**
 * Page 3 — Multi-Agent Analytics & Compliance
 *
 * Displays:
 *  - Five Presidential AI agent statuses
 *  - Executive AI Secretary oversight
 *  - Live 0.995 safety threshold gauge
 *  - System healing metrics
 *  - Kill-switch / isolation status
 *  - Role-gated analyzer panel
 */
export default function AgentAnalytics() {
  const [systemMetrics, setSystemMetrics] = useState({
    faults_detected: 0,
    healed_incidents: 0,
    status: 'NOMINAL',
    green_box_automation: 'ACTIVE RUNNING',
    green_bubbles_sandbox: 'SHIELDED / SECURE',
    multi_agent_orchestration: 'IDLE',
    last_heal_timestamp: 'Never',
  });
  const [consensusScore, setConsensusScore] = useState(1.0);
  const [killSwitchActive, setKillSwitchActive] = useState(false);
  const [healLoading, setHealLoading] = useState(false);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${FUNCTION_BASE}/api/v1/system/status`);
      const data = await res.json();
      const regime = data.healing_blends_regime ?? {};
      setSystemMetrics((prev) => ({ ...prev, ...regime }));
      // Simulate consensus score: nominal = 1.0, healing = 0.997, error = 0.990
      const score =
        regime.status === 'NOMINAL' ? 1.0
        : regime.status?.startsWith('HEALING') ? 0.997
        : 0.99;
      setConsensusScore(score);
      setKillSwitchActive(score < SAFETY_THRESHOLD);
    } catch {
      // keep last known metrics
    }
  };

  const triggerForceHeal = async () => {
    setHealLoading(true);
    try {
      await fetch(`${FUNCTION_BASE}/api/v1/system/force-heal?deal_id=deal-777`, {
        method: 'POST',
      });
      setTimeout(fetchMetrics, 2500);
    } catch {
      /* silently retry on next poll */
    } finally {
      setHealLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const id = setInterval(fetchMetrics, 5000);
    return () => clearInterval(id);
  }, []);

  const thresholdPct = Math.round(consensusScore * 100 * 10) / 10;
  const thresholdSafe = consensusScore >= SAFETY_THRESHOLD;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-pink-400 tracking-tight">
            🔬 Multi-Agent Analytics & Compliance
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Presidential AI consensus engine · 0.995 safety threshold · Kill-switch protocol
          </p>
        </div>
        <button
          onClick={triggerForceHeal}
          disabled={healLoading}
          className="hidden sm:block px-5 py-2 rounded-lg bg-amber-600/20 hover:bg-amber-600 text-amber-400
            hover:text-white text-sm font-semibold border border-amber-500/30 disabled:opacity-50 transition-all"
        >
          {healLoading ? '⚙️ Healing…' : '⚡ Force Heal'}
        </button>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-16 space-y-8">

        {/* ── Consensus Safety Threshold ────────────────────────────── */}
        <div className="rounded-2xl border border-pink-500/20 bg-pink-950/10 px-6 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                ⚡ Multi-Agent Consensus Score
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Minimum required: {(SAFETY_THRESHOLD * 100).toFixed(1)}% · All 5 Presidential AIs must agree
              </p>
            </div>
            <div className={`text-3xl font-black font-mono ${thresholdSafe ? 'text-emerald-400' : 'text-red-400'}`}>
              {thresholdPct}%
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${thresholdSafe ? 'bg-emerald-500' : 'bg-red-500'}`}
              style={{ width: `${thresholdPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 mt-1 font-mono">
            <span>0%</span>
            <span className="text-amber-400">≥{(SAFETY_THRESHOLD * 100).toFixed(1)}% required</span>
            <span>100%</span>
          </div>
          {/* Kill switch alert */}
          {killSwitchActive && (
            <div className="mt-4 bg-red-950/60 border border-red-500/50 rounded-xl px-4 py-3
              flex items-center gap-3 text-sm text-red-300 font-semibold animate-pulse">
              🔴 KILL-SWITCH ACTIVE — Score below 99.5% threshold. All deal execution and payment flows are isolated.
            </div>
          )}
        </div>

        {/* ── Presidential AI Agents ───────────────────────────────── */}
        <div>
          <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-pink-400 animate-pulse" />
            Presidential AI Agents
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PRESIDENTIAL_AGENTS.map((agent) => (
              <AgentCard key={agent.id} agent={agent} status={systemMetrics.status} />
            ))}
            {/* Executive AI Secretary */}
            <div className="rounded-xl border border-yellow-500/30 bg-yellow-950/10 px-5 py-4
              col-span-full sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🤖</span>
                <div>
                  <p className="text-sm font-bold text-yellow-400">Executive AI Secretary</p>
                  <p className="text-xs text-slate-400">Orchestration overseer of all 5 Presidential AIs</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">
                Coordinates consensus votes, aggregates compliance signals, and triggers
                the kill-switch protocol when the 0.995 threshold is breached.
              </p>
              <div className="mt-3">
                <span className={`text-xs font-semibold px-2 py-1 rounded-md border ${
                  systemMetrics.multi_agent_orchestration === 'IDLE'
                    ? 'bg-slate-800 text-slate-400 border-slate-700'
                    : 'bg-pink-900/30 text-pink-400 border-pink-500/30 animate-pulse'
                }`}>
                  {systemMetrics.multi_agent_orchestration}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── System Health Grid ───────────────────────────────────── */}
        <div>
          <h2 className="text-base font-bold text-slate-300 mb-4 flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            System Healing Metrics
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Pipeline Status"      value={systemMetrics.status}                  accent={systemMetrics.status === 'NOMINAL' ? 'emerald' : 'amber'} />
            <MetricCard label="Faults Detected"      value={systemMetrics.faults_detected}         accent="amber" />
            <MetricCard label="Healed Incidents"     value={systemMetrics.healed_incidents}         accent="cyan" />
            <MetricCard label="Last Dynamic Repair"  value={systemMetrics.last_heal_timestamp}      accent="slate" />
            <MetricCard label="Green Box Automation" value={systemMetrics.green_box_automation}     accent="emerald" />
            <MetricCard label="Green Bubbles"        value={systemMetrics.green_bubbles_sandbox}    accent="cyan" />
          </div>
        </div>

        {/* ── Role-Gated Analyzer Panel ────────────────────────────── */}
        <DashboardGuard requiredRole="analyzer">
          <AnalyzerPanel />
        </DashboardGuard>

      </main>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function AgentCard({ agent, status }) {
  const isActive = status !== 'NOMINAL';
  return (
    <div className={`rounded-xl border px-5 py-4 transition-all ${
      isActive ? 'border-pink-500/40 bg-pink-950/10' : 'border-slate-700 bg-slate-900'
    }`}>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{agent.icon}</span>
        <div>
          <p className="text-sm font-bold text-slate-200">{agent.name}</p>
        </div>
      </div>
      <p className="text-xs text-slate-500">{agent.role}</p>
      <div className="mt-3 flex items-center gap-2">
        <span className={`inline-block w-2 h-2 rounded-full ${isActive ? 'bg-pink-400 animate-pulse' : 'bg-emerald-400'}`} />
        <span className="text-xs text-slate-400 font-mono">
          {isActive ? 'ACTIVE — CONSENSUS RUN' : 'STANDBY'}
        </span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, accent }) {
  const colors = {
    emerald: 'text-emerald-400',
    amber:   'text-amber-400',
    cyan:    'text-cyan-400',
    slate:   'text-slate-300',
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-4">
      <p className="text-xs text-slate-500 uppercase tracking-wide font-mono mb-1">{label}</p>
      <p className={`text-sm font-bold truncate ${colors[accent] || 'text-slate-200'}`}>{value}</p>
    </div>
  );
}

function AnalyzerPanel() {
  return (
    <section className="bg-slate-900 rounded-2xl border border-slate-800 px-6 py-8">
      <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-1">
        🔬 Analyzing Team
      </h2>
      <p className="text-sm text-slate-400 mb-6">Read-only market projections & predictive model histories</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {['Market Projection Tables', 'Predictive Model History', 'System View', 'Trade Analytics', 'Risk Dashboard', 'Report Archive'].map((m) => (
          <div key={m} className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 text-sm font-semibold
            text-slate-300 hover:border-pink-500/50 hover:bg-slate-700 transition-all cursor-pointer">
            {m}
          </div>
        ))}
      </div>
    </section>
  );
}
