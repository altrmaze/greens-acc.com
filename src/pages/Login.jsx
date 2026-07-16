import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import {
  defaultRedirectForRole,
  isAllowedRole,
} from '../lib/auth';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      navigate(
        isAllowedRole(role) ? defaultRedirectForRole(role) : '/unauthorized',
        { replace: true }
      );
    }
  }, [authLoading, user, role, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAuthError('');
    if (!supabase) {
      setAuthError('Sign-in is temporarily unavailable. Please try again later.');
      setLoading(false);
      return;
    }
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      // Surface a user-friendly message; never expose server internals.
      setAuthError(
        err.status === 400 || err.message?.toLowerCase().includes('invalid')
          ? 'Invalid email or password. Please try again.'
          : err.message
      );
      setLoading(false);
      return;
    }
    // Fetch role from the server-side profiles table to decide where to redirect.
    // The role in `data.user` JWT claims is not trusted here.
    const userId = data.session?.user?.id;
    let role = null;
    if (userId) {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (profileError) {
        await supabase.auth.signOut();
        // PGRST116 = no rows returned: the profile row is missing for this user.
        // All other codes indicate a network or permission issue.
        setAuthError(
          profileError.code === 'PGRST116'
            ? 'Your account profile has not been set up yet. Please contact an administrator.'
            : 'Unable to verify your account access. Please contact the administrator.'
        );
        setLoading(false);
        return;
      }
      role = profile?.role ?? null;
    }

    if (!isAllowedRole(role)) {
      await supabase.auth.signOut();
      setAuthError('Your account is authenticated but does not have privileged access.');
      setLoading(false);
      navigate('/unauthorized', { replace: true });
      return;
    }

    navigate(defaultRedirectForRole(role), { replace: true });
  };

  const handleMagicLink = async () => {
    if (!email) { setAuthError(t('common.required') + ': ' + t('common.email')); return; }
    if (!supabase) {
      setAuthError('Sign-in is temporarily unavailable. Please try again later.');
      return;
    }
    setLoading(true);
    setAuthError('');
    const { error: err } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (err) setAuthError(err.message);
    else setMagicSent(true);
  };

  const handleForgotPasswordToggle = () => {
    setForgotPasswordOpen((open) => !open);
    setResetEmail((currentValue) => currentValue || email);
    setResetError('');
    setResetSuccess('');
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      setResetError(t('common.required') + ': ' + t('common.email'));
      return;
    }
    if (!supabase) {
      setResetError('Password reset is temporarily unavailable. Please try again later.');
      return;
    }

    setLoading(true);
    setResetError('');
    setResetSuccess('');

    const { error: err } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: window.location.origin + '/#/reset-password',
    });

    setLoading(false);

    if (err) {
      setResetError('Unable to send the password reset email. Please try again.');
      return;
    }

    setResetSuccess(t('auth.resetEmailSent'));
  };

  if (authLoading || user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
        <span className="text-emerald-400 animate-pulse text-sm font-mono">
          Redirecting…
        </span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-2 text-emerald-400 font-extrabold text-xl tracking-wide">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse inline-block" />
            GREENS ACC
          </span>
          <p className="text-slate-400 text-sm mt-2">{t('auth.loginTitle')}</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
          {magicSent ? (
            <div className="text-center py-4">
              <div className="text-4xl mb-4">📬</div>
              <p className="text-emerald-400 font-semibold">{t('auth.magicLinkSent')}</p>
            </div>
          ) : (
            <form onSubmit={handleSignIn} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {t('auth.emailLabel')}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  {t('auth.passwordLabel')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                  {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold rounded-lg py-2.5 text-sm transition-colors"
              >
                {loading ? t('common.loading') : t('auth.signIn')}
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-slate-900 px-2 text-slate-500">or</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleMagicLink}
                disabled={loading}
                className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold rounded-lg py-2.5 text-sm border border-slate-700 transition-colors"
              >
                {t('auth.magicLink')}
              </button>

            </form>
          )}

          {!magicSent && (
            <div className="space-y-3 mt-5">
              <button
                type="button"
                onClick={handleForgotPasswordToggle}
                className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                {t('auth.forgotPassword')}
              </button>

              {forgotPasswordOpen && (
                <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-4 space-y-3">
                  <form onSubmit={handleForgotPassword} className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                        {t('auth.emailLabel')}
                      </label>
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        required
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 transition-colors"
                        placeholder="you@example.com"
                      />
                    </div>

                    {resetError && (
                      <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        {resetError}
                      </p>
                    )}

                    {resetSuccess && (
                      <p className="text-emerald-400 text-xs bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
                        {resetSuccess}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 font-semibold rounded-lg py-2.5 text-sm border border-slate-700 transition-colors"
                    >
                      {loading ? t('common.loading') : t('auth.sendResetEmail')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
