/**
 * tests/users.test.js
 *
 * Unit tests for Greens ACC Phase 4 User Management helpers.
 *
 * Uses only Node.js built-ins (assert) — no extra dependencies.
 * Run with:  node tests/users.test.js
 */

import { strict as assert } from 'assert';
import {
  ALL_MANAGED_ROLES,
  ROLE_PRIORITY,
  ACCOUNT_STATUSES,
  DEFAULT_PAGE_SIZE,
  STAFF_ROLE,
  USER_ROLE,
  isValidRole,
  isValidStatus,
  rolePriority,
  canManageUser,
  canDeleteUser,
  canAssignRole,
  pageRange,
  totalPages,
  statusLabel,
  roleBadgeClass,
  statusBadgeClass,
} from '../src/lib/users.js';

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// ── Constants ─────────────────────────────────────────────────────────────
console.log('\nConstants:');

test('ALL_MANAGED_ROLES contains all four roles', () => {
  assert.deepEqual([...ALL_MANAGED_ROLES].sort(), ['admin', 'developer', 'staff', 'user']);
});

test('ALL_MANAGED_ROLES is frozen', () => {
  assert.ok(Object.isFrozen(ALL_MANAGED_ROLES));
});

test('ROLE_PRIORITY has correct hierarchy', () => {
  assert.equal(ROLE_PRIORITY.admin,     1);
  assert.equal(ROLE_PRIORITY.developer, 2);
  assert.equal(ROLE_PRIORITY.staff,     3);
  assert.equal(ROLE_PRIORITY.user,      4);
});

test('ROLE_PRIORITY is frozen', () => {
  assert.ok(Object.isFrozen(ROLE_PRIORITY));
});

test('ACCOUNT_STATUSES contains all four statuses', () => {
  assert.deepEqual([...ACCOUNT_STATUSES].sort(), ['active', 'inactive', 'invited', 'suspended']);
});

test('ACCOUNT_STATUSES is frozen', () => {
  assert.ok(Object.isFrozen(ACCOUNT_STATUSES));
});

test('STAFF_ROLE equals "staff"', () => {
  assert.equal(STAFF_ROLE, 'staff');
});

test('USER_ROLE equals "user"', () => {
  assert.equal(USER_ROLE, 'user');
});

test('DEFAULT_PAGE_SIZE is a positive integer', () => {
  assert.ok(Number.isInteger(DEFAULT_PAGE_SIZE) && DEFAULT_PAGE_SIZE > 0);
});

// ── isValidRole ───────────────────────────────────────────────────────────
console.log('\nisValidRole:');

test('"admin" is a valid role', () => {
  assert.equal(isValidRole('admin'), true);
});

test('"developer" is a valid role', () => {
  assert.equal(isValidRole('developer'), true);
});

test('"staff" is a valid role', () => {
  assert.equal(isValidRole('staff'), true);
});

test('"user" is a valid role', () => {
  assert.equal(isValidRole('user'), true);
});

test('"superadmin" is NOT a valid role', () => {
  assert.equal(isValidRole('superadmin'), false);
});

test('null is NOT a valid role', () => {
  assert.equal(isValidRole(null), false);
});

test('undefined is NOT a valid role', () => {
  assert.equal(isValidRole(undefined), false);
});

// ── isValidStatus ─────────────────────────────────────────────────────────
console.log('\nisValidStatus:');

test('"active" is a valid status', () => {
  assert.equal(isValidStatus('active'), true);
});

test('"inactive" is a valid status', () => {
  assert.equal(isValidStatus('inactive'), true);
});

test('"invited" is a valid status', () => {
  assert.equal(isValidStatus('invited'), true);
});

test('"suspended" is a valid status', () => {
  assert.equal(isValidStatus('suspended'), true);
});

test('"banned" is NOT a valid status', () => {
  assert.equal(isValidStatus('banned'), false);
});

test('null is NOT a valid status', () => {
  assert.equal(isValidStatus(null), false);
});

// ── rolePriority ──────────────────────────────────────────────────────────
console.log('\nrolePriority:');

test('admin has priority 1', () => {
  assert.equal(rolePriority('admin'), 1);
});

test('developer has priority 2', () => {
  assert.equal(rolePriority('developer'), 2);
});

test('staff has priority 3', () => {
  assert.equal(rolePriority('staff'), 3);
});

test('user has priority 4', () => {
  assert.equal(rolePriority('user'), 4);
});

test('unknown role has Infinity priority', () => {
  assert.equal(rolePriority('superadmin'), Infinity);
});

test('admin has higher privilege than developer (lower priority number)', () => {
  assert.ok(rolePriority('admin') < rolePriority('developer'));
});

// ── canManageUser ─────────────────────────────────────────────────────────
console.log('\ncanManageUser:');

test('admin can manage a user-role account', () => {
  assert.equal(canManageUser('admin', 'user'), true);
});

test('admin can manage a staff-role account', () => {
  assert.equal(canManageUser('admin', 'staff'), true);
});

test('admin can manage a developer-role account', () => {
  assert.equal(canManageUser('admin', 'developer'), true);
});

test('admin can manage another admin-role account', () => {
  assert.equal(canManageUser('admin', 'admin'), true);
});

test('developer cannot manage any account', () => {
  assert.equal(canManageUser('developer', 'user'), false);
});

test('staff cannot manage any account', () => {
  assert.equal(canManageUser('staff', 'user'), false);
});

test('null actor cannot manage', () => {
  assert.equal(canManageUser(null, 'user'), false);
});

// ── canDeleteUser ─────────────────────────────────────────────────────────
console.log('\ncanDeleteUser:');

test('admin can delete a user-role account', () => {
  assert.equal(canDeleteUser('admin', 'user'), true);
});

