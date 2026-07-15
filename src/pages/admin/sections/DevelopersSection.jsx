import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';

export default function DevelopersSection() {
  const [devUsers, setDevUsers]   = useState([]);
  const [agentReg, setAgentReg]   = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    (async () => {
      const [profilesRes, agentRes] = await Promise.all([
        supabase.from('profiles').select('id, role, created_at').eq('role', 'developer').order('created_at', { ascending: false }),
        supabase.from('agent_registry').select('*').order('created_at', { ascending: false }).limit(20),
      ]);
      setDevUsers(profilesRes.data ?? []);
      setAgentReg(agentRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const skeleton = (rows) => (
    <div className="p-4 space-y-2">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="animate-pulse bg-slate-700 h-9 rounded" />
      ))}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 mb-1">Developers</h2>
        <p className="text-sm text-slate-500">Developer-role accounts and registered AI agents.</p>
      </div>

      {/* Developer accounts */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Developer Accounts</h3>
          <span className="text-xs text-slate-500">{loading ? '…' : `${devUsers.length} total`}</span>
        </div>
        {loading ? skeleton(3) : devUsers.length === 0 ? (
          <p className="px-5 py-6 text-slate-500 text-sm">No developer accounts found.</p>
        ) : (
          <ul className="divide-y divide-slate-700">
            {devUsers.map((u) => (
              <li key={u.id} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-700/40 transition-colors">
                <span className="w-7 h-7 rounded-full bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xs font-bold flex-shrink-0">
                  D
                </span>
                <span className="font-mono text-xs text-slate-300 truncate">{u.id}</span>
                <span className="ms-auto text-xs text-slate-500">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Agent registry */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Agent Registry</h3>
          <span className="text-xs text-slate-500">{loading ? '…' : `${agentReg.length} agents`}</span>
        </div>
        {loading ? skeleton(4) : agentReg.length === 0 ? (
          <p className="px-5 py-6 text-slate-500 text-sm">No agents registered.</p>
        ) : (
          <ul className="divide-y divide-slate-700">
            {agentReg.map((agent) => (
              <li key={agent.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm hover:bg-slate-700/40 transition-colors">
                <span className="text-slate-300 font-medium">{agent.name ?? agent.agent_id ?? agent.id}</span>
                {agent.type && (
                  <span className="text-xs text-slate-500 bg-slate-700 px-2 py-0.5 rounded-full">{agent.type}</span>
                )}
                <span className={`ms-auto text-xs px-2 py-0.5 rounded-full font-semibold ${
                  agent.status === 'active' ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-slate-600 text-slate-400'
                }`}>{agent.status ?? 'unknown'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
