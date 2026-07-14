import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import AppNav from '../../components/AppNav';
import { DashboardGuard } from '../../components/DashboardGuard';
import { supabase } from '../../supabaseClient';

const ROLE_LABELS = {
  admin: 'Super Admin',
  engineer: 'Software Engineer',
  accounting: 'Accounting',
  'account-manager': 'Account Manager',
  'financial-manager': 'Financial Manager',
  analyzer: 'Analyzer',
};

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-2xl font-extrabold text-emerald-400">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const location = useLocation();
  const subPath = location.pathname.split('/').pop();
  const roleLabel = ROLE_LABELS[subPath] ?? 'Admin';

  const [stats, setStats] = useState({ containers: 0, tasks: 0, glitches: 0, connectors: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [auditEvents, setAuditEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [contRes, taskRes, glitchRes, connRes, auditRes] = await Promise.all([
        supabase.from('green_containers').select('id', { count: 'exact', head: true }),
        supabase.from('agent_tasks').select('*').order('created_at', { ascending: false }).limit(10),
        supabase.from('glitches').select('id', { count: 'exact', head: true }).eq('status', 'open'),
        supabase.from('external_connectors').select('id', { count: 'exact', head: true }),
        supabase.from('agent_actions').select('*').order('created_at', { ascending: false }).limit(10),
      ]);

      setStats({
        containers: contRes.count ?? 0,
        tasks: taskRes.data?.length ?? 0,
        glitches: glitchRes.count ?? 0,
        connectors: connRes.count ?? 0,
      });
      setRecentTasks(taskRes.data ?? []);
      setAuditEvents(auditRes.data ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <DashboardGuard requiredRole="admin">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="mb-8">
            <span className="text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full">
              {roleLabel}
            </span>
            <h1 className="text-2xl font-extrabold text-emerald-400 mt-3">Admin Dashboard</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <StatCard label="Green Containers" value={loading ? '…' : stats.containers} />
            <StatCard label="Recent Tasks" value={loading ? '…' : stats.tasks} />
            <StatCard label="Open Glitches" value={loading ? '…' : stats.glitches} />
            <StatCard label="Connectors" value={loading ? '…' : stats.connectors} />
          </div>

          {/* Quick Links */}
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <Link to="/security" className="bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-xl p-5 flex items-center gap-3 transition-all">
              <span className="text-2xl">🛡️</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">Green Bubbles Security</p>
                <p className="text-xs text-slate-500 mt-0.5">Autonomous defense status</p>
              </div>
              <span className="ms-auto text-slate-600">→</span>
            </Link>
            <Link to="/aegis" className="bg-slate-900 border border-slate-800 hover:border-emerald-500/30 rounded-xl p-5 flex items-center gap-3 transition-all">
              <span className="text-2xl">🔧</span>
              <div>
                <p className="text-sm font-semibold text-slate-200">Aegis Self-Healing</p>
                <p className="text-xs text-slate-500 mt-0.5">System repair diagnostics</p>
              </div>
              <span className="ms-auto text-slate-600">→</span>
            </Link>
          </div>

          {/* Recent Agent Tasks */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-300">Recent Agent Tasks</h2>
            </div>
            {loading ? (
              <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="animate-pulse bg-slate-800 h-8 rounded" />)}</div>
            ) : recentTasks.length === 0 ? (
              <p className="px-5 py-6 text-slate-500 text-sm">No tasks yet</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {recentTasks.map((task) => (
                  <li key={task.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm hover:bg-slate-800/30">
                    <span className="text-slate-300 font-medium">{task.agent_id}</span>
                    <span className="text-slate-500 text-xs">{task.task_type}</span>
                    <span className={`ms-auto text-xs px-2 py-0.5 rounded-full font-semibold ${
                      task.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400'
                      : task.status === 'failed' ? 'bg-red-500/10 text-red-400'
                      : 'bg-amber-500/10 text-amber-400'
                    }`}>{task.status}</span>
                    <span className="text-xs text-slate-600">{new Date(task.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Audit Events */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-slate-300">Audit Events (agent_actions)</h2>
            </div>
            {loading ? (
              <div className="p-4"><div className="animate-pulse bg-slate-800 h-16 rounded" /></div>
            ) : auditEvents.length === 0 ? (
              <p className="px-5 py-6 text-slate-500 text-sm">No audit events yet</p>
            ) : (
              <ul className="divide-y divide-slate-800">
                {auditEvents.map((ev) => (
                  <li key={ev.id} className="px-5 py-3 flex flex-wrap items-center gap-3 text-sm hover:bg-slate-800/30">
                    <span className="text-slate-300">{ev.action_type ?? ev.event_type ?? ev.id}</span>
                    <span className="ms-auto text-xs text-slate-600">{new Date(ev.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DashboardGuard>
    </div>
  );
}
