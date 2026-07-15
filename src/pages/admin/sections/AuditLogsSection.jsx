import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';

const EVENT_COLOR = {
  success: 'bg-emerald-500/10 text-emerald-400',
  error:   'bg-red-500/10 text-red-400',
  warning: 'bg-amber-500/10 text-amber-400',
};

export default function AuditLogsSection() {
  const [events, setEvents]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('agent_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (err) {
        setError(err.message);
      } else {
        setEvents(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 mb-1">Audit Logs</h2>
        <p className="text-sm text-slate-500">
          Last 50 agent action events from <code className="bg-slate-700 px-1 rounded text-xs">agent_actions</code>.
        </p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Event Stream</h3>
          <span className="text-xs text-slate-500">{loading ? '…' : `${events.length} events`}</span>
        </div>

        {error ? (
          <div className="px-5 py-6 text-red-400 text-sm bg-red-500/5 border-t border-red-500/20">
            Failed to load audit events: {error}
          </div>
        ) : loading ? (
          <div className="p-4 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-700 h-9 rounded" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <p className="px-5 py-6 text-slate-500 text-sm">No audit events recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-700 max-h-[60vh] overflow-y-auto">
            {events.map((ev) => {
              const typeKey = ev.action_type ?? ev.event_type ?? '';
              const colorCls = EVENT_COLOR[ev.status] ?? 'bg-slate-700 text-slate-400';
              return (
                <li key={ev.id} className="px-5 py-3 flex flex-wrap items-start gap-3 hover:bg-slate-700/40 transition-colors">
                  <div className="flex-1 min-w-0">
                    <span className="text-slate-300 text-sm font-medium break-all">
                      {typeKey || ev.id}
                    </span>
                    {ev.details && (
                      <p className="text-xs text-slate-500 mt-0.5 truncate">{JSON.stringify(ev.details)}</p>
                    )}
                  </div>
                  {ev.status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colorCls}`}>
                      {ev.status}
                    </span>
                  )}
                  <span className="text-xs text-slate-600 flex-shrink-0">
                    {ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
