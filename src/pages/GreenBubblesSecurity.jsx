import { useState, useEffect, useCallback } from 'react';
import AppNav from '../components/AppNav';

const SUPABASE_URL =
  import.meta?.env?.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_URL) ||
  '';

const DEFENSE_BASE = `${SUPABASE_URL}/functions/v1/greenBubblesDefense`;

// ── Risk color helpers ─────────────────────────────────────────────
const RISK_META = {
  dark_red: { label: 'CRITICAL',  bg: 'bg-rose-950/60',   border: 'border-rose-600',   text: 'text-rose-300',   dot: 'bg-rose-500',     bar: 'bg-rose-600'   },
  red:      { label: 'SEVERE',    bg: 'bg-red-950/40',    border: 'border-red-700',    text: 'text-red-300',    dot: 'bg-red-500',      bar: 'bg-red-500'    },
  orange:   { label: 'HIGH',      bg: 'bg-orange-950/40', border: 'border-orange-700', text: 'text-orange-300', dot: 'bg-orange-500',   bar: 'bg-orange-500' },
  yellow:   { label: 'ELEVATED',  bg: 'bg-yellow-950/30', border: 'border-yellow-700', text: 'text-yellow-300', dot: 'bg-yellow-400',   bar: 'bg-yellow-500' },
  green:    { label: 'NORMAL',    bg: 'bg-emerald-950/20',border: 'border-emerald-800',text: 'text-emerald-300',dot: 'bg-emerald-500',  bar: 'bg-emerald-500'},
};

function riskMeta(color) {
  return RISK_META[color] ?? RISK_META.green;
}

function overallHealthColor(cap) {
  const pct = cap?.analysis_capacity_percent ?? 0;
  if (cap?.load_shedding_active) return 'dark_red';
  if (pct >= 90) return 'red';
  if (pct >= 80) return 'orange';
  if (pct >= 60) return 'yellow';
  return 'green';
}

// ── Five Green Bubbles ─────────────────────────────────────────────
const BUBBLES = [
  { key: 'honeypot',     icon: '🍯', label: 'Honeypot',           desc: 'Decoy trap layer' },
  { key: 'behavior',     icon: '🧠', label: 'Behavior & Trust',   desc: 'Context & correlation' },
  { key: 'integrity',    icon: '🔒', label: 'Data Integrity',      desc: 'Tamper detection' },
  { key: 'iron_shield',  icon: '🛡️', label: 'Iron Shield',         desc: 'Request firewall' },
  { key: 'crypto_vault', icon: '🔐', label: 'Crypto Vault',        desc: 'Financial guard' },
];

