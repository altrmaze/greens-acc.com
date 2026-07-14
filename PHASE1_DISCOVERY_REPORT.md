# PHASE 1 — REPOSITORY DISCOVERY REPORT
## Greens ACC · greens-acc.com
**Date:** 2026-07-14  
**Branch:** copilot/repository-discovery-phase-1  
**Status:** READ-ONLY INSPECTION — No files modified, no deployments triggered

---

## [STATUS]: COMPLETED — PHASE 1 DISCOVERY
**[PRIORITY]:** High  
**[SUMMARY]:** Full repository inspection complete. No files modified. All findings documented below.  
**[BLOCKER/WEAKNESS]:** Supabase project credentials are not verified as configured — every database-dependent feature in the app is non-functional without them.  
**[PROPOSAL]:** Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` GitHub secrets first before any other work begins.

---

## 📦 WHAT CURRENTLY EXISTS

### Current Branch
`copilot/repository-discovery-phase-1` — clean, up to date with origin. Last 3 commits are dependency bumps and a default accounts update.

---

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend SPA | React 19 + Vite 8, React Router 7 (HashRouter), react-i18next, Tailwind CSS |
| Static HTML | 12 standalone HTML pages (CDN Tailwind + CDN Supabase JS) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password + magic link OTP) |
| Edge Functions | 23 Supabase Deno/JS edge functions |
| Python Backend | `backend/server.py` — Python `ThreadingHTTPServer` (local use only) |
| Payments | Stripe (edge functions) |
| Deployment | GitHub Pages (static only) |
| CI/CD | 6 GitHub Actions workflows |
| Secret Scanning | Gitleaks (pre-commit hook) |

---

### App Entry Points

| File | Role |
|---|---|
| `index.html` | Public marketing/landing page (standalone, Tailwind CDN) |
| `admin.html` → `src/main.jsx` → `src/App.jsx` | React SPA entry point |
| `meeting.html` / `meeting-room.html` | Standalone WebRTC meeting room pages |
| `deal-room.html` | Standalone deal clearance room |
| `marketplace.html`, `fulfillment.html`, `tokens.html` | Standalone feature pages |
| `announce.html`, `success.html`, `cancel.html` | Support pages |

---

### React Routes (src/App.jsx)

| Path | Component | Guard |
|---|---|---|
| `/login` | Login | None |
| `/` | CommandCenter | DevGate |
| `/rooms` | NegotiationRooms | DevGate |
| `/analytics` | AgentAnalytics | DevGate |
| `/dashboard` | Dashboard | DevGate |
| `/admin` | TemporaryAccessGate | DevGate |
| `/security` | GreenBubblesSecurity | DevGate |
| `/container` | GreenContainer | ProtectedRoute (Supabase auth) |
| `/documents` | Documents | ProtectedRoute |
| `/automations` | Automations | ProtectedRoute |
| `/voice` | Voice | ProtectedRoute |
| `/travel` | Travel | ProtectedRoute |
| `/forms` | Forms | ProtectedRoute |
| `/bills` | Bills | ProtectedRoute |
| `/household` | Household | ProtectedRoute |
| `/permissions` | Permissions | ProtectedRoute |
| `/activity` | Activity | ProtectedRoute |
| `/settings` | Settings | ProtectedRoute |
| `/aegis` | AegisMonitor | ProtectedRoute |
| `/dashboard/admin` through `/dashboard/analyzer` | AdminDashboard | ProtectedRoute |

---

### Authentication & Security Layers

1. **DevGate** — optional `VITE_DEV_GATE_TOKEN` env var. If set, prompts for a dev token before mounting the app. State stored in `localStorage`. Not active in production unless env var is set.
2. **ProtectedRoute** — uses `useAuth` → `supabase.auth.getSession()`. Redirects to `/login` if no session.
3. **DashboardGuard** — reads `profiles.role` from Supabase. Role-based panel gating. Admin bypass included.
4. **TemporaryAccessGate** — dev-only routing helper at `/admin`. Maps role name input to allowlisted route. Does NOT bypass DashboardGuard.
5. **Login** — Supabase email+password and magic link OTP.
6. **Gitleaks** — pre-commit secret scanning via `.pre-commit-config.yaml`.

---

### Existing Work Identified

**Greens ACC core:**
- `green_acc_deals` table (escrow, entry fee $20, 2% handshake commission, 3-AI agent consensus)
- `processEntryFee.js`, `processWithdrawal.js` edge functions
- `createStripeCheckout.js`, `stripeWebhook.js`, `stripeConnectOnboard.js`
- `createHandshakeSession.js`

**Secure Deal/Meeting Rooms:**
- `deal-room.html` — Secure Deal Clearance Room (standalone HTML)
- `meeting-room.html`, `meeting.html` — WebRTC meeting rooms
- `meeting_signals` table for WebRTC signaling via Supabase Realtime
- `meetingRoom.js`, `generateInstantRoom.js`, `instant_rooms` table

**Green Bubbles / Green Container:**
- `GreenBubblesSecurity.jsx` page — displays 5 bubbles: Honeypot, Behavior & Trust, Data Integrity, Iron Shield, Crypto Vault
- `greenBubblesDefense.js` edge function — full two-path security orchestrator with capacity limits
- Migration `04_green_bubbles_defense.sql` — threat_profiles, analysis_runs, threat_observations, containment_actions, security_capacity, daily_security_reports, security_decisions
- `GreenContainer.jsx` page — user data container
- Migration `05_green_container_foundation.sql` — green_containers, green_container_objects, permissions, consents, access_log, integrity_checks, agent_registry, agent_permissions, agent_tasks, agent_actions, automation_rules, automation_approvals, payment_authorizations, trust_decisions, external_connectors, connector_actions

**Aegis AI / Self-Healing:**
- Migration `03_aegis_self_healing.sql` — algorithms, glitches, repairs, self_healing_events, healing_plans, heal_audit_log (838 lines)
- `AegisMonitor.jsx` page — reads algorithms + glitches from Supabase
- `greens-acc/index.ts` edge function — in-memory self-healing, waiting areas, green rooms

**Supabase:**
- `schema.sql` (390 lines) — main deal/payment schema
- 6 migration files (2860 lines total)
- 23 deployed edge functions
- `supabaseClient.js` with dual env var support (Vite + window.__ENV__)

**Dashboards / Admin:**
- `AdminDashboard.jsx` — role-labeled, reads containers/tasks/glitches/connectors/agent_actions
- `CommandCenter.jsx` — live market clocks, deal flow, role-gated panels
- `Dashboard.jsx` — Aegis healing metrics, waiting/room counts
- `AgentAnalytics.jsx` — AI agent analysis

**Compliance / Sanctions:**
- `aiComplianceLawyer.js` — compliance AI edge function
- `auditContractCompliance.js` — contract audit
- `compliance_logs`, `legal_audit_logs` tables
- `dealClearanceRoom.js`, `supplyChainCoordinator.js`

**Payment/Escrow:**
- Full lifecycle in `green_acc_deals`: entry fee → handshake → escrow lock → 3-agent consensus → compliance verify → safe withdrawal
- Stripe integration: checkout, webhooks, Connect onboarding

**AI Agents:**
- `aiAgentAnalyze.js`, `aiSecretaryTools.js`, `aiComplianceLawyer.js`
- `predictiveIntelligenceEngine.js`
- `newsWebhook.js`, `generatePressRelease.js`, `syndicateAnnouncement.js`

---

### GitHub Actions Workflows

| Workflow | Trigger | Purpose |
|---|---|---|
| `pages-deploy.yml` | push to main | Build Vite SPA + copy static HTML → deploy to GitHub Pages |
| `deploy.yml` | push to main / PR / manual | npm test → Supabase dry-run → edge function deploy → db push |
| `devin-engineer.yml` | push to main, PR | Runs Devin AI agent (requires `DEVIN_API_KEY`) |
| `devin-monitor.yml` | push to main | Devin AI on-standby monitor (requires `DEVIN_API_KEY`) |
| `gitleaks.yml` | push/PR | Secret scanning |
| `production-monitor.yml` | push/manual | Production monitoring |

---

### Environment Variables / Secrets Required

| Secret | Used By | Status |
|---|---|---|
| `VITE_SUPABASE_URL` | Frontend, pages-deploy | **Unknown if configured** |
| `VITE_SUPABASE_ANON_KEY` | Frontend, pages-deploy | **Unknown if configured** |
| `SUPABASE_ACCESS_TOKEN` | deploy.yml | **Unknown** |
| `SUPABASE_PROJECT_REF` | deploy.yml | **Unknown** |
| `PRODUCTION_DB_PASSWORD` | deploy.yml | **Unknown** |
| `greensacc_admin_username` | pages-deploy (VITE_ADMIN_USERNAME) | Set (per user input) |
| `greensacc_admin_password` | pages-deploy (VITE_ADMIN_PASSWORD) | Set (per user input) |
| `DEVIN_API_KEY` | devin workflows | **Unknown** |
| `VITE_APP_PASS` | AdminPassGate / DashboardGuard | **Unknown** |
| `RENDER_SERVICE_ID` / `RENDER_API_KEY` | deploy:prod script | **Unknown** |

---

## ✅ WHAT ACTUALLY WORKS

1. **`npm run build`** — copies all static HTML + Vite builds admin SPA into `dist/`. Confirmed passing.
2. **`npm test`** — syntax-checks all 21 edge functions + validates schema/migration string content. Confirmed passing.
3. **GitHub Pages deployment pipeline** — `pages-deploy.yml` is well-formed and deploys on push to main.
4. **Login page** — fully implemented with Supabase email/password + magic link (works if Supabase is configured).
5. **React routing** — all 20+ routes registered and guarded correctly.
6. **Static HTML pages** — `index.html`, `meeting-room.html`, `deal-room.html`, etc. are self-contained and load from CDN.
7. **RBAC schema** — `01_rbac_core.sql` is well-structured with RLS policies.
8. **Green Bubbles Defense edge function** — complete logic with safety constraints.
9. **Aegis migration** — comprehensive self-healing schema (838 lines).
10. **Gitleaks pre-commit** — configured and will block secret commits.

---

## ❌ WHAT IS BROKEN OR INCOMPLETE

### Critical
1. **Supabase not provably connected** — If `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are not set in GitHub secrets, the entire React app (auth, all DB reads, all edge function calls) fails silently with empty strings.
2. **Python backend is NOT deployed** — `backend/server.py` only runs locally via `npm start`. GitHub Pages is static-only — the `/api/system-status` endpoint, Supabase proxy, and `window.__ENV__` injection do NOT exist on the live site.
3. **Dashboard.jsx calls `{SUPABASE_URL}/functions/v1/greens-acc/api/v1/system/status`** — this endpoint lives in the Deno edge function, which requires Supabase deployment. Without it, Dashboard shows hardcoded fallback defaults.

