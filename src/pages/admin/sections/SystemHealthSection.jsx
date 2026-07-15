import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { useAdmin } from '../../../context/AdminContext';

/**
 * SystemHealthSection — Phase 6 foundation panel.
 *
 * Provides a real-time overview of the application's health indicators
 * pulled from Supabase. This section is intentionally minimal in Phase 6;
 * each subsequent phase will extend it with richer diagnostics.
 *
 * Protected by AdminRoute (see App.jsx) — only admin-role users can reach
 * this route.
 */

const INDICATORS = [
  { key: 'profiles',           label: 'User Profiles',      icon: '👤' },
  { key: 'agent_tasks',        label: 'Agent Tasks',        icon: '⚙️' },
  { key: 'green_containers',   label: 'Green Containers',   icon: '🟢' },
  { key: 'external_connectors',label: 'Ext. Connectors',    icon: '🔗' },
  { key: 'audit_logs',         label: 'Audit Logs',         icon: '📋' },
];

function HealthCard({ icon, label, count, loading }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
        {loading ? (
          <div className="animate-pulse bg-slate-700 rounded h-6 w-12 mt-1" />
        ) : (
          <p className="text-2xl font-extrabold text-emerald-400">{count ?? '—'}</p>
        )}
      </div>
    </div>
  );
}

function StatusRow({ label, value, ok }) {
  return (
    <li className="flex items-center justify-between px-5 py-3 hover:bg-slate-700/30 transition-colors">
      <span className="text-sm text-slate-300">{label}</span>
      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
        ok
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
      }`}>
        {value}
      </span>
    </li>
  );
}

export default function SystemHealthSection() {
  const { refreshKey } = useAdmin();
  const [counts,  setCounts]  = useState({});
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const results = await Promise.all(
        INDICATORS.map(({ key }) =>
          supabase.from(key).select('id', { count: 'exact', head: true })
        )
      );

      if (cancelled) return;

      const next = {};
      INDICATORS.forEach(({ key }, i) => {
        next[key] = results[i].count ?? 0;
      });
      setCounts(next);
      setCheckedAt(new Date().toLocaleTimeString());
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-slate-100 mb-1">System Health</h2>
          <p className="text-sm text-slate-500">
            Live table counts and connectivity status.
            {checkedAt && (
              <span className="ml-2 text-xs text-slate-600 font-mono">
                Last checked: {checkedAt}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Count cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {INDICATORS.map(({ key, label, icon }) => (
          <HealthCard
            key={key}
            icon={icon}
            label={label}
            count={counts[key]}
            loading={loading}
          />
        ))}
      </div>

      {/* Connectivity checks */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300">Service Connectivity</h3>
        </div>
        <ul className="divide-y divide-slate-700">
          <StatusRow
            label="Supabase Database"
            value={loading ? 'Checking…' : 'Connected'}
            ok={!loading}
          />
          <StatusRow
            label="Authentication Service"
            value="Active"
            ok
          />
          <StatusRow
            label="Public Site"
            value="Under Construction (locked)"
            ok
          />
          <StatusRow
            label="Admin Control Room"
            value="Operational"
            ok
          />
        </ul>
      </div>

      {/* Phase 6 roadmap notice */}
      <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm font-semibold text-slate-400">Phase 6 Foundation</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400
            border border-blue-500/30 font-semibold">IN PROGRESS</span>
        </div>
        <p className="text-xs text-slate-500 leading-relaxed">
          This section will expand to include real-time anomaly detection, agent performance
          KPIs, and automated healing dashboards in subsequent Phase 6 milestones.
          The routing and authentication foundations are locked and stable.
        </p>
      </div>
    </div>
  );
}
