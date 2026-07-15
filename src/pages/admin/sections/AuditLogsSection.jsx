import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';

const AGENT_EVENT_COLOR = {
  success: 'bg-emerald-500/10 text-emerald-400',
  error:   'bg-red-500/10 text-red-400',
  warning: 'bg-amber-500/10 text-amber-400',
};

const USER_ACTION_COLOR = {
  invite_user:      'bg-emerald-500/10 text-emerald-400',
  update_role:      'bg-blue-500/10 text-blue-400',
  deactivate_user:  'bg-amber-500/10 text-amber-400',
  reactivate_user:  'bg-emerald-500/10 text-emerald-400',
  reset_password:   'bg-violet-500/10 text-violet-400',
  delete_user:      'bg-red-500/10 text-red-400',
};

const TABS = ['User Management', 'Agent Actions'];

function Skeleton({ rows = 6 }) {
  return (
    <div className="p-4 space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="animate-pulse bg-slate-700 h-9 rounded" />
      ))}
    </div>
  );
}

function UserAuditList({ events, loading, error }) {
  if (error) {
    return (
      <div className="px-5 py-6 text-red-400 text-sm bg-red-500/5 border-t border-red-500/20">
        Failed to load user audit events: {error}
      </div>
    );
  }
  if (loading) return <Skeleton />;
  if (events.length === 0) {
    return <p className="px-5 py-6 text-slate-500 text-sm">No user management events recorded yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-700 max-h-[60vh] overflow-y-auto">
      {events.map((ev) => {
        const colorCls = USER_ACTION_COLOR[ev.action] ?? 'bg-slate-700 text-slate-400';
        const details = ev.new_values || ev.old_values;
        return (
          <li key={ev.id} className="px-5 py-3 flex flex-wrap items-start gap-3 hover:bg-slate-700/40 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colorCls}`}>
                  {ev.action ?? '—'}
                </span>
                {ev.target_id && (
                  <span className="text-xs text-slate-400 font-mono truncate max-w-[140px]">
                    {ev.target_id}
                  </span>
                )}
              </div>
              {details && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {JSON.stringify(details)}
                </p>
              )}
            </div>
            <span className="text-xs text-slate-600 flex-shrink-0">
              {ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function AgentActionList({ events, loading, error }) {
  if (error) {
    return (
      <div className="px-5 py-6 text-red-400 text-sm bg-red-500/5 border-t border-red-500/20">
        Failed to load agent events: {error}
      </div>
    );
  }
  if (loading) return <Skeleton />;
  if (events.length === 0) {
    return <p className="px-5 py-6 text-slate-500 text-sm">No agent events recorded yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-700 max-h-[60vh] overflow-y-auto">
      {events.map((ev) => {
        const typeKey  = ev.action_type ?? ev.event_type ?? '';
        const colorCls = AGENT_EVENT_COLOR[ev.status] ?? 'bg-slate-700 text-slate-400';
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
  );
}

export default function AuditLogsSection() {
  const [activeTab, setActiveTab] = useState(0);

  const [userEvents,   setUserEvents]   = useState([]);
  const [agentEvents,  setAgentEvents]  = useState([]);
  const [userLoading,  setUserLoading]  = useState(true);
  const [agentLoading, setAgentLoading] = useState(true);
  const [userError,    setUserError]    = useState(null);
  const [agentError,   setAgentError]   = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('user_audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (err) setUserError(err.message);
      else setUserEvents(data ?? []);
      setUserLoading(false);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('agent_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (err) setAgentError(err.message);
      else setAgentEvents(data ?? []);
      setAgentLoading(false);
    })();
  }, []);

  const counts = [
    userLoading  ? '…' : String(userEvents.length),
    agentLoading ? '…' : String(agentEvents.length),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 mb-1">Audit Logs</h2>
        <p className="text-sm text-slate-500">
          User-management actions and agent event streams.
        </p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        {/* Tab bar */}
        <div className="px-5 pt-4 border-b border-slate-700 flex items-end gap-1">
          {TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`px-4 py-2 text-sm font-semibold rounded-t-lg transition-colors ${
                activeTab === i
                  ? 'bg-slate-700 text-slate-100 border border-b-0 border-slate-600'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab}
              <span className="ml-2 text-xs opacity-60">{counts[i]}</span>
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <UserAuditList
            events={userEvents}
            loading={userLoading}
            error={userError}
          />
        )}
        {activeTab === 1 && (
          <AgentActionList
            events={agentEvents}
            loading={agentLoading}
            error={agentError}
          />
        )}
      </div>
    </div>
  );
}