### High
4. **Duplicate migration prefix conflict** — `01_rbac_core.sql` AND `01_rbac_init.sql` both exist. When `deploy.yml` applies `supabase/migrations/*.sql` alphabetically, both run — they define overlapping structures and will conflict.
5. **Admin credentials baked into the JS bundle** — `VITE_ADMIN_USERNAME` and `VITE_ADMIN_PASSWORD` are set as Vite env vars in `pages-deploy.yml`. These are visible to anyone who downloads the JavaScript bundle from GitHub Pages — a critical credential exposure risk.
6. **`TemporaryAccessGate` is live at `/admin`** — accepts a role name string with no credential check. Anyone who knows a valid role name can navigate to the admin dashboard route (DashboardGuard provides secondary Supabase auth, but the route is publicly accessible).

### Medium
7. **AdminDashboard reads `glitches` table** — defined in `03_aegis_self_healing.sql` but not in `schema.sql`. If migration 03 was not applied to the Supabase project, this fails.
8. **`devin-engineer.yml` and `devin-monitor.yml`** — both require `DEVIN_API_KEY`. If not set, these workflow steps fail on every push to main.
9. **`PROJECT_ORCHESTRATION.md` contains conflicting AI agent directives** — Devin is declared "On-Standby Director" while simultaneously being asked to step back. This creates confusion about which agent has authority.
10. **`01_rbac_init.sql`** — superseded by `01_rbac_core.sql` per the latter's own header comment, but both remain in the migrations folder and will both be applied.
11. **Voice page** references `speechEngine` and `intentParser` — the Web Speech API is browser-dependent and may not work in all environments.