// ──────────────────────────────────────────────────────────────────
export default function GreenBubblesSecurity() {
  const [status,   setStatus]   = useState(null);
  const [threats,  setThreats]  = useState([]);
  const [timeline, setTimeline] = useState([]);
  const [report,   setReport]   = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    try {
      const [sRes, tRes, lRes, rRes] = await Promise.all([
        fetch(`${DEFENSE_BASE}?endpoint=status`),
        fetch(`${DEFENSE_BASE}?endpoint=threats`),
        fetch(`${DEFENSE_BASE}?endpoint=timeline`),
        fetch(`${DEFENSE_BASE}?endpoint=report`),
      ]);

      const [sData, tData, lData, rData] = await Promise.all([
        sRes.json().catch(() => null),
        tRes.json().catch(() => null),
        lRes.json().catch(() => null),
        rRes.json().catch(() => null),
      ]);

      if (sData) setStatus(sData);
      if (tData?.threats)  setThreats(tData.threats);
      if (lData?.timeline) setTimeline(lData.timeline);
      if (rData?.report)   setReport(rData.report);
      setLastRefresh(new Date());
    } catch (_) {
      // keep last known data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const id = setInterval(fetchAll, 10_000);
    return () => clearInterval(id);
  }, [fetchAll]);

  const cap     = status?.capacity     ?? {};
  const today   = status?.today        ?? {};
  const health  = overallHealthColor(cap);
  const healthM = riskMeta(health);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-emerald-400 tracking-tight flex items-center gap-2">
            🛡️ Green Bubbles Security Home
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Autonomous Defense Orchestrator · auto-refresh every 10 s
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${healthM.border} ${healthM.text} ${healthM.bg}`}>
            OVERALL HEALTH: {healthM.label}
          </span>
          {lastRefresh && (
            <span className="text-[11px] text-slate-600 font-mono">
              Last sync {lastRefresh.toLocaleTimeString()}
            </span>
          )}
        </div>
      </header>

      {loading && (
        <div className="max-w-7xl mx-auto px-6 pb-4 text-xs text-slate-500 font-mono animate-pulse">
          Synchronizing defensive telemetry…
        </div>
      )}

      <main className="max-w-7xl mx-auto px-6 pb-16 space-y-8">

        {/* ── Top KPI Counters ───────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 font-mono">
            Today's Security Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            <KpiCard label="Total Caught"         value={today.threats     ?? 0} color="yellow" />
            <KpiCard label="Quarantined"           value={today.quarantined ?? 0} color="orange" />
            <KpiCard label="Blocked"               value={today.blocked     ?? 0} color="red"    />
            <KpiCard label="Under Analysis"        value={cap.active_bubbles   ?? 0} color="cyan"  />
            <KpiCard label="Critical Events"       value={today.critical    ?? 0} color="rose"   />
            <KpiCard label="Active Bubbles"        value={cap.active_bubbles   ?? 0} color="emerald"/>
            <KpiCard label="Events / min"          value={cap.events_per_minute ?? 0} color="slate" />
            <KpiCard label="Capacity %"            value={`${cap.analysis_capacity_percent ?? 0}%`} color="slate" />
          </div>
        </section>

        {/* ── Load shedding / circuit-breaker alert ─────────────────── */}
        {cap.load_shedding_active && (
          <div className="rounded-xl border border-rose-600 bg-rose-950/50 px-5 py-4 flex items-start gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <p className="text-sm font-bold text-rose-300">EMERGENCY LOAD SHEDDING ACTIVE</p>
              <p className="text-xs text-rose-400/80 mt-0.5">
                Analysis capacity exceeded {90}%. Low-trust traffic is being denied without expensive analysis.
                Production availability is protected. Quarantine without dynamic execution is in effect.
              </p>
            </div>
          </div>
        )}

        {/* ── Five Green Bubbles ────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 font-mono">
            Defensive Layer Status
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {BUBBLES.map(b => (
              <BubbleCard
                key={b.key}
                bubble={b}
                today={today}
                cap={cap}
                health={health}
              />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-600 font-mono">
            Bubble color = current risk level · Bubble size (event volume) is reflected by border thickness ·
            Numeric values are always provided alongside visual indicators.
          </p>
        </section>

        {/* ── Two-path architecture legend ─────────────────────────── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-5">
          <h2 className="text-sm font-bold text-slate-300 mb-4">Two-Path Security Architecture</h2>
          <div className="grid sm:grid-cols-2 gap-6 text-xs font-mono">
            <div className="space-y-2">
              <p className="text-emerald-400 font-bold">✅ TRUSTED PATH</p>
              <p className="text-slate-400">Risk score 0–24 · Composite score below elevation threshold</p>
              <p className="text-slate-500">→ Normal application flow · Low monitoring overhead</p>
            </div>
            <div className="space-y-2">
              <p className="text-yellow-400 font-bold">🔍 SUSPICIOUS PATH → GREEN BUBBLES ISLAND</p>
              <p className="text-slate-400">Risk score 25–100 · Five-model pipeline · Isolated analysis</p>
              <p className="text-slate-500">→ Score → Isolate → Observe → Classify → Contain → Destroy bubble → Preserve forensics</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-600 font-mono space-y-1">
            <p>⛔ NO autonomous fund release · NO autonomous production code change · NO critical data deletion</p>
            <p>⛔ NO unknown binary execution on production infrastructure</p>
            <p>✅ Every autonomous action records: what · why · signal · policy · resource · success · reversal path</p>
          </div>
        </section>

        {/* ── Capacity & Overload Monitor ───────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 font-mono">
            Capacity & Overload Monitor
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <CapacityBar label="Analysis Capacity"      pct={cap.analysis_capacity_percent   ?? 0} />
            <CapacityBar label="Gateway Load"           pct={cap.gateway_load_percent        ?? 0} />
            <CapacityBar label="Quarantine Storage"     pct={cap.quarantine_storage_percent  ?? 0} />
          </div>
          <div className="mt-3 grid sm:grid-cols-3 gap-4 text-xs text-slate-400 font-mono">
            <p><span className="text-emerald-400">●</span> 0–59% NORMAL operation</p>
            <p><span className="text-yellow-400">●</span> 60–79% Prepare additional workers</p>
            <p><span className="text-orange-400">●</span> 80–89% Scale if infrastructure supports</p>
          </div>
          <p className="mt-1 text-xs text-slate-600 font-mono">
            <span className="text-red-400">●</span> 90–100% Emergency load shedding · Prioritize production · Quarantine without expensive analysis
          </p>
          <div className="mt-3 grid sm:grid-cols-4 gap-3">
            <SmallStat label="Active Bubbles"   value={cap.active_bubbles   ?? 0} max="50"  />
            <SmallStat label="Queued Jobs"      value={cap.queued_jobs      ?? 0} max="200" />
            <SmallStat label="Rejected Jobs"    value={cap.rejected_jobs    ?? 0} />
            <SmallStat label="Circuit Breaker"  value={cap.circuit_breaker_open ? 'OPEN' : 'CLOSED'} alert={cap.circuit_breaker_open} />
          </div>
        </section>

        {/* ── Live Threat Timeline ──────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 font-mono">
            Live Threat Timeline
          </h2>
          {timeline.length === 0 ? (
            <EmptyState icon="📭" label="No security events recorded yet." />
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {timeline.slice(0, 50).map((ev, i) => (
                <TimelineRow key={ev.id ?? i} ev={ev} />
              ))}
            </div>
          )}
        </section>

        {/* ── Threat Profiles ───────────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 font-mono">
            Known Threat Profiles
            <span className="ml-2 text-slate-600">({threats.length})</span>
          </h2>
          {threats.length === 0 ? (
            <EmptyState icon="🟢" label="No threat profiles on record." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900">
                    <Th>Fingerprint</Th>
                    <Th>Classification</Th>
                    <Th>Risk</Th>
                    <Th>Detections</Th>
                    <Th>Last Seen</Th>
                    <Th>Response</Th>
                  </tr>
                </thead>
                <tbody>
                  {threats.slice(0, 20).map((t, i) => {
                    const m = riskMeta(
                      t.current_risk_level === 'critical' ? 'dark_red'
                      : t.current_risk_level === 'severe'  ? 'red'
                      : t.current_risk_level === 'high'    ? 'orange'
                      : t.current_risk_level === 'elevated'? 'yellow'
                      : 'green'
                    );
                    return (
                      <tr key={t.id ?? i} className="border-b border-slate-800/50 hover:bg-slate-900/60">
                        <td className="px-4 py-2 text-slate-400">{t.fingerprint}</td>
                        <td className={`px-4 py-2 font-bold uppercase ${m.text}`}>{t.classification}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${m.border} ${m.text} ${m.bg}`}>
                            {t.highest_risk_score ?? 0}/100 · {m.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-300">{t.detection_count ?? 1}</td>
                        <td className="px-4 py-2 text-slate-500">
                          {t.last_seen_at ? new Date(t.last_seen_at).toLocaleString() : '—'}
                        </td>
                        <td className={`px-4 py-2 font-bold ${m.text}`}>
                          {t.recommended_response ?? '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ── Daily Security Report ─────────────────────────────────── */}
        <section>
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 font-mono">
            Daily Security Report
          </h2>
          {report ? (
            <DailyReport report={report} />
          ) : (
            <EmptyState icon="📋" label="No daily report generated yet. Reports are created once per day." />
          )}
        </section>

        {/* ── Health & Threat Fire Distinction ──────────────────────── */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/40 px-6 py-5">
          <h2 className="text-sm font-bold text-slate-300 mb-4">
            System Health Fire vs. Threat Fire
          </h2>
          <div className="grid sm:grid-cols-2 gap-6 text-xs">
            <div>
              <p className="text-amber-400 font-bold mb-2">🔥 SYSTEM HEALTH FIRE (Infrastructure)</p>
              <ul className="space-y-1 text-slate-400 list-disc list-inside">
                <li>CPU exhaustion · Memory pressure · Queue overload</li>
                <li>Database failure · Service failure · Latency spike</li>
                <li>Storage pressure · Analysis capacity exhaustion</li>
              </ul>
            </div>
            <div>
              <p className="text-red-400 font-bold mb-2">🔥 THREAT FIRE (Security Activity)</p>
              <ul className="space-y-1 text-slate-400 list-disc list-inside">
                <li>Honeypot trigger · Malicious artifact indicator</li>
                <li>Abnormal request behavior · Repeated auth failure</li>
                <li>Suspicious high-value transaction · Integrity violation</li>
                <li>Coordinated high-rate activity</li>
              </ul>
            </div>
          </div>
          <p className="mt-4 text-[11px] text-slate-600 font-mono">
            Infrastructure failure and malicious activity are not treated as the same event.
            They are correlated when both occur together.
          </p>
        </section>

      </main>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function KpiCard({ label, value, color }) {
  const colors = {
    yellow:  'text-yellow-400',
    orange:  'text-orange-400',
    red:     'text-red-400',
    rose:    'text-rose-400',
    cyan:    'text-cyan-400',
    emerald: 'text-emerald-400',
    slate:   'text-slate-300',
  };
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <p className="text-[10px] text-slate-500 uppercase tracking-wide font-mono mb-1 leading-tight">{label}</p>
      <p className={`text-lg font-black font-mono ${colors[color] ?? 'text-slate-200'}`}>{value}</p>
    </div>
  );
}

function BubbleCard({ bubble, today, cap, health }) {
  const m = riskMeta(health);
  const eventCount = today?.total ?? 0;
  // Border thickness grows with event volume (visual size proxy)
  const borderClass = eventCount > 100 ? 'border-2' : 'border';

  return (
    <div className={`rounded-2xl ${borderClass} ${m.border} ${m.bg} px-5 py-5 transition-all`}>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{bubble.icon}</span>
        <div>
          <p className="text-sm font-bold text-slate-200">{bubble.label}</p>
          <p className="text-[11px] text-slate-500">{bubble.desc}</p>
        </div>
      </div>

      <div className="space-y-1 text-xs font-mono">
        <Row label="State"        value={health === 'green' ? 'OPERATIONAL' : m.label} color={m.text} />
        <Row label="Risk %"       value={`${cap.analysis_capacity_percent ?? 0}%`} />
        <Row label="Events Today" value={today?.total ?? 0} />
        <Row label="Active Inc."  value={today?.critical ?? 0} />
        <Row label="Load %"       value={`${cap.gateway_load_percent ?? 0}%`} />
      </div>

      {/* Pulse indicator — always paired with numeric value */}
      <div className="mt-3 flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full inline-block ${m.dot} ${
          health !== 'green' ? 'animate-pulse' : ''
        }`} />
        <span className="text-[11px] text-slate-500 font-mono">
          {health !== 'green' ? `RISK ELEVATED — ${m.label}` : 'NOMINAL'}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value, color = 'text-slate-300' }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

function CapacityBar({ label, pct }) {
  const barColor = pct >= 90 ? 'bg-rose-600'
    : pct >= 80 ? 'bg-orange-500'
    : pct >= 60 ? 'bg-yellow-500'
    : 'bg-emerald-500';
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-3">
      <div className="flex justify-between mb-2">
        <p className="text-xs text-slate-400 font-mono">{label}</p>
        <p className="text-xs font-bold text-slate-300 font-mono">{pct}%</p>
      </div>
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function SmallStat({ label, value, max, alert }) {
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs font-mono ${
      alert ? 'border-rose-700 bg-rose-950/30 text-rose-300' : 'border-slate-800 bg-slate-900 text-slate-300'
    }`}>
      <p className="text-slate-500 text-[10px] mb-0.5">{label}</p>
      <p className="font-bold">
        {value}
        {max && <span className="text-slate-600"> / {max}</span>}
      </p>
    </div>
  );
}

