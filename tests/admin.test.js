/**
 * tests/admin.test.js
 *
 * Unit tests for Greens ACC Phase 6 Admin Control Room helpers.
 *
 * Uses only Node.js built-ins (assert) — no extra dependencies.
 * Run with:  node tests/admin.test.js
 */

import { strict as assert } from 'assert';
import {
  formatTimestamp,
  formatDate,
  toISODate,
  USER_ACTION_TYPES,
  actionLabel,
  actionBadgeClass,
  agentStatusBadgeClass,
  matchesAuditFilter,
  matchesAgentFilter,
  HEALTH_STATUSES,
  healthBadgeClass,
  healthLabel,
} from '../src/lib/admin.js';

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

// ── formatTimestamp ───────────────────────────────────────────────────────
console.log('\nformatTimestamp:');

test('valid ISO string returns a non-empty string', () => {
  const result = formatTimestamp('2025-01-15T10:30:00Z');
  assert.ok(typeof result === 'string' && result.length > 0);
  assert.notEqual(result, '—');
});

test('null returns "—"', () => {
  assert.equal(formatTimestamp(null), '—');
});

test('undefined returns "—"', () => {
  assert.equal(formatTimestamp(undefined), '—');
});

test('empty string returns "—"', () => {
  assert.equal(formatTimestamp(''), '—');
});

test('invalid string returns "—"', () => {
  assert.equal(formatTimestamp('not-a-date'), '—');
});

// ── formatDate ────────────────────────────────────────────────────────────
console.log('\nformatDate:');

test('valid ISO string returns a non-empty string', () => {
  const result = formatDate('2025-06-01T00:00:00Z');
  assert.ok(typeof result === 'string' && result.length > 0);
  assert.notEqual(result, '—');
});

test('null returns "—"', () => {
  assert.equal(formatDate(null), '—');
});

test('undefined returns "—"', () => {
  assert.equal(formatDate(undefined), '—');
});

test('invalid date returns "—"', () => {
  assert.equal(formatDate('garbage'), '—');
});

// ── toISODate ─────────────────────────────────────────────────────────────
console.log('\ntoISODate:');

test('Date object returns YYYY-MM-DD string', () => {
  const result = toISODate(new Date('2025-03-15T12:00:00Z'));
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test('ISO string input returns YYYY-MM-DD string', () => {
  const result = toISODate('2025-07-04T00:00:00Z');
  assert.match(result, /^\d{4}-\d{2}-\d{2}$/);
});

test('invalid date string throws RangeError', () => {
  assert.throws(() => toISODate('not-a-date'), RangeError);
});

test('invalid object throws RangeError', () => {
  assert.throws(() => toISODate('garbage-value'), RangeError);
});

// ── USER_ACTION_TYPES ─────────────────────────────────────────────────────
console.log('\nUSER_ACTION_TYPES:');

test('contains all six action types', () => {
  const expected = ['invite_user', 'update_role', 'deactivate_user', 'reactivate_user', 'reset_password', 'delete_user'];
  assert.deepEqual([...USER_ACTION_TYPES].sort(), expected.sort());
});

test('is frozen', () => {
  assert.ok(Object.isFrozen(USER_ACTION_TYPES));
});

// ── actionLabel ───────────────────────────────────────────────────────────
console.log('\nactionLabel:');

test('"invite_user" → "Invite User"', () => {
  assert.equal(actionLabel('invite_user'), 'Invite User');
});

test('"update_role" → "Update Role"', () => {
  assert.equal(actionLabel('update_role'), 'Update Role');
});

test('"deactivate_user" → "Deactivate User"', () => {
  assert.equal(actionLabel('deactivate_user'), 'Deactivate User');
});

test('"reactivate_user" → "Reactivate User"', () => {
  assert.equal(actionLabel('reactivate_user'), 'Reactivate User');
});

test('"reset_password" → "Reset Password"', () => {
  assert.equal(actionLabel('reset_password'), 'Reset Password');
});

test('"delete_user" → "Delete User"', () => {
  assert.equal(actionLabel('delete_user'), 'Delete User');
});

test('null → "Unknown"', () => {
  assert.equal(actionLabel(null), 'Unknown');
});

test('unknown action returns the raw string', () => {
  assert.equal(actionLabel('custom_action'), 'custom_action');
});

// ── actionBadgeClass ──────────────────────────────────────────────────────
console.log('\nactionBadgeClass:');

test('"invite_user" badge contains emerald', () => {
  assert.ok(actionBadgeClass('invite_user').includes('emerald'));
});

test('"update_role" badge contains blue', () => {
  assert.ok(actionBadgeClass('update_role').includes('blue'));
});

test('"deactivate_user" badge contains amber', () => {
  assert.ok(actionBadgeClass('deactivate_user').includes('amber'));
});

test('"delete_user" badge contains red', () => {
  assert.ok(actionBadgeClass('delete_user').includes('red'));
});

test('unknown action returns non-empty fallback', () => {
  assert.ok(actionBadgeClass('mystery').length > 0);
});

// ── agentStatusBadgeClass ─────────────────────────────────────────────────
console.log('\nagentStatusBadgeClass:');

test('"active" badge contains emerald', () => {
  assert.ok(agentStatusBadgeClass('active').includes('emerald'));
});

test('"completed" badge contains emerald', () => {
  assert.ok(agentStatusBadgeClass('completed').includes('emerald'));
});

test('"running" badge contains blue', () => {
  assert.ok(agentStatusBadgeClass('running').includes('blue'));
});

test('"failed" badge contains red', () => {
  assert.ok(agentStatusBadgeClass('failed').includes('red'));
});

test('"pending" badge contains amber', () => {
  assert.ok(agentStatusBadgeClass('pending').includes('amber'));
});

test('unknown status returns non-empty fallback', () => {
  assert.ok(agentStatusBadgeClass('zork').length > 0);
});

// ── matchesAuditFilter ────────────────────────────────────────────────────
console.log('\nmatchesAuditFilter:');

const sampleAuditEvent = {
  action: 'invite_user',
  target_id: 'user-abc-123',
  created_at: '2025-06-15T10:00:00Z',
};

test('empty filters match everything', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, {}), true);
});

