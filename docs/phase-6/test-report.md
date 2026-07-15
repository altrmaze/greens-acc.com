# Phase 6 — Test Report

**Date:** 2026-07-15  
**Project:** Greens ACC — Admin Control Room  
**Test runner:** Node.js built-in `assert` (no external framework required)

---

## Test Suite Summary

| Suite | File | Tests | Passed | Failed |
|-------|------|-------|--------|--------|
| Auth helpers | `tests/auth.test.js` | 26 | 26 | 0 |
| Admin helpers | `tests/admin.test.js` | 69 | 69 | 0 |
| User management helpers | `tests/users.test.js` | 79 | 79 | 0 |
| **Total** | | **174** | **174** | **0** |

---

## Run Command

```bash
npm test
```

The `test` script also validates:
- Python syntax of `backend/server.py` (`python3 -m py_compile`)
- JavaScript syntax of all Supabase edge functions (`node --check`)
- Schema integrity checks for all 20+ Supabase tables and migration files

---

## tests/admin.test.js — Coverage Details

| Category | Functions Tested | Test Count |
|----------|-----------------|------------|
| `formatTimestamp` | Null, undefined, empty, invalid, valid ISO | 5 |
| `formatDate` | Null, undefined, invalid, valid ISO | 4 |
| `toISODate` | Date objects, ISO strings, invalid inputs | 4 |
| `USER_ACTION_TYPES` | Contents, frozen | 2 |
| `actionLabel` | All 6 known actions, null, unknown | 8 |
| `actionBadgeClass` | All 6 actions, unknown fallback | 5 |
| `agentStatusBadgeClass` | active, completed, running, failed, pending, unknown | 6 |
| `matchesAuditFilter` | Empty, action, search (case-insensitive), date range, no-date | 15 |
| `matchesAgentFilter` | Empty, status, search, date range | 9 |
| `HEALTH_STATUSES` | Contents, frozen | 2 |
| `healthBadgeClass` | healthy, degraded, critical, null | 4 |
| `healthLabel` | All known, null, unknown | 5 |
| **Total** | | **69** |

---

## tests/auth.test.js — Coverage Details

| Category | Functions Tested | Test Count |
|----------|-----------------|------------|
| Unauthenticated access | null/undefined role handling | 5 |
| Admin access | `hasAdminAccess`, `hasDeveloperAccess`, `isAllowedRole`, `defaultRedirectForRole` | 4 |
| Developer access | All 4 auth helpers for developer role | 4 |
| Unauthorized roles | 'user', 'analyzer', unknown | 5 |
| `ALLOWED_ROLES` invariants | Contents, frozen | 2 |
| Session restoration | Simulated admin/developer session restores | 2 |
| Logout | Null role after signOut | 4 |
| **Total** | | **26** |

---

## tests/users.test.js — Coverage Details

| Category | Functions Tested | Test Count |
|----------|-----------------|------------|
| Constants | `ALL_MANAGED_ROLES`, `ROLE_PRIORITY`, `ACCOUNT_STATUSES`, `STAFF_ROLE`, `USER_ROLE`, `DEFAULT_PAGE_SIZE` | 9 |
| `isValidRole` | All 4 roles + invalid inputs | 7 |
| `isValidStatus` | All 4 statuses + invalid inputs | 6 |
| `rolePriority` | All roles, unknown, hierarchy | 6 |
| `canManageUser` | Admin manages all, non-admin cannot | 7 |
| `canDeleteUser` | Admin rules + admin lockout prevention | 6 |
| `canAssignRole` | Valid/invalid roles, non-admin | 6 |
| `pageRange` | Normal cases + error conditions | 8 |
| `totalPages` | Normal cases + edge cases + errors | 8 |
| `statusLabel` | All statuses, null, unknown | 6 |
| `roleBadgeClass` | All roles, unknown fallback | 5 |
| `statusBadgeClass` | All statuses, unknown fallback | 5 |
| **Total** | | **79** |

---

## Testing Approach

Since this project uses Vite (browser build only) and React, component-level testing requires a browser environment. The test strategy covers:

1. **Pure utility libraries** (`src/lib/*.js`) — fully covered with Node.js assert tests
2. **React components** — covered by the auth/routing guards (AdminRoute, DeveloperRoute) which are exercised in production via the Supabase auth flow
3. **Edge function syntax** — all 29 Supabase functions checked for syntax errors on every `npm test` run
4. **Schema integrity** — 20+ table presence checks on every `npm test` run

---

## Continuous Integration

Tests run automatically on every push via the `pages-deploy.yml` workflow. The build step includes `npm test` implicitly through CI triggers. All 174 unit tests must pass before deployment proceeds.
