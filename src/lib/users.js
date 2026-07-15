/**
 * src/lib/users.js
 *
 * Pure utility functions for Greens ACC Phase 4 User Management.
 *
 * Side-effect-free; usable in both React components and Node.js test files.
 */

// ── Role identifiers ──────────────────────────────────────────────────────

export const STAFF_ROLE = 'staff';
export const USER_ROLE  = 'user';

/**
 * All roles available in the user-management UI.
 * Note: 'staff' and 'user' are DB-level roles not yet activated for login.
 */
export const ALL_MANAGED_ROLES = Object.freeze(['admin', 'developer', 'staff', 'user']);

/**
 * Numeric priority for each role (lower number = higher privilege).
 */
export const ROLE_PRIORITY = Object.freeze({
  admin:     1,
  developer: 2,
  staff:     3,
  user:      4,
});

// ── Status identifiers ────────────────────────────────────────────────────

/** All valid account status values. */
export const ACCOUNT_STATUSES = Object.freeze(['active', 'inactive', 'invited', 'suspended']);

/** Default page size for the user list. */
export const DEFAULT_PAGE_SIZE = 20;

// ── Validation helpers ────────────────────────────────────────────────────

/** Returns true when `role` is a recognised managed role. */
export function isValidRole(role) {
  return ALL_MANAGED_ROLES.includes(role);
}

/** Returns true when `status` is a recognised account status. */
export function isValidStatus(status) {
  return ACCOUNT_STATUSES.includes(status);
}

// ── Role helpers ──────────────────────────────────────────────────────────

/**
 * Returns the numeric priority of a role.
 * Unknown roles receive Infinity (lowest priority).
 */
export function rolePriority(role) {
  return ROLE_PRIORITY[role] ?? Infinity;
}

/**
 * Returns true when `actorRole` has authority to manage a user with `targetRole`.
 * Currently only admin users may manage other users through this interface.
 */
export function canManageUser(actorRole, targetRole) {
  if (actorRole !== 'admin') return false;
  if (typeof targetRole !== 'string') return false;
  return true;
}

/**
 * Returns true when `actorRole` can delete a user with `targetRole`.
 * Admins may not delete other admin accounts (prevents accidental lockout).
 */
export function canDeleteUser(actorRole, targetRole) {
  if (actorRole !== 'admin') return false;
  if (targetRole === 'admin') return false;
  return true;
}

/**
 * Returns true when `actorRole` can assign `newRole` to another user.
 * Any valid role may be assigned by an admin.
 */
export function canAssignRole(actorRole, newRole) {
  if (actorRole !== 'admin') return false;
  return isValidRole(newRole);
}

// ── Pagination helpers ────────────────────────────────────────────────────

/**
 * Returns the zero-indexed `{ from, to }` range for Supabase range headers.
 * `page` is 1-indexed; `pageSize` must be >= 1.
 *
 * @param {number} page
 * @param {number} pageSize
 * @returns {{ from: number, to: number }}
 */
export function pageRange(page, pageSize) {
  if (!Number.isInteger(page) || page < 1)     throw new RangeError('page must be an integer >= 1');
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError('pageSize must be an integer >= 1');
  const from = (page - 1) * pageSize;
  const to   = from + pageSize - 1;
  return { from, to };
}

/**
 * Returns the total number of pages for `totalCount` items at `pageSize` per page.
 * Always returns at least 1.
 */
export function totalPages(totalCount, pageSize) {
  if (!Number.isInteger(pageSize) || pageSize < 1) throw new RangeError('pageSize must be an integer >= 1');
  if (totalCount < 0) throw new RangeError('totalCount must be >= 0');
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

// ── Display helpers ───────────────────────────────────────────────────────

/** Returns a human-readable label for an account status. */
export function statusLabel(status) {
  switch (status) {
    case 'active':    return 'Active';
    case 'inactive':  return 'Inactive';
    case 'invited':   return 'Invited';
    case 'suspended': return 'Suspended';
    default:          return status != null ? String(status) : 'Unknown';
  }
}

/**
 * Returns the Tailwind CSS class tokens for a role badge.
 * The returned string is safe to spread into a `className`.
 */
export function roleBadgeClass(role) {
  switch (role) {
    case 'admin':     return 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    case 'developer': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'staff':     return 'bg-violet-500/15 text-violet-400 border-violet-500/30';
    case 'user':      return 'bg-slate-500/15 text-slate-400 border-slate-600';
    default:          return 'bg-slate-700 text-slate-400 border-slate-600';
  }
}

/**
 * Returns the Tailwind CSS class tokens for a status badge.
 */
export function statusBadgeClass(status) {
  switch (status) {
    case 'active':    return 'bg-emerald-500/10 text-emerald-400';
    case 'inactive':  return 'bg-slate-500/10 text-slate-400';
    case 'invited':   return 'bg-amber-500/10 text-amber-400';
    case 'suspended': return 'bg-red-500/10 text-red-400';
    default:          return 'bg-slate-700 text-slate-400';
  }
}
