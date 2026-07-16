import './i18n/index.js';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import App from './App';
import {
  getHashRouterRouteUrl,
  isRecoveryPayload,
  SUPABASE_RECOVERY_STORAGE_KEY,
} from './lib/auth';

function normalizeRecoveryRedirect() {
  if (typeof window === 'undefined') return;

  const searchPayload = window.location.search.replace(/^\?/, '');
  const hashPayload = window.location.hash.replace(/^#/, '');

  // eslint-disable-next-line no-console
  console.log('[normalizeRecoveryRedirect] URL:', window.location.href);
  // eslint-disable-next-line no-console
  console.log('[normalizeRecoveryRedirect] search params:', window.location.search);
  // eslint-disable-next-line no-console
  console.log('[normalizeRecoveryRedirect] hash params:', window.location.hash);

  const recoveryPayload = isRecoveryPayload(searchPayload)
    ? searchPayload
    : isRecoveryPayload(hashPayload)
      ? hashPayload
      : '';

  if (!recoveryPayload) return;

  try {
    window.sessionStorage.setItem(SUPABASE_RECOVERY_STORAGE_KEY, recoveryPayload);
  } catch {
    // Ignore storage failures and continue with the clean hash route.
  }

  window.location.replace(getHashRouterRouteUrl(import.meta.env.BASE_URL, '/reset-password'));
}

normalizeRecoveryRedirect();

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </React.StrictMode>
);
