import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer, fetchAutomationRules } from '../services/greenContainer';
import { supabase } from '../supabaseClient';

export default function Automations() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [rules, setRules] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    if (!user) return;
    try {
      const c = await fetchContainer(user.id);
      const r = await fetchAutomationRules(c.id);
      setRules(r);

      const { data: pending } = await supabase
        .from('automation_approvals')
        .select('*')
        .eq('container_id', c.id)
        .eq('status', 'pending');
      setApprovals(pending ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const toggleRule = async (rule) => {
    const { error: err } = await supabase
      .from('automation_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id);
    if (err) { alert(err.message); return; }
    setRules((prev) => prev.map((r) => r.id === rule.id ? { ...r, is_active: !r.is_active } : r));
  };

  const handleApproval = async (approval, newStatus) => {
    const { error: err } = await supabase
      .from('automation_approvals')
      .update({ status: newStatus })
      .eq('id', approval.id);
    if (err) { alert(err.message); return; }
    setApprovals((prev) => prev.filter((a) => a.id !== approval.id));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">⚙️ {t('automations.title')}</h1>
        <p className="text-slate-400 text-sm mb-6">{t('automations.subtitle')}</p>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        {/* Automation Rules */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-semibold text-slate-300">Rules</h2>
          </div>
          {loading ? (
            <div className="p-4 space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className="animate-pulse bg-slate-800 h-10 rounded" />)}
            </div>
          ) : rules.length === 0 ? (
            <p className="px-5 py-8 text-center text-slate-500">{t('automations.noRules')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-slate-800">
                  <th className="px-5 py-3 text-start">{t('common.name')}</th>
                  <th className="px-5 py-3 text-start">Trigger</th>
                  <th className="px-5 py-3 text-start">Level</th>
                  <th className="px-5 py-3 text-start">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-5 py-3 text-slate-200 font-medium">{rule.rule_name ?? rule.name}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{rule.trigger_type ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-400 text-xs">{rule.automation_level ?? '—'}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleRule(rule)}
                        className={`relative w-10 h-5 rounded-full transition-colors ${
                          rule.is_active ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${
                          rule.is_active ? 'start-5' : 'start-0.5'
                        }`} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">{t('automations.pending')}</h2>
            {approvals.length > 0 && (
              <span className="bg-amber-500/15 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full">
                {approvals.length}
              </span>
            )}
          </div>
          {approvals.length === 0 ? (
            <p className="px-5 py-8 text-center text-slate-500">No pending approvals</p>
          ) : (
            <ul className="divide-y divide-slate-800">
              {approvals.map((a) => (
                <li key={a.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200">{a.description ?? a.approval_type ?? a.id}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{new Date(a.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproval(a, 'approved')}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                    >{t('automations.approve')}</button>
                    <button
                      onClick={() => handleApproval(a, 'rejected')}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                    >{t('automations.reject')}</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
