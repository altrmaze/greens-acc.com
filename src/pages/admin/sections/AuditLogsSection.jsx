import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../../../supabaseClient';
import {
  actionLabel,
  actionBadgeClass,
  agentStatusBadgeClass,
  matchesAuditFilter,
  matchesAgentFilter,
  USER_ACTION_TYPES,
  formatTimestamp,
} from '../../../lib/admin';

const TABS = ['User Management', 'Agent Actions'];

const AGENT_STATUSES = ['active', 'completed', 'success', 'running', 'pending', 'failed', 'error', 'warning'];

function Skeleton({ rows = 6 }) {
  return (
    <div className="p-4 space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="animate-pulse bg-slate-700 h-9 rounded" />
      ))}
    </div>
  );
}

function FilterBar({ filters, onChange, actionOptions, statusOptions }) {
  return (
    <div className="px-5 py-3 border-b border-slate-700 flex flex-wrap items-center gap-3">
      {/* Text search */}
      <div className="relative flex-1 min-w-[180px]">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          placeholder="Search…"
          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg pl-8 pr-3 py-1.5 focus:outline-none focus:border-emerald-500/50 placeholder-slate-600"
        />
        <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Action / Status filter */}
      {actionOptions && (
        <select
          value={filters.action ?? ''}
          onChange={(e) => onChange({ ...filters, action: e.target.value })}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50"
        >
          <option value="">All actions</option>
          {actionOptions.map((a) => (
            <option key={a} value={a}>{actionLabel(a)}</option>
          ))}
        </select>
      )}

      {statusOptions && (
        <select
          value={filters.status ?? ''}
          onChange={(e) => onChange({ ...filters, status: e.target.value })}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500/50"
        >
          <option value="">All statuses</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      )}

      {/* Date from */}
      <input
        type="date"
        value={filters.dateFrom}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
        title="From date"
        className="bg-slate-900 border border-slate-700 text-slate-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
      />

      {/* Date to */}
      <input
        type="date"
        value={filters.dateTo}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
        title="To date"
        className="bg-slate-900 border border-slate-700 text-slate-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-emerald-500/50 [color-scheme:dark]"
      />

      {/* Clear */}
      {(filters.search || filters.action || filters.status || filters.dateFrom || filters.dateTo) && (
        <button
          onClick={() => onChange({ search: '', action: '', status: '', dateFrom: '', dateTo: '' })}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0"
        >
          Clear filters
        </button>
      )}
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
    return <p className="px-5 py-6 text-slate-500 text-sm">No matching user management events.</p>;
  }
  return (
    <ul className="divide-y divide-slate-700 max-h-[60vh] overflow-y-auto">
      {events.map((ev) => {
        const colorCls = actionBadgeClass(ev.action);
        const details  = ev.new_values || ev.old_values;
        return (
          <li key={ev.id} className="px-5 py-3 flex flex-wrap items-start gap-3 hover:bg-slate-700/40 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${colorCls}`}>
                  {actionLabel(ev.action)}
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
              {formatTimestamp(ev.created_at)}
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
    return <p className="px-5 py-6 text-slate-500 text-sm">No matching agent events.</p>;
  }
  return (
    <ul className="divide-y divide-slate-700 max-h-[60vh] overflow-y-auto">
      {events.map((ev) => {
        const typeKey  = ev.action_type ?? ev.event_type ?? '';
        const colorCls = agentStatusBadgeClass(ev.status);
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
              {formatTimestamp(ev.created_at)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

const DEFAULT_FILTERS = { search: '', action: '', status: '', dateFrom: '', dateTo: '' };

export default function AuditLogsSection() {
  const [activeTab, setActiveTab] = useState(0);

  const [userEvents,   setUserEvents]   = useState([]);
  const [agentEvents,  setAgentEvents]  = useState([]);
  const [userLoading,  setUserLoading]  = useState(true);
  const [agentLoading, setAgentLoading] = useState(true);
  const [userError,    setUserError]    = useState(null);
  const [agentError,   setAgentError]   = useState(null);

  const [userFilters,  setUserFilters]  = useState(DEFAULT_FILTERS);
  const [agentFilters, setAgentFilters] = useState(DEFAULT_FILTERS);

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

  const filteredUserEvents = useMemo(
    () => userEvents.filter((ev) => matchesAuditFilter(ev, userFilters)),
    [userEvents, userFilters],
  );

  const filteredAgentEvents = useMemo(
    () => agentEvents.filter((ev) => matchesAgentFilter(ev, agentFilters)),
    [agentEvents, agentFilters],
  );

  const counts = [
    userLoading  ? '…' : `${filteredUserEvents.length}/${userEvents.length}`,
    agentLoading ? '…' : `${filteredAgentEvents.length}/${agentEvents.length}`,
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 mb-1">Audit Logs</h2>
        <p className="text-sm text-slate-500">
          User-management actions and agent event streams with real-time filters.
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

        {/* Filter bar */}
        {activeTab === 0 && (
          <FilterBar
            filters={userFilters}
            onChange={setUserFilters}
            actionOptions={[...USER_ACTION_TYPES]}
            statusOptions={null}
          />
        )}
        {activeTab === 1 && (
          <FilterBar
            filters={agentFilters}
            onChange={setAgentFilters}
            actionOptions={null}
            statusOptions={AGENT_STATUSES}
          />
        )}

        {activeTab === 0 && (
          <UserAuditList
            events={filteredUserEvents}
            loading={userLoading}
            error={userError}
          />
        )}
        {activeTab === 1 && (
          <AgentActionList
            events={filteredAgentEvents}
            loading={agentLoading}
            error={agentError}
          />
        )}
      </div>
    </div>
  );
}