### Low
12. **`newsWebhook.js`, `generatePressRelease.js`, `syndicateAnnouncement.js`** — marked as stub/TODO in their source.
13. **`abc.py`** — a stray Python file at root with unknown purpose.
14. **`brainstorming.md`** — loose planning document in root.

---

## 🏗️ CURRENT ARCHITECTURE

```
GitHub Pages (static)
    ├── index.html          ← public landing page (no auth)
    ├── admin.html          ← React SPA shell (→ src/main.jsx)
    │     └── React Router (HashRouter)
    │           ├── /login  ← Supabase auth
    │           ├── /       ← CommandCenter
    │           ├── /rooms  ← NegotiationRooms
    │           ├── /security ← GreenBubblesSecurity
    │           ├── /aegis  ← AegisMonitor
    │           ├── /container ← GreenContainer
    │           └── /dashboard/* ← AdminDashboard (role-gated)
    ├── meeting-room.html   ← standalone WebRTC room
    ├── deal-room.html      ← standalone deal clearance
    └── [other static pages]

Supabase Project (external — must be configured)
    ├── PostgreSQL (schema.sql + 6 migrations)
    │     ├── green_acc_deals, meeting_signals
    │     ├── profiles (RBAC), user_team_role enum
    │     ├── algorithms, glitches (Aegis)
    │     ├── threat_profiles, containment_actions (Green Bubbles)
    │     └── green_containers, agent_registry, agent_tasks (Green Container)
    ├── Auth (email + OTP)
    └── Edge Functions (23 functions, Deno runtime)
          ├── greens-acc/index.ts  ← main router
          ├── greenBubblesDefense.js
          ├── processEntryFee.js, processWithdrawal.js
          ├── createStripeCheckout.js, stripeWebhook.js
          └── [18 others]

NOT deployed (local only):
    └── backend/server.py  ← Python ThreadingHTTPServer
```