test('admin can delete a staff-role account', () => {
  assert.equal(canDeleteUser('admin', 'staff'), true);
});

test('admin can delete a developer-role account', () => {
  assert.equal(canDeleteUser('admin', 'developer'), true);
});

test('admin CANNOT delete another admin (lockout prevention)', () => {
  assert.equal(canDeleteUser('admin', 'admin'), false);
});

test('developer cannot delete any account', () => {
  assert.equal(canDeleteUser('developer', 'user'), false);
});

test('null actor cannot delete', () => {
  assert.equal(canDeleteUser(null, 'user'), false);
});

// ── canAssignRole ─────────────────────────────────────────────────────────
console.log('\ncanAssignRole:');

test('admin can assign "user" role', () => {
  assert.equal(canAssignRole('admin', 'user'), true);
});

test('admin can assign "staff" role', () => {
  assert.equal(canAssignRole('admin', 'staff'), true);
});

test('admin can assign "developer" role', () => {
  assert.equal(canAssignRole('admin', 'developer'), true);
});

test('admin can assign "admin" role', () => {
  assert.equal(canAssignRole('admin', 'admin'), true);
});

test('admin cannot assign an invalid role', () => {
  assert.equal(canAssignRole('admin', 'superadmin'), false);
});

test('developer cannot assign any role', () => {
  assert.equal(canAssignRole('developer', 'user'), false);
});

// ── pageRange ─────────────────────────────────────────────────────────────
console.log('\npageRange:');

test('page 1 with size 20 yields {from:0, to:19}', () => {
  assert.deepEqual(pageRange(1, 20), { from: 0, to: 19 });
});

test('page 2 with size 20 yields {from:20, to:39}', () => {
  assert.deepEqual(pageRange(2, 20), { from: 20, to: 39 });
});

test('page 3 with size 10 yields {from:20, to:29}', () => {
  assert.deepEqual(pageRange(3, 10), { from: 20, to: 29 });
});

test('page 1 with size 1 yields {from:0, to:0}', () => {
  assert.deepEqual(pageRange(1, 1), { from: 0, to: 0 });
});

test('page 0 throws RangeError', () => {
  assert.throws(() => pageRange(0, 20), RangeError);
});

test('negative page throws RangeError', () => {
  assert.throws(() => pageRange(-1, 20), RangeError);
});

test('pageSize 0 throws RangeError', () => {
  assert.throws(() => pageRange(1, 0), RangeError);
});

test('non-integer page throws RangeError', () => {
  assert.throws(() => pageRange(1.5, 20), RangeError);
});

// ── totalPages ────────────────────────────────────────────────────────────
console.log('\ntotalPages:');

test('100 items / 20 per page = 5 pages', () => {
  assert.equal(totalPages(100, 20), 5);
});

test('101 items / 20 per page = 6 pages', () => {
  assert.equal(totalPages(101, 20), 6);
});

test('0 items / 20 per page = 1 page (minimum)', () => {
  assert.equal(totalPages(0, 20), 1);
});

test('1 item / 20 per page = 1 page', () => {
  assert.equal(totalPages(1, 20), 1);
});

test('20 items / 20 per page = 1 page (exact fit)', () => {
  assert.equal(totalPages(20, 20), 1);
});

test('21 items / 20 per page = 2 pages', () => {
  assert.equal(totalPages(21, 20), 2);
});

test('pageSize 0 throws RangeError', () => {
  assert.throws(() => totalPages(10, 0), RangeError);
});

test('negative totalCount throws RangeError', () => {
  assert.throws(() => totalPages(-1, 20), RangeError);
});

// ── statusLabel ───────────────────────────────────────────────────────────
console.log('\nstatusLabel:');

test('"active" label is "Active"', () => {
  assert.equal(statusLabel('active'), 'Active');
});

test('"inactive" label is "Inactive"', () => {
  assert.equal(statusLabel('inactive'), 'Inactive');
});

test('"invited" label is "Invited"', () => {
  assert.equal(statusLabel('invited'), 'Invited');
});

test('"suspended" label is "Suspended"', () => {
  assert.equal(statusLabel('suspended'), 'Suspended');
});

test('null status label is "Unknown"', () => {
  assert.equal(statusLabel(null), 'Unknown');
});

test('unknown status returns the status string itself', () => {
  assert.equal(statusLabel('pending'), 'pending');
});

// ── roleBadgeClass ────────────────────────────────────────────────────────
console.log('\nroleBadgeClass:');

test('admin badge contains emerald colour', () => {
  assert.ok(roleBadgeClass('admin').includes('emerald'));
});

test('developer badge contains blue colour', () => {
  assert.ok(roleBadgeClass('developer').includes('blue'));
});

test('staff badge contains violet colour', () => {
  assert.ok(roleBadgeClass('staff').includes('violet'));
});

test('user badge contains slate colour', () => {
  assert.ok(roleBadgeClass('user').includes('slate'));
});

test('unknown role returns a non-empty fallback class', () => {
  assert.ok(roleBadgeClass('unknown').length > 0);
});

// ── statusBadgeClass ──────────────────────────────────────────────────────
console.log('\nstatusBadgeClass:');

test('active status badge contains emerald colour', () => {
  assert.ok(statusBadgeClass('active').includes('emerald'));
});

test('invited status badge contains amber colour', () => {
  assert.ok(statusBadgeClass('invited').includes('amber'));
});

test('suspended status badge contains red colour', () => {
  assert.ok(statusBadgeClass('suspended').includes('red'));
});

test('inactive status badge contains slate colour', () => {
  assert.ok(statusBadgeClass('inactive').includes('slate'));
});

test('unknown status returns a non-empty fallback class', () => {
  assert.ok(statusBadgeClass('unknown').length > 0);
});

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
