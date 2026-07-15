import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';

function StatCard({ label, value, icon }) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 flex items-center gap-4">
      <span className="text-2xl">{icon}</span>
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-2xl font-extrabold text-emerald-400">{value ?? '—'}</p>
      </div>
    </div>
  );
}

export default function DashboardSection() {
  const [stats, setStats]           = useState({ containers: 0, tasks: 0, auditEvents: 0, connectors: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    (async () => {
      const [contRes, taskRes, auditRes, connRes] = await Promise.all([
        supabase.from('green_containers').select('id', { count: 'exact', head: true }),
        supabase.from('agent_tasks').select('*').order('created_at', { ascending: false }).limit(8),
        supabase.from('user_audit_logs').select('id', { count: 'exact', head: true }),
        supabase.from('external_connectors').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        containers: contRes.count ?? 0,
        tasks:      taskRes.data?.length ?? 0,
        auditEvents: auditRes.count ?? 0,
        connectors: connRes.count ?? 0,
      });
      setRecentTasks(taskRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  const skeleton = <div className="animate-pulse bg-slate-700 rounded h-6 w-8 inline-block" />;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 mb-1">Overview</h2>
        <p className="text-sm text-slate-500">Live system metrics pulled from Supabase.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Green Containers" value={loading ? skeleton : stats.containers} icon="🟢" />
        <StatCard label="Recent Tasks"     value={loading ? skeleton : stats.tasks}      icon="⚙️" />
        <StatCard label="Audit Events"     value={loading ? skeleton : stats.auditEvents} icon="📋" />
        <StatCard label="Connectors"       value={loading ? skeleton : stats.connectors} icon="🔗" />
      </div>

      {/* Recent agent tasks */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700">
          <h3 className="text-sm font-semibold text-slate-300">Recent Agent Tasks</h3>
        </div>
        {loading ? (
          <div className="p-4 space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-700 h-8 rounded" />
            ))}
          </div>
        ) : recentTasks.length === 0 ? (
          <p className="px-5 py-6 text-slate-500 text-sm">No tasks recorded yet.</p>
        ) : (
          <ul className="divide-y divide-slate-700">
            {recentTasks.map((task) => (
              <li key={task.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm hover:bg-slate-700/40 transition-colors">
                <span className="text-slate-300 font-medium truncate max-w-[160px]">{task.agent_id}</span>
                <span className="text-slate-500 text-xs">{task.task_type}</span>
                <span className={`ms-auto text-xs px-2 py-0.5 rounded-full font-semibold ${
                  task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400'
                  : task.status === 'failed'  ? 'bg-red-500/10 text-red-400'
                  : 'bg-amber-500/10 text-amber-400'
                }`}>{task.status}</span>
                <span className="text-xs text-slate-600 hidden sm:block">
                  {new Date(task.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
