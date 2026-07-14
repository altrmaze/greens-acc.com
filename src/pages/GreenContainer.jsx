import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer, fetchObjects, fetchAccessLog } from '../services/greenContainer';

function StatusBadge({ value, positiveValues = [] }) {
  const isGood = positiveValues.includes(value?.toLowerCase());
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
      isGood ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20'
              : 'bg-red-500/15 text-red-400 border border-red-500/20'
    }`}>
      {value ?? '—'}
    </span>
  );
}

function Skeleton({ className = '' }) {
  return <div className={`animate-pulse bg-slate-800 rounded-lg ${className}`} />;
}

export default function GreenContainer() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [container, setContainer] = useState(null);
  const [objects, setObjects] = useState([]);
  const [accessLog, setAccessLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const c = await fetchContainer(user.id);
        setContainer(c);
        const [objs, log] = await Promise.all([
          fetchObjects(c.id),
          fetchAccessLog(c.id, 5),
        ]);
        setObjects(objs);
        setAccessLog(log);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const domainCounts = objects.reduce((acc, obj) => {
    acc[obj.vault_domain] = (acc[obj.vault_domain] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">
          🟢 {t('container.title')}
        </h1>
        <p className="text-slate-400 text-sm mb-6">{t('container.subtitle')}</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-400 text-sm mb-6">
            {error === 'JSON object requested, multiple (or no) rows returned'
              ? t('container.noContainer')
              : error}
          </div>
        )}

        {/* Health Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Container Health</h2>
          {loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-14" />)}
            </div>
          ) : container ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{t('container.riskStatus')}</p>
                <StatusBadge value={container.risk_status} positiveValues={['low', 'minimal']} />
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{t('container.lockStatus')}</p>
                <StatusBadge value={container.lock_status} positiveValues={['unlocked']} />
              </div>
              <div className="bg-slate-800 rounded-xl p-4">
                <p className="text-xs text-slate-500 mb-1">{t('container.totalObjects')}</p>
                <span className="text-emerald-400 font-bold text-lg">{objects.length}</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Domain Breakdown */}
        {!loading && Object.keys(domainCounts).length > 0 && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('container.domains')}</h2>
            <div className="flex flex-wrap gap-2">
              {Object.entries(domainCounts).map(([domain, count]) => (
                <span key={domain} className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-emerald-400 font-semibold">{domain}</span>
                  <span className="text-slate-500 ms-2">{count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Recent Access */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">{t('container.lastAccess')}</h2>
          {loading ? <Skeleton className="h-24" /> : accessLog.length === 0 ? (
            <p className="text-slate-500 text-sm">{t('activity.noActivity')}</p>
          ) : (
            <ul className="space-y-2">
              {accessLog.map((log) => (
                <li key={log.id} className="flex items-start gap-3 text-xs text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 flex-shrink-0" />
                  <span className="flex-1">
                    <span className="text-slate-300">{log.accessed_by_agent_id}</span>
                    {' — '}{log.access_purpose}
                  </span>
                  <span className="text-slate-600 whitespace-nowrap">
                    {new Date(log.accessed_at).toLocaleDateString()}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { to: '/documents', icon: '📄', label: t('nav.documents') },
            { to: '/permissions', icon: '🔑', label: t('nav.permissions') },
            { to: '/activity', icon: '📋', label: t('nav.activity') },
          ].map(({ to, icon, label }) => (
            <Link
              key={to}
              to={to}
              className="bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-xl px-4 py-4 flex items-center gap-3 text-sm font-semibold text-slate-300 hover:text-emerald-400 transition-all"
            >
              <span className="text-xl">{icon}</span>
              {label}
              <span className="ms-auto text-slate-600">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
