import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import {
  SUPABASE_RECOVERY_ACTIVE_STORAGE_KEY,
  extractRecoveryParamsFromString,
  isRecoveryPayload,
  SUPABASE_RECOVERY_STORAGE_KEY,
} from '../lib/auth';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    const initializeRecovery = async () => {
      if (!supabase) {
        if (active) {
          setError('Authentication service is not configured. Please contact the administrator.');
          setCheckingRecovery(false);
        }
        return;
      }

      const sessionPayload = (() => {
        if (typeof window === 'undefined') return '';

        try {
          const storedPayload = window.sessionStorage.getItem(SUPABASE_RECOVERY_STORAGE_KEY) || '';
          if (isRecoveryPayload(storedPayload)) return storedPayload;
        } catch {
          // Ignore storage failures and fall back to the current URL.
        }

        const routeSearchPayload = location.search.replace(/^\?/, '');
        return isRecoveryPayload(routeSearchPayload) ? routeSearchPayload : '';
      })();
      const recoverySessionActive = (() => {
        if (typeof window === 'undefined') return false;

        try {
          return window.sessionStorage.getItem(SUPABASE_RECOVERY_ACTIVE_STORAGE_KEY) === 'true';
        } catch {
          return false;
        }
      })();

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          const {
            type,
            code,
            tokenHash,
            accessToken,
            refreshToken,
          } = extractRecoveryParamsFromString(sessionPayload);

          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
          } else if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) throw sessionError;
          } else if (tokenHash && type === 'recovery') {
            const { error: verifyError } = await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: 'recovery',
            });
            if (verifyError) throw verifyError;
          } else {
            throw new Error('Missing recovery session');
          }
        } else if (!sessionPayload && !recoverySessionActive) {
          throw new Error('Missing recovery session');
        }

        if (!active) return;

        try {
          window.sessionStorage.setItem(SUPABASE_RECOVERY_ACTIVE_STORAGE_KEY, 'true');
          window.sessionStorage.removeItem(SUPABASE_RECOVERY_STORAGE_KEY);
        } catch {
          // Ignore storage failures after recovery initialization.
        }

        setRecoveryReady(true);
        setCheckingRecovery(false);

        if (location.search) {
          navigate('/reset-password', { replace: true });
        }
      } catch {
        if (!active) return;
        setError(t('auth.resetPasswordInvalid'));
        setCheckingRecovery(false);
      }
    };

    initializeRecovery();

    return () => {
      active = false;
    };
  }, [location.search, navigate, t]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!supabase) {
      setError('Authentication service is not configured. Please contact the administrator.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    try {
      window.sessionStorage.removeItem(SUPABASE_RECOVERY_ACTIVE_STORAGE_KEY);
    } catch {
      // Ignore storage cleanup failures after a successful reset.
    }

    await supabase.auth.signOut();
    setSuccess(t('auth.passwordUpdatedSuccess'));
    setLoading(false);

    window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 text-emerald-400 font-extrabold text-xl tracking-wide">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse inline-block" />
            GREENS ACC
          </span>
          <p className="text-slate-400 text-sm mt-2">{t('auth.resetPasswordTitle')}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {checkingRecovery ? (
            <p className="text-slate-300 text-sm text-center">{t('common.loading')}</p>
          ) : success ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-emerald-400 font-semibold">{success}</p>
            </div>
          ) : recoveryReady ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {t('auth.newPasswordLabel')}
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {t('auth.confirmPasswordLabel')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                {loading ? t('common.loading') : t('auth.updatePassword')}
              </button>
            </form>
          ) : (
            <p className="text-red-400 text-sm text-center">{error || t('auth.resetPasswordInvalid')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
