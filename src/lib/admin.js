/**
 * src/lib/admin.js
 *
 * Pure utility functions for the Greens ACC Admin Control Room (Phase 6).
 *
 * Side-effect-free; usable in both React components and Node.js test files.
 */

// ── Timestamp helpers ─────────────────────────────────────────────────────

/**
 * Formats an ISO timestamp string into a human-readable local datetime.
 * Returns '—' for null / undefined / invalid values.
 *
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatTimestamp(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

/**
 * Formats an ISO timestamp string into a short local date (no time).
 * Returns '—' for null / undefined / invalid values.
 *
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

/**
 * Returns the ISO date string (YYYY-MM-DD) for the start of a given day.
 * Accepts either a Date object or an ISO string.
 *
 * @param {Date|string} date
 * @returns {string}
 */
export function toISODate(date) {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (!(d instanceof Date) || isNaN(d.getTime())) {
    throw new RangeError('toISODate: invalid date value');
  }
  return d.toISOString().slice(0, 10);
}

// ── Audit log action helpers ───────────────────────────────────────────────

/**
 * All recognised user-management action types.
 * Kept as a frozen array for use in filter dropdowns.
 */
export const USER_ACTION_TYPES = Object.freeze([
  'invite_user',
  'update_role',
  'deactivate_user',
  'reactivate_user',
  'reset_password',
  'delete_user',
]);

/**
 * Returns a human-readable label for a user-management action.
 *
 * @param {string|null|undefined} action
 * @returns {string}
 */
export function actionLabel(action) {
  switch (action) {
    case 'invite_user':     return 'Invite User';
    case 'update_role':     return 'Update Role';
    case 'deactivate_user': return 'Deactivate User';
    case 'reactivate_user': return 'Reactivate User';
    case 'reset_password':  return 'Reset Password';
    case 'delete_user':     return 'Delete User';
    default:                return action != null ? String(action) : 'Unknown';
  }
}

/**
 * Returns the Tailwind CSS class tokens for a user-audit action badge.
 *
 * @param {string|null|undefined} action
 * @returns {string}
 */
export function actionBadgeClass(action) {
  switch (action) {
    case 'invite_user':     return 'bg-emerald-500/10 text-emerald-400';
    case 'update_role':     return 'bg-blue-500/10 text-blue-400';
    case 'deactivate_user': return 'bg-amber-500/10 text-amber-400';
    case 'reactivate_user': return 'bg-emerald-500/10 text-emerald-400';
    case 'reset_password':  return 'bg-violet-500/10 text-violet-400';
    case 'delete_user':     return 'bg-red-500/10 text-red-400';
    default:                return 'bg-slate-700 text-slate-400';
  }
}

// ── Agent status helpers ───────────────────────────────────────────────────

/**
 * Returns the Tailwind CSS class tokens for an agent/task status badge.
 *
 * @param {string|null|undefined} status
 * @returns {string}
 */
export function agentStatusBadgeClass(status) {
  switch (status) {
    case 'active':    return 'bg-emerald-500/10 text-emerald-400';
    case 'completed': return 'bg-emerald-500/10 text-emerald-400';
    case 'success':   return 'bg-emerald-500/10 text-emerald-400';
    case 'idle':      return 'bg-slate-500/10 text-slate-400';
    case 'pending':   return 'bg-amber-500/10 text-amber-400';
    case 'running':   return 'bg-blue-500/10 text-blue-400';
    case 'failed':    return 'bg-red-500/10 text-red-400';
    case 'error':     return 'bg-red-500/10 text-red-400';
    case 'warning':   return 'bg-amber-500/10 text-amber-400';
    default:          return 'bg-slate-700 text-slate-400';
  }
}

// ── Filter helpers ────────────────────────────────────────────────────────

/**
 * Returns true when a log event matches the given filter criteria.
 *
 * Criteria fields (all optional):
 *   search     {string}  — case-insensitive substring match against action/target_id
 *   action     {string}  — exact action match ('' = all)
 *   dateFrom   {string}  — ISO date 'YYYY-MM-DD'; event must be on or after this date
 *   dateTo     {string}  — ISO date 'YYYY-MM-DD'; event must be on or before this date
 *
 * @param {{ action?: string, target_id?: string, created_at?: string }} event
 * @param {{ search?: string, action?: string, dateFrom?: string, dateTo?: string }} filters
 * @returns {boolean}
 */
export function matchesAuditFilter(event, filters = {}) {
  const { search = '', action = '', dateFrom = '', dateTo = '' } = filters;

  if (action && event.action !== action) return false;

  if (search) {
    const q = search.toLowerCase();
    const haystack = [event.action, event.target_id].join(' ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (dateFrom) {
    if (!event.created_at) return false;
    const eventDate = new Date(event.created_at);
    const from      = new Date(dateFrom + 'T00:00:00');
    if (eventDate < from) return false;
  }

  if (dateTo) {
    if (!event.created_at) return false;
    const eventDate = new Date(event.created_at);
    const to        = new Date(dateTo + 'T23:59:59.999');
    if (eventDate > to) return false;
  }

  return true;
}

/**
 * Returns true when an agent event matches the given filter criteria.
 *
 * Criteria fields (all optional):
 *   search   {string}  — case-insensitive substring match against action_type/status
 *   status   {string}  — exact status match ('' = all)
 *   dateFrom {string}  — ISO date 'YYYY-MM-DD'
 *   dateTo   {string}  — ISO date 'YYYY-MM-DD'
 *
 * @param {{ action_type?: string, event_type?: string, status?: string, created_at?: string }} event
 * @param {{ search?: string, status?: string, dateFrom?: string, dateTo?: string }} filters
 * @returns {boolean}
 */
export function matchesAgentFilter(event, filters = {}) {
  const { search = '', status = '', dateFrom = '', dateTo = '' } = filters;

  if (status && event.status !== status) return false;

  if (search) {
    const q = search.toLowerCase();
    const haystack = [event.action_type, event.event_type, event.status].join(' ').toLowerCase();
    if (!haystack.includes(q)) return false;
  }

  if (dateFrom) {
    if (!event.created_at) return false;
    const eventDate = new Date(event.created_at);
    const from      = new Date(dateFrom + 'T00:00:00');
    if (eventDate < from) return false;
  }

  if (dateTo) {
    if (!event.created_at) return false;
    const eventDate = new Date(event.created_at);
    const to        = new Date(dateTo + 'T23:59:59.999');
    if (eventDate > to) return false;
  }

  return true;
}

// ── System status helpers ─────────────────────────────────────────────────

/**
 * All recognised system-health status levels, in ascending severity order.
 */
export const HEALTH_STATUSES = Object.freeze(['healthy', 'degraded', 'critical', 'unknown']);

/**
 * Returns the Tailwind CSS class tokens for a system health indicator.
 *
 * @param {string|null|undefined} status
 * @returns {string}
 */
export function healthBadgeClass(status) {
  switch (status) {
    case 'healthy':  return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'degraded': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'critical': return 'bg-red-500/10 text-red-400 border-red-500/20';
    default:         return 'bg-slate-700 text-slate-400 border-slate-600';
  }
}

/**
 * Returns a human-readable label for a health status.
 *
 * @param {string|null|undefined} status
 * @returns {string}
 */
export function healthLabel(status) {
  switch (status) {
    case 'healthy':  return 'Healthy';
    case 'degraded': return 'Degraded';
    case 'critical': return 'Critical';
    default:         return status != null ? String(status) : 'Unknown';
  }
}
