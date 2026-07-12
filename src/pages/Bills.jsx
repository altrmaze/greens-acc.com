import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer } from '../services/greenContainer';
import { supabase } from '../supabaseClient';

export default function Bills() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [authorizations, setAuthorizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);

  const load = async () => {
    if (!user) return;
    try {
      const c = await fetchContainer(user.id);
      const { data, error: err } = await supabase
        .from('payment_authorizations')
        .select('*')
        .eq('container_id', c.id)
        .order('created_at', { ascending: false });
      if (err) throw err;
      setAuthorizations(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user]);

  const authorizePayment = async () => {
    if (!confirming) return;
    const { error: err } = await supabase
      .from('payment_authorizations')
      .update({ status: 'authorized' })
      .eq('id', confirming.id);
    if (err) { alert(err.message); return; }
    setAuthorizations((prev) =>
      prev.map((a) => a.id === confirming.id ? { ...a, status: 'authorized' } : a)
    );
    setConfirming(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">💳 {t('bills.title')}</h1>
        <p className="text-slate-400 text-sm mb-6">{t('bills.subtitle')}</p>

        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-6 text-sm text-amber-400 flex items-center gap-2">
          <span className="font-bold">{t('common.comingSoon')}</span>
          <span className="text-slate-400">{t('bills.comingSoon')}</span>
        </div>

        {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-xs text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3 text-start">Description</th>
                  <th className="px-4 py-3 text-start">Amount</th>
                  <th className="px-4 py-3 text-start">Due Date</th>
                  <th className="px-4 py-3 text-start">{t('common.status')}</th>
                  <th className="px-4 py-3 text-start">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i}><td colSpan={5} className="px-4 py-2">
                      <div className="animate-pulse bg-slate-800 h-8 rounded" />
                    </td></tr>
                  ))
                ) : authorizations.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">No bills found</td></tr>
                ) : authorizations.map((auth) => (
                  <tr key={auth.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-200">{auth.description ?? auth.payment_type ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-300 font-mono">
                      {auth.amount != null ? `${auth.currency ?? ''} ${auth.amount}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {auth.due_date ? new Date(auth.due_date).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        auth.status === 'authorized' ? 'bg-emerald-500/10 text-emerald-400'
                        : auth.status === 'pending' ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-slate-700 text-slate-400'
                      }`}>{auth.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {auth.status === 'pending' && (
                        <button
                          onClick={() => setConfirming(auth)}
                          className="text-xs font-semibold px-3 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors"
                        >Authorize</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-emerald-400 font-bold mb-2">{t('common.confirm')}</h3>
            <p className="text-slate-300 text-sm mb-6">
              Authorize payment of <strong>{confirming.currency ?? ''} {confirming.amount}</strong> for "{confirming.description}"?
            </p>
            <p className="text-xs text-slate-500 mb-4">Token authorization only — no raw payment data stored.</p>
            <div className="flex gap-3">
              <button onClick={authorizePayment} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg py-2 text-sm transition-colors">{t('common.confirm')}</button>
              <button onClick={() => setConfirming(null)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg py-2 text-sm transition-colors">{t('common.cancel')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