function TimelineRow({ ev }) {
  const m = riskMeta(ev.risk_color ?? 'green');
  return (
    <div className={`flex items-start gap-3 rounded-lg border ${m.border} ${m.bg} px-4 py-2.5 text-xs`}>
      <span className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${m.dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
          <span className={`font-bold uppercase ${m.text}`}>{m.label}</span>
          <span className="text-slate-400 font-mono">{ev.event_type ?? '—'}</span>
          <span className="text-slate-500">→ {ev.final_action ?? '—'}</span>
          {ev.path === 'suspicious' && (
            <span className="text-yellow-400 font-bold">SUSPICIOUS PATH</span>
          )}
        </div>
        <div className="flex flex-wrap gap-x-3 mt-0.5 text-slate-500 font-mono">
          <span>risk {ev.composite_risk ?? 0}/100</span>
          <span>{ev.event_source ?? '—'}</span>
          {ev.created_at && (
            <span>{new Date(ev.created_at).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function DailyReport({ report }) {
  const recs = Array.isArray(report.recommendations) ? report.recommendations : [];
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/50 px-6 py-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-2">
        <p className="text-sm font-bold text-slate-200">
          Report: {report.report_date} · {report.timezone}
        </p>
        <p className="text-xs text-slate-500 font-mono">
          Generated: {report.generated_at ? new Date(report.generated_at).toLocaleString() : '—'}
        </p>
      </div>
      {report.summary && (
        <p className="text-xs text-slate-400 border-l-2 border-emerald-600 pl-3">
          {report.summary}
        </p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          ['Total Requests',    report.total_requests],
          ['Threats Detected',  report.threats_detected],
          ['Quarantined',       report.quarantined_objects],
          ['Denied',            report.denied_requests],
          ['Critical Events',   report.critical_events],
          ['Bubbles Destroyed', report.bubbles_destroyed],
          ['Peak Capacity',     `${report.peak_capacity_percent ?? 0}%`],
        ].map(([l, v]) => (
          <div key={l} className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-center">
            <p className="text-[10px] text-slate-500 font-mono leading-tight mb-1">{l}</p>
            <p className="text-sm font-bold text-slate-200 font-mono">{v ?? 0}</p>
          </div>
        ))}
      </div>
      {recs.length > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">
            Recommended Engineering Actions
          </p>
          <ul className="space-y-1">
            {recs.map((r, i) => (
              <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                <span className="text-emerald-500 flex-shrink-0">→</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EmptyState({ icon, label }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-6 py-8 text-center">
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-sm text-slate-500 font-mono">{label}</p>
    </div>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-2.5 text-left text-slate-500 font-bold uppercase tracking-wide text-[10px]">
      {children}
    </th>
  );
}
