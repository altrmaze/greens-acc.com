const ADMIN_ACCESS_STORAGE_KEY = 'greens-acc.admin-access';
export const ADMIN_ACCESS_EVENT = 'greens-acc.admin-access-changed';

function notifyAdminAccessChanged() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(ADMIN_ACCESS_EVENT));
}

function getConfiguredAdminPass() {
  const value = import.meta?.env?.VITE_APP_PASS;
  return typeof value === 'string' ? value.trim() : '';
}

function getAdminAccessFingerprint(passphrase) {
  let fingerprint = 0;

  for (let index = 0; index < passphrase.length; index += 1) {
    fingerprint = ((fingerprint << 5) - fingerprint) + passphrase.charCodeAt(index);
    fingerprint |= 0;
  }

  return `fp:${fingerprint}`;
}

export function isAdminAccessConfigured() {
  return getConfiguredAdminPass().length > 0;
}

export function hasUnlockedAdminAccess() {
  const configuredPass = getConfiguredAdminPass();
  if (typeof window === 'undefined') {
    return false;
  }

  if (!configuredPass) {
    return false;
  }

  return (
    window.sessionStorage.getItem(ADMIN_ACCESS_STORAGE_KEY) ===
    getAdminAccessFingerprint(configuredPass)
  );
}

export function tryUnlockAdminAccess(candidate) {
  const configuredPass = getConfiguredAdminPass();
  if (!configuredPass) {
    return false;
  }

  const isMatch = candidate === configuredPass;
  if (isMatch && typeof window !== 'undefined') {
    window.sessionStorage.setItem(
      ADMIN_ACCESS_STORAGE_KEY,
      getAdminAccessFingerprint(configuredPass),
    );
    notifyAdminAccessChanged();
  }

  return isMatch;
}

export function clearUnlockedAdminAccess() {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(ADMIN_ACCESS_STORAGE_KEY);
  notifyAdminAccessChanged();
}
