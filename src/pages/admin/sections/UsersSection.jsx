import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';

const ROLE_BADGE = {
  admin:     'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  developer: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
};

function RoleBadge({ role }) {
  const cls = ROLE_BADGE[role] ?? 'bg-slate-700 text-slate-400 border-slate-600';
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {role ?? 'unknown'}
    </span>
  );
}

export default function UsersSection() {
  const [users, setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    (async () => {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, role, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (err) {
        setError(err.message);
      } else {
        setUsers(data ?? []);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-slate-100 mb-1">Users</h2>
        <p className="text-sm text-slate-500">All registered user profiles and their assigned roles.</p>
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-300">Profile Registry</h3>
          <span className="text-xs text-slate-500">
            {loading ? '…' : `${users.length} total`}
          </span>
        </div>

        {error ? (
          <div className="px-5 py-6 text-red-400 text-sm bg-red-500/5 border-t border-red-500/20">
            Failed to load users: {error}
          </div>
        ) : loading ? (
          <div className="p-4 space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-slate-700 h-10 rounded" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="px-5 py-6 text-slate-500 text-sm">No user profiles found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">User ID</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Created</th>
                  <th className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-700/40 transition-colors">
                    <td className="px-5 py-3 text-slate-300 font-mono text-xs truncate max-w-[180px]">{u.id}</td>
                    <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-5 py-3 text-slate-500 text-xs hidden md:table-cell">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3 text-slate-500 text-xs hidden lg:table-cell">
                      {u.updated_at ? new Date(u.updated_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
