/**
 * tests/auth.test.js
 *
 * Unit tests for Greens ACC Phase 3 authentication & RBAC helpers.
 *
 * Uses only Node.js built-ins (assert) so no extra dependencies are needed.
 * Run with:  node tests/auth.test.js
 */

import { strict as assert } from 'assert';
import {
  hasAdminAccess,
  hasDeveloperAccess,
  isAllowedRole,
  defaultRedirectForRole,
  ADMIN_ROLE,
  DEVELOPER_ROLE,
  ALLOWED_ROLES,
  SUPABASE_RECOVERY_STORAGE_KEY,
  normalizeBasePath,
  getResetPasswordPath,
  buildResetPasswordRedirect,
  getHashRouterRouteUrl,
  extractRecoveryParamsFromString,
  isRecoveryPayload,
} from '../src/lib/auth.js';

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

// ── Unauthenticated access ────────────────────────────────────────────────
console.log('\nUnauthenticated access:');

test('null role denies admin access', () => {
  assert.equal(hasAdminAccess(null), false);
});

test('undefined role denies admin access', () => {
  assert.equal(hasAdminAccess(undefined), false);
});

test('null role denies developer access', () => {
  assert.equal(hasDeveloperAccess(null), false);
});

test('null role is not an allowed role', () => {
  assert.equal(isAllowedRole(null), false);
});

test('unauthenticated redirect defaults to /', () => {
  assert.equal(defaultRedirectForRole(null), '/');
});

// ── Admin access ─────────────────────────────────────────────────────────
console.log('\nAdmin access:');

test('admin role grants admin access', () => {
  assert.equal(hasAdminAccess(ADMIN_ROLE), true);
});

test('admin role grants developer access (inheritance)', () => {
  assert.equal(hasDeveloperAccess(ADMIN_ROLE), true);
});

test('admin role is an allowed role', () => {
  assert.equal(isAllowedRole(ADMIN_ROLE), true);
});

test('admin redirect points to /dashboard', () => {
  assert.equal(defaultRedirectForRole(ADMIN_ROLE), '/dashboard');
});

// ── Developer access ──────────────────────────────────────────────────────
console.log('\nDeveloper access:');

test('developer role grants developer access', () => {
  assert.equal(hasDeveloperAccess(DEVELOPER_ROLE), true);
});

test('developer role does NOT grant admin access', () => {
  assert.equal(hasAdminAccess(DEVELOPER_ROLE), false);
});

test('developer role is an allowed role', () => {
  assert.equal(isAllowedRole(DEVELOPER_ROLE), true);
});

test('developer redirect points to /dashboard', () => {
  assert.equal(defaultRedirectForRole(DEVELOPER_ROLE), '/dashboard');
});

// ── Unauthorized / disabled roles ────────────────────────────────────────
console.log('\nUnauthorized access (disabled / unknown roles):');

test('"user" role is NOT allowed (not yet enabled)', () => {
  assert.equal(isAllowedRole('user'), false);
});

test('"user" role denies admin access', () => {
  assert.equal(hasAdminAccess('user'), false);
});

test('"user" role denies developer access', () => {
  assert.equal(hasDeveloperAccess('user'), false);
});

test('"analyzer" role is not in the active allowed list', () => {
  assert.equal(isAllowedRole('analyzer'), false);
});

test('unknown role defaults redirect to /', () => {
  assert.equal(defaultRedirectForRole('unknown_role'), '/');
});

// ── ALLOWED_ROLES integrity ───────────────────────────────────────────────
console.log('\nALLOWED_ROLES invariants:');

test('ALLOWED_ROLES contains exactly admin and developer', () => {
  assert.deepEqual([...ALLOWED_ROLES].sort(), ['admin', 'developer']);
});

test('ALLOWED_ROLES is frozen (immutable)', () => {
  assert.ok(Object.isFrozen(ALLOWED_ROLES), 'ALLOWED_ROLES should be frozen');
});

// ── Session restoration ───────────────────────────────────────────────────
console.log('\nSession restoration:');

test('restored admin session retains admin access', () => {
  // Simulate: after getSession() returns a user with admin role in profiles
  const restoredRole = ADMIN_ROLE;
  assert.equal(hasAdminAccess(restoredRole), true);
  assert.equal(defaultRedirectForRole(restoredRole), '/dashboard');
});

test('restored developer session retains developer access', () => {
  const restoredRole = DEVELOPER_ROLE;
  assert.equal(hasDeveloperAccess(restoredRole), true);
  assert.equal(defaultRedirectForRole(restoredRole), '/dashboard');
});

// ── Logout ────────────────────────────────────────────────────────────────
console.log('\nLogout:');

test('after logout, role is null — admin access denied', () => {
  const roleAfterLogout = null;
  assert.equal(hasAdminAccess(roleAfterLogout), false);
});

test('after logout, role is null — developer access denied', () => {
  const roleAfterLogout = null;
  assert.equal(hasDeveloperAccess(roleAfterLogout), false);
});

test('after logout, role is null — not an allowed role', () => {
  const roleAfterLogout = null;
  assert.equal(isAllowedRole(roleAfterLogout), false);
});

test('after logout, redirect defaults to /', () => {
  assert.equal(defaultRedirectForRole(null), '/');
});

// ── Password recovery helpers ──────────────────────────────────────────────
console.log('\nPassword recovery helpers:');

test('recovery storage key is stable', () => {
  assert.equal(SUPABASE_RECOVERY_STORAGE_KEY, 'supabase-recovery-hash');
});

test('normalizeBasePath trims trailing slash but keeps repo base path', () => {
  assert.equal(normalizeBasePath('/greens-acc.com/'), '/greens-acc.com');
});

test('root base path normalizes to empty prefix', () => {
  assert.equal(normalizeBasePath('/'), '');
});

test('reset password redirect uses app base path', () => {
  assert.equal(
    buildResetPasswordRedirect('https://greens-acc.com', '/portal/'),
    'https://greens-acc.com/portal/reset-password'
  );
});

test('hash router reset route is generated correctly', () => {
  assert.equal(getHashRouterRouteUrl('/portal/', '/reset-password'), '/portal/#/reset-password');
});

test('reset password path is generated correctly', () => {
  assert.equal(getResetPasswordPath('/portal/'), '/portal/reset-password');
});

test('extractRecoveryParamsFromString parses access and refresh tokens', () => {
  assert.deepEqual(
    extractRecoveryParamsFromString('#access_token=abc&refresh_token=def&type=recovery'),
    {
      type: 'recovery',
      code: null,
      tokenHash: null,
      accessToken: 'abc',
      refreshToken: 'def',
    }
  );
});

test('extractRecoveryParamsFromString parses route query payloads', () => {
  assert.deepEqual(
    extractRecoveryParamsFromString('/reset-password?code=123&type=recovery'),
    {
      type: 'recovery',
      code: '123',
      tokenHash: null,
      accessToken: null,
      refreshToken: null,
    }
  );
});

test('isRecoveryPayload detects recovery links', () => {
  assert.equal(isRecoveryPayload('?token_hash=xyz&type=recovery'), true);
});

test('isRecoveryPayload ignores ordinary route hashes', () => {
  assert.equal(isRecoveryPayload('#/dashboard'), false);
});

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
