/**
 * src/lib/auth.js
 *
 * Role constants and pure helper functions for Greens ACC RBAC.
 *
 * These helpers are intentionally side-effect-free so they can be
 * used in both React components and Node.js test files.
 */

// ── Role identifiers ──────────────────────────────────────────────────────

export const ADMIN_ROLE     = 'admin';
export const DEVELOPER_ROLE = 'developer';
export const SUPABASE_RECOVERY_STORAGE_KEY = 'supabase-recovery-hash';
export const SUPABASE_RECOVERY_ACTIVE_STORAGE_KEY = 'supabase-recovery-active';

/**
 * The exhaustive set of roles that are currently permitted to log in.
 * Any role absent from this set is treated as unauthorised.
 */
export const ALLOWED_ROLES = Object.freeze(new Set([ADMIN_ROLE, DEVELOPER_ROLE]));

// ── Access predicates ─────────────────────────────────────────────────────

/** True when `role` grants full admin privileges. */
export function hasAdminAccess(role) {
  return role === ADMIN_ROLE;
}

/**
 * True when `role` grants at least developer-level access.
 * Admins inherit developer access (supertype ⊇ subtype).
 */
export function hasDeveloperAccess(role) {
  return role === DEVELOPER_ROLE || role === ADMIN_ROLE;
}

/** True when `role` is in the active allowed-role set. */
export function isAllowedRole(role) {
  return ALLOWED_ROLES.has(role);
}

// ── Navigation helpers ────────────────────────────────────────────────────

/**
 * Returns the default post-login redirect path for a given `role`.
 * Falls back to '/' for unauthenticated or unknown roles.
 *
 * @param {string|null|undefined} role
 * @returns {string}
 */
export function defaultRedirectForRole(role) {
  switch (role) {
    case ADMIN_ROLE:
    case DEVELOPER_ROLE: return '/dashboard';
    default:             return '/';
  }
}

export function normalizeBasePath(baseUrl = '/') {
  if (typeof baseUrl !== 'string' || baseUrl === '/' || baseUrl === '') {
    return '';
  }

  return baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
}

export function getResetPasswordPath(baseUrl = '/') {
  return `${normalizeBasePath(baseUrl)}/reset-password`;
}

export function buildResetPasswordRedirect(origin, baseUrl = '/') {
  return `${origin}${getResetPasswordPath(baseUrl)}`;
}

export function getHashRouterRouteUrl(baseUrl = '/', route = '/') {
  const normalizedRoute = route.startsWith('/') ? route : `/${route}`;
  return `${normalizeBasePath(baseUrl)}/#${normalizedRoute}`;
}

export function extractRecoveryParamsFromString(value) {
  const rawValue = typeof value === 'string' ? value.trim() : '';
  const withoutPrefix = rawValue.replace(/^[#?]/, '');
  const paramsSource = withoutPrefix.includes('?')
    ? withoutPrefix.slice(withoutPrefix.indexOf('?') + 1)
    : withoutPrefix;
  const params = new URLSearchParams(paramsSource);

  return {
    type: params.get('type'),
    code: params.get('code'),
    tokenHash: params.get('token_hash'),
    accessToken: params.get('access_token'),
    refreshToken: params.get('refresh_token'),
  };
}

export function isRecoveryPayload(value) {
  const {
    type,
    code,
    tokenHash,
    accessToken,
    refreshToken,
  } = extractRecoveryParamsFromString(value);

  return type === 'recovery' || Boolean(code || tokenHash || accessToken || refreshToken);
}