---

## 🔐 SECURITY RISKS

| Risk | Severity | Detail |
|---|---|---|
| Admin credentials in JS bundle | **CRITICAL** | `VITE_ADMIN_USERNAME` + `VITE_ADMIN_PASSWORD` baked into Vite build → visible in browser devtools and downloaded bundle |
| CORS `*` in main edge function | **HIGH** | `greens-acc/index.ts` sets `Access-Control-Allow-Origin: *` — any site can call these APIs |
| TemporaryAccessGate at /admin | **MEDIUM** | No credential check at the routing layer; relies solely on downstream DashboardGuard |
| DevGate token in localStorage | **LOW** | Token readable by any JavaScript on the same origin |
| Duplicate migrations | **MEDIUM** | Could cause DB schema corruption on next Supabase deploy |
| Devin AI has full repo write access | **MEDIUM** | `devin-engineer.yml` grants `contents: write` — Devin can push to any branch |

---

## 🚀 DEPLOYMENT STATUS

| System | Status |
|---|---|
| GitHub Pages (frontend) | ✅ Active — deploys on push to main |
| Supabase database | ⚠️ Unknown — requires secrets `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` |
| Supabase edge functions | ⚠️ Unknown — same secrets required |
| Python backend | ❌ NOT deployed — local development only |
| Render hosting | ❌ NOT configured — secrets missing |
| Devin workflows | ⚠️ Will fail if `DEVIN_API_KEY` is not set |

---

## 🎯 SAFEST EXACT FIRST IMPLEMENTATION STEP

**Verify and lock down Supabase credentials in GitHub repository secrets.**

Specifically:

1. Confirm `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set in GitHub → Settings → Secrets → Actions.
2. Remove `VITE_ADMIN_USERNAME` and `VITE_ADMIN_PASSWORD` from `pages-deploy.yml` build env — these should never be embedded in the frontend bundle. Admin auth must flow through Supabase Auth only.
3. Rename or remove `supabase/migrations/01_rbac_init.sql` to eliminate the duplicate `01_` prefix conflict before the next `db push`.

No code should be written, deployed, or restructured until those three items are resolved. Everything else in the stack depends on a working Supabase connection.
