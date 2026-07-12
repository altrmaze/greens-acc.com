import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer, fetchObjects } from '../services/greenContainer';
import { dispatchTask } from '../services/agentOrchestrator';
import { supabase } from '../supabaseClient';

const PREF_FIELDS = [
  { key: 'dietary_restrictions', label: 'Dietary Restrictions' },
  { key: 'preferred_brands', label: 'Preferred Brands (comma separated)' },
  { key: 'recurring_items', label: 'Recurring Items (comma separated)' },
  { key: 'spending_limit', label: 'Monthly Spending Limit (currency amount)' },
];

export default function Household() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({});
  const [container, setContainer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [taskMsg, setTaskMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const c = await fetchContainer(user.id);
        setContainer(c);
        const objs = await fetchObjects(c.id);
        const hhObj = objs.find((o) => o.vault_domain === 'household_profile');
        if (hhObj?.metadata) setPrefs(hhObj.metadata);
      } catch {}
      finally { setLoading(false); }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!container) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('green_container_objects').upsert({
        container_id: container.id,
        object_name: 'household_preferences',
        vault_domain: 'household_profile',
        metadata: prefs,
        integrity_status: 'verified',
      }, { onConflict: 'container_id,object_name' });
      if (error) throw error;
      alert('Household preferences saved!');
    } catch (err) {
      alert(err.message);
    } finally { setSaving(false); }
  };

  const handleShoppingList = async () => {
    if (!container) return;
    setDispatching(true);
    try {
      const task = await dispatchTask({
        agentId: 'grocery_agent',
        taskType: 'prepare_shopping_list',
        containerId: container.id,
        userId: user.id,
        payload: prefs,
      });
      setTaskMsg(`Shopping list task created: ${task.id}`);
    } catch (err) {
      setTaskMsg('Error: ' + err.message);
    } finally { setDispatching(false); }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">🏠 {t('household.title')}</h1>
        <p className="text-slate-400 text-sm mb-6">{t('household.subtitle')}</p>

        {/* Privacy notice */}
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6 text-sm text-emerald-300">
          🔒 {t('household.comingSoon')}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="animate-pulse bg-slate-800 h-10 rounded" />)}</div>
          ) : (
            <div className="space-y-4">
              {PREF_FIELDS.map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-xs text-slate-400 mb-1">{label}</label>
                  <input
                    value={prefs[key] ?? ''}
                    onChange={(e) => setPrefs((p) => ({ ...p, [key]: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >{saving ? t('common.loading') : t('common.save')}</button>
            <button
              onClick={handleShoppingList}
              disabled={dispatching || loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold rounded-lg py-2.5 text-sm border border-slate-700 transition-colors"
            >{dispatching ? t('common.loading') : 'Prepare Shopping List'}</button>
          </div>
          {taskMsg && <p className="text-xs text-emerald-400 mt-3">{taskMsg}</p>}
        </div>
      </div>
    </div>
  );
}