test('exact action match returns true', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { action: 'invite_user' }), true);
});

test('wrong action match returns false', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { action: 'delete_user' }), false);
});

test('empty action string matches all actions', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { action: '' }), true);
});

test('search matching action value returns true', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { search: 'invite' }), true);
});

test('search matching target_id returns true', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { search: 'abc-123' }), true);
});

test('case-insensitive search works', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { search: 'INVITE' }), true);
});

test('non-matching search returns false', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { search: 'zzz-not-found' }), false);
});

test('dateFrom before event passes', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { dateFrom: '2025-06-01' }), true);
});

test('dateFrom after event fails', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { dateFrom: '2025-07-01' }), false);
});

test('dateTo after event passes', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { dateTo: '2025-12-31' }), true);
});

test('dateTo before event fails', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { dateTo: '2025-06-14' }), false);
});

test('event on exact dateFrom passes', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { dateFrom: '2025-06-15' }), true);
});

test('event on exact dateTo passes', () => {
  assert.equal(matchesAuditFilter(sampleAuditEvent, { dateTo: '2025-06-15' }), true);
});

test('event with no created_at fails date filter', () => {
  const ev = { action: 'invite_user' };
  assert.equal(matchesAuditFilter(ev, { dateFrom: '2025-01-01' }), false);
  assert.equal(matchesAuditFilter(ev, { dateTo: '2025-12-31' }), false);
});

// ── matchesAgentFilter ────────────────────────────────────────────────────
console.log('\nmatchesAgentFilter:');

const sampleAgentEvent = {
  action_type: 'process_task',
  status: 'completed',
  created_at: '2025-06-20T14:30:00Z',
};

test('empty filters match everything', () => {
  assert.equal(matchesAgentFilter(sampleAgentEvent, {}), true);
});

test('exact status match returns true', () => {
  assert.equal(matchesAgentFilter(sampleAgentEvent, { status: 'completed' }), true);
});

test('wrong status returns false', () => {
  assert.equal(matchesAgentFilter(sampleAgentEvent, { status: 'failed' }), false);
});

test('empty status string matches all', () => {
  assert.equal(matchesAgentFilter(sampleAgentEvent, { status: '' }), true);
});

test('search matching action_type returns true', () => {
  assert.equal(matchesAgentFilter(sampleAgentEvent, { search: 'process' }), true);
});

test('case-insensitive search on status works', () => {
  assert.equal(matchesAgentFilter(sampleAgentEvent, { search: 'COMPLETED' }), true);
});

test('non-matching search returns false', () => {
  assert.equal(matchesAgentFilter(sampleAgentEvent, { search: 'zzznope' }), false);
});

test('dateFrom filter works for agent events', () => {
  assert.equal(matchesAgentFilter(sampleAgentEvent, { dateFrom: '2025-06-01' }), true);
  assert.equal(matchesAgentFilter(sampleAgentEvent, { dateFrom: '2025-07-01' }), false);
});

test('dateTo filter works for agent events', () => {
  assert.equal(matchesAgentFilter(sampleAgentEvent, { dateTo: '2025-12-31' }), true);
  assert.equal(matchesAgentFilter(sampleAgentEvent, { dateTo: '2025-06-19' }), false);
});

// ── HEALTH_STATUSES ───────────────────────────────────────────────────────
console.log('\nHEALTH_STATUSES:');

test('contains all four statuses', () => {
  assert.ok(HEALTH_STATUSES.includes('healthy'));
  assert.ok(HEALTH_STATUSES.includes('degraded'));
  assert.ok(HEALTH_STATUSES.includes('critical'));
  assert.ok(HEALTH_STATUSES.includes('unknown'));
});

test('is frozen', () => {
  assert.ok(Object.isFrozen(HEALTH_STATUSES));
});

// ── healthBadgeClass ──────────────────────────────────────────────────────
console.log('\nhealthBadgeClass:');

test('"healthy" badge contains emerald', () => {
  assert.ok(healthBadgeClass('healthy').includes('emerald'));
});

test('"degraded" badge contains amber', () => {
  assert.ok(healthBadgeClass('degraded').includes('amber'));
});

test('"critical" badge contains red', () => {
  assert.ok(healthBadgeClass('critical').includes('red'));
});

test('unknown status returns non-empty fallback', () => {
  assert.ok(healthBadgeClass(null).length > 0);
});

// ── healthLabel ───────────────────────────────────────────────────────────
console.log('\nhealthLabel:');

test('"healthy" → "Healthy"', () => {
  assert.equal(healthLabel('healthy'), 'Healthy');
});

test('"degraded" → "Degraded"', () => {
  assert.equal(healthLabel('degraded'), 'Degraded');
});

test('"critical" → "Critical"', () => {
  assert.equal(healthLabel('critical'), 'Critical');
});

test('null → "Unknown"', () => {
  assert.equal(healthLabel(null), 'Unknown');
});

test('unknown string returns the raw string', () => {
  assert.equal(healthLabel('offline'), 'offline');
});

// ── Summary ───────────────────────────────────────────────────────────────
console.log(`\nResults: ${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  process.exit(1);
}
