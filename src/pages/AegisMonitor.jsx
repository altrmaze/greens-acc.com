import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { supabase } from '../supabaseClient';

function StatusBadge({ status }) {
  const colors = {
    healthy: 'bg-emerald-500/10 text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-400',
    glitching: 'bg-orange-500/10 text-orange-400',
    repairing: 'bg-blue-500/10 text-blue-400',
    offline: 'bg-red-500/10 text-red-400',
    open: 'bg-amber-500/10 text-amber-400',
    resolved: 'bg-emerald-500/10 text-emerald-400',
    failed: 'bg-red-500/10 text-red-400',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colors[status] ?? 'bg-slate-700 text-slate-400'}`}>
      {status}
    </span>
  );
}

function HealthBar({ value }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs text-slate-400 w-8 text-end">{value}%</span>
    </div>
  );
}

export default function AegisMonitor() {
  const { t } = useTranslation();
  const [algorithms, setAlgorithms] = useState([]);
  const [glitches, setGlitches] = useState([]);
  const [repairs, setRepairs] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(null);

  const fetchAll = useCallback(async () => {
    const [algoRes, glitchRes, repairRes, metricRes] = await Promise.all([
      supabase.from('algorithms').select('*').order('name'),
      supabase.from('glitches').select('*').order('detected_at', { ascending: false }).limit(20),
      supabase.from('repairs').select('*').order('started_at', { ascending: false }).limit(20),
      supabase.from('metrics').select('*').order('recorded_at', { ascending: false }).limit(20),
    ]);
    if (!algoRes.error) setAlgorithms(algoRes.data ?? []);
    if (!glitchRes.error) setGlitches(glitchRes.data ?? []);
    if (!repairRes.error) setRepairs(repairRes.data ?? []);
    if (!metricRes.error) setMetrics(metricRes.data ?? []);
    setLastRefresh(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 30000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold text-emerald-400">🛡️ {t('aegis.title')}</h1>
            <p className="text-slate-400 text-sm mt-1">{t('aegis.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs text-slate-500">
                {t('aegis.lastRefresh')}: {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={fetchAll}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            >↻ Refresh</button>
          </div>
        </div>

        {/* Algorithms */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('aegis.algorithms')}</h2>
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => <div key={i} className="animate-pulse bg-slate-800 h-20 rounded-xl" />)}
            </div>
          ) : algorithms.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('aegis.noData')}</p>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {algorithms.map((algo) => (
                <div key={algo.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{algo.name}</p>
                      <p className="text-xs text-slate-500">{algo.algo_type}</p>
                    </div>
                    <StatusBadge status={algo.status} />
                  </div>
                  <HealthBar value={algo.health ?? 0} />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Glitches */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('aegis.glitches')}</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {glitches.length === 0 ? (
              <p className="px-5 py-6 text-slate-500 text-sm">{t('aegis.noData')}</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {glitches.map((g) => (
                  <li key={g.id} className="px-5 py-3 flex flex-wrap items-center gap-3 hover:bg-slate-800/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200 font-medium">{g.title}</p>
                      {g.description && <p className="text-xs text-slate-500 mt-0.5">{g.description}</p>}
                    </div>
                    <StatusBadge status={g.severity} />
                    <StatusBadge status={g.status} />
                    <span className="text-xs text-slate-600">
                      {g.detected_at ? new Date(g.detected_at).toLocaleString() : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Repairs */}
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('aegis.repairs')}</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {repairs.length === 0 ? (
              <p className="px-5 py-6 text-slate-500 text-sm">{t('aegis.noData')}</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {repairs.map((r) => (
                  <li key={r.id} className="px-5 py-3 flex flex-wrap items-center gap-3 hover:bg-slate-800/30">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-200">{r.repair_type ?? r.id}</p>
                    </div>
                    <StatusBadge status={r.status} />
                    <span className="text-xs text-slate-600">
                      {r.started_at ? new Date(r.started_at).toLocaleString() : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Metrics */}
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{t('aegis.metrics')}</h2>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            {metrics.length === 0 ? (
              <p className="px-5 py-6 text-slate-500 text-sm">{t('aegis.noData')}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                      <th className="px-5 py-3 text-start">Type</th>
                      <th className="px-5 py-3 text-start">Value</th>
                      <th className="px-5 py-3 text-start">Unit</th>
                      <th className="px-5 py-3 text-start">Recorded</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.map((m) => (
                      <tr key={m.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="px-5 py-2.5 text-slate-300">{m.metric_type}</td>
                        <td className="px-5 py-2.5 text-emerald-400 font-mono">{m.value}</td>
                        <td className="px-5 py-2.5 text-slate-500 text-xs">{m.unit ?? '—'}</td>
                        <td className="px-5 py-2.5 text-slate-600 text-xs">
                          {m.recorded_at ? new Date(m.recorded_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
