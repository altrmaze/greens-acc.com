import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer, fetchPermissions } from '../services/greenContainer';
import { supabase } from '../supabaseClient';
import { AGENT_REGISTRY } from '../agents/agentRegistry';

export default function Permissions() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [containerId, setContainerId] = useState(null);

  const load = async () => {
    if (!user) return;
    try {
      const c = await fetchContainer(user.id);
      setContainerId(c.id);
      const perms = await fetchPermissions(c.id);
      setPermissions(perms);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const toggle = async (perm) => {
    const newStatus = perm.status === 'granted' ? 'revoked' : 'granted';
    const { error: err } = await supabase
      .from('green_container_permissions')
      .update({ status: newStatus })
      .eq('id', perm.id);
    if (err) { alert(err.message); return; }
    setPermissions((prev) => prev.map((p) => p.id === perm.id ? { ...p, status: newStatus } : p));
  };

  const agentName = (id) => AGENT_REGISTRY.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">🔑 {t('permissions.title')}</h1>
        <p className="text-slate-400 text-sm mb-6">{t('permissions.subtitle')}</p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-start">{t('permissions.agent')}</th>
                  <th className="px-4 py-3 text-start">{t('permissions.purpose')}</th>
                  <th className="px-4 py-3 text-start">{t('common.status')}</th>
                  <th className="px-4 py-3 text-start">{t('documents.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={4} className="px-4 py-2">
                        <div className="animate-pulse bg-slate-800 h-8 rounded" />
                      </td>
                    </tr>
                  ))
                ) : permissions.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-500">No permissions found</td></tr>
                ) : permissions.map((perm) => (
                  <tr key={perm.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-200 font-medium">{agentName(perm.agent_id)}</td>
                    <td className="px-4 py-3 text-slate-400 text-xs">{perm.purpose ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        perm.status === 'granted'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : 'bg-red-500/10 text-red-400'
                      }`}>{perm.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggle(perm)}
                        className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors ${
                          perm.status === 'granted'
                            ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {perm.status === 'granted' ? t('permissions.revokeAccess') : t('permissions.grantAccess')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
