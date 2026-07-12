import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n/index.js';
import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { fetchContainer } from '../services/greenContainer';
import { supabase } from '../supabaseClient';

export default function Settings() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const [container, setContainer] = useState(null);
  const [notifications, setNotifications] = useState(() => {
    try { return JSON.parse(localStorage.getItem('greens_notif') || '{"email":true,"push":false}'); } catch { return { email: true, push: false }; }
  });
  const [locking, setLocking] = useState(false);
  const currentLang = i18n.language;

  useEffect(() => {
    if (!user) return;
    fetchContainer(user.id).then(setContainer).catch(() => {});
  }, [user]);

  const toggleNotif = (key) => {
    const next = { ...notifications, [key]: !notifications[key] };
    setNotifications(next);
    localStorage.setItem('greens_notif', JSON.stringify(next));
  };

  const toggleLock = async () => {
    if (!container) return;
    setLocking(true);
    const newStatus = container.lock_status === 'locked' ? 'unlocked' : 'locked';
    const { error } = await supabase
      .from('green_containers')
      .update({ lock_status: newStatus })
      .eq('id', container.id);
    setLocking(false);
    if (error) { alert(error.message); return; }
    setContainer((c) => ({ ...c, lock_status: newStatus }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-extrabold text-emerald-400 mb-6">⚙️ {t('settings.title')}</h1>

        {/* Language */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('settings.language')}</h2>
          <div className="flex gap-3">
            {['en', 'ar'].map((lang) => (
              <button
                key={lang}
                onClick={() => i18n.changeLanguage(lang)}
                className={`px-6 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  currentLang === lang
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >{lang === 'en' ? 'English' : 'العربية'}</button>
            ))}
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
          <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('settings.notifications')}</h2>
          <div className="space-y-3">
            {Object.entries(notifications).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-slate-400 capitalize">{key} notifications</span>
                <button
                  onClick={() => toggleNotif(key)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${val ? 'bg-emerald-500' : 'bg-slate-700'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${val ? 'start-5' : 'start-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Container Lock */}
        {container && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-4">
            <h2 className="text-sm font-semibold text-slate-300 mb-4">{t('settings.security')}</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-300">
                  {container.lock_status === 'locked' ? t('settings.unlockContainer') : t('settings.lockContainer')}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Current: <span className={container.lock_status === 'locked' ? 'text-red-400' : 'text-emerald-400'}>{container.lock_status}</span>
                </p>
              </div>
              <button
                onClick={toggleLock}
                disabled={locking}
                className={`px-4 py-2 text-sm font-semibold rounded-lg disabled:opacity-50 transition-colors ${
                  container.lock_status === 'locked'
                    ? 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                }`}
              >{locking ? t('common.loading') : container.lock_status === 'locked' ? '🔓 Unlock' : '🔒 Lock'}</button>
            </div>
          </div>
        )}

        {/* Sign Out */}
        <button
          onClick={signOut}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 font-semibold rounded-xl py-3 text-sm transition-colors"
        >{t('auth.signOut')}</button>
      </div>
    </div>
  );
}
