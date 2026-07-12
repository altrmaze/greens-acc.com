import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer, fetchAccessLog } from '../services/greenContainer';

const PAGE_SIZE = 25;

export default function Activity() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [log, setLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const c = await fetchContainer(user.id);
        const entries = await fetchAccessLog(c.id, 250);
        setLog(entries);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const totalPages = Math.max(1, Math.ceil(log.length / PAGE_SIZE));
  const paged = log.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">📋 {t('activity.title')}</h1>
        <p className="text-slate-400 text-sm mb-6">{t('activity.subtitle')}</p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="animate-pulse bg-slate-800 h-12 rounded-lg" />
              ))}
            </div>
          ) : paged.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">{t('activity.noActivity')}</div>
          ) : (
            <ul className="divide-y divide-slate-800">
              {paged.map((entry) => (
                <li key={entry.id} className="px-4 sm:px-6 py-4 flex flex-wrap gap-4 items-start hover:bg-slate-800/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200">
                      {entry.accessed_by_agent_id}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">{entry.access_purpose}</p>
                    {entry.objects_accessed && (
                      <p className="text-xs text-slate-600 mt-0.5">
                        Objects: {JSON.stringify(entry.objects_accessed)}
                      </p>
                    )}
                  </div>
                  <time className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(entry.accessed_at).toLocaleString()}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg transition-colors"
            >← {t('common.back')}</button>
            <span className="text-xs text-slate-500">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 rounded-lg transition-colors"
            >{t('common.view')} →</button>
          </div>
        )}
      </div>
    </div>
  );
}
