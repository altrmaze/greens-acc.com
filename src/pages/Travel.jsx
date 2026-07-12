import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer, fetchObjects } from '../services/greenContainer';
import { dispatchTask } from '../services/agentOrchestrator';
import { supabase } from '../supabaseClient';

const PREFS_FIELDS = [
  { key: 'passport_reference', label: 'Passport Reference' },
  { key: 'preferred_airlines', label: 'Preferred Airlines' },
  { key: 'seat_preference', label: 'Seat Preference (e.g. window, aisle)' },
  { key: 'meal_preference', label: 'Meal Preference' },
];

export default function Travel() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [prefs, setPrefs] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [container, setContainer] = useState(null);
  const [taskMsg, setTaskMsg] = useState('');

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const c = await fetchContainer(user.id);
        setContainer(c);
        const objs = await fetchObjects(c.id);
        const travelObj = objs.find((o) => o.vault_domain === 'travel_profile');
        if (travelObj?.metadata) setPrefs(travelObj.metadata);
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
        object_name: 'travel_preferences',
        vault_domain: 'travel_profile',
        metadata: prefs,
        integrity_status: 'verified',
      }, { onConflict: 'container_id,object_name' });
      if (error) throw error;
      alert('Travel preferences saved!');
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePrepare = async () => {
    if (!container) return;
    setDispatching(true);
    try {
      const task = await dispatchTask({
        agentId: 'travel_agent',
        taskType: 'prepare_itinerary',
        containerId: container.id,
        userId: user.id,
        payload: prefs,
      });
      setTaskMsg(`Task created: ${task.id}`);
    } catch (err) {
      setTaskMsg('Error: ' + err.message);
    } finally {
      setDispatching(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-1">✈️ {t('travel.title')}</h1>
        <p className="text-slate-400 text-sm mb-6">{t('travel.subtitle')}</p>

        {/* Coming Soon Badge */}
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2">
          <span className="text-amber-400 font-bold text-xs">{t('common.comingSoon')}</span>
          <span className="text-slate-400 text-sm">{t('travel.comingSoon')}</span>
        </div>

        {/* Preferences */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('travel.preferences')}</h2>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => <div key={i} className="animate-pulse bg-slate-800 h-10 rounded" />)}
            </div>
          ) : (
            <div className="space-y-4">
              {PREFS_FIELDS.map(({ key, label }) => (
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
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
            >{saving ? t('common.loading') : t('common.save')}</button>
            <button
              onClick={handlePrepare}
              disabled={dispatching || loading}
              className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold rounded-lg py-2.5 text-sm border border-slate-700 transition-colors"
            >{dispatching ? t('common.loading') : 'Prepare Itinerary'}</button>
          </div>
          {taskMsg && <p className="text-xs text-emerald-400 mt-3">{taskMsg}</p>}
        </div>
      </div>
    </div>
  );
}
