# GREEN CONTAINER — MASTER AI REPOSITORY DIRECTIVE

## Greens ACC Unified Architecture, Automation, Security, Trust, and Agent Coordination

**PRIORITY: P0 — FOUNDATIONAL SYSTEM**

This file is the primary architectural instruction for every AI coding agent working on this repository.

Before generating, modifying, repairing, refactoring, or deploying code, read this file and inspect the existing repository.

---

## 1. DIRECTIVE TO ALL AI AGENTS

This instruction applies to all development agents connected to this project, including:

- GITHUB COPILOT
- DEVIN
- OPENAI DEVELOPMENT AGENTS
- CLAUDE DEVELOPMENT AGENTS
- GEMINI DEVELOPMENT AGENTS
- SECURITY AGENTS
- DATABASE AGENTS
- REPAIR AGENTS
- MONITORING AGENTS
- AUTOMATION AGENTS
- TESTING AGENTS
- INFRASTRUCTURE AGENTS
- FUTURE REPOSITORY AGENTS

**All agents must collaborate around one architecture.**

- Do not independently create competing systems.
- Do not duplicate existing services without first inspecting the repository.
- Do not remove working features merely to regenerate them.
- Do not expose secrets to frontend code.
- Do not bypass authorization.
- Do not give an AI agent unrestricted access to all customer information.
- Do not claim that simulated security controls are real production protection.

---

## 2. THE CENTRAL PRINCIPLE

Everything in this platform is centered around the **GREEN CONTAINER**.

The Green Container is the customer's protected personal information, document, permission, and automation vault.

```
                    CUSTOMER
                       │
          ┌────────────┼────────────┐
          │            │            │
         APP          WEB         VOICE
          │            │            │
          └────────────┼────────────┘
                       │
                       ▼
              GREEN TRUST GATEWAY
                       │
                       ▼
        ┌─────────────────────────────┐
        │       GREEN BUBBLES         │
        │                             │
        │  HONEYPOT / DECEPTION       │
        │  BEHAVIOR & TRUST           │
        │  DATA INTEGRITY             │
        │  IRON SHIELD                │
        │  CRYPTO / VALUE VAULT       │
        └──────────────┬──────────────┘
                       │
                       ▼
              ┌─────────────────┐
              │ GREEN CONTAINER │
              │                 │
              │ DOCUMENTS       │
              │ IDENTITY        │
              │ PERMISSIONS     │
              │ PREFERENCES     │
              │ AUTHORIZATIONS  │
              │ PAYMENT REFS    │
              │ AUTOMATION DATA │
              └────────┬────────┘
                       │
                       ▼
             CONSENT & POLICY ENGINE
                       │
                       ▼
               AI ORCHESTRATOR
                       │
      ┌────────────────┼────────────────┐
      │                │                │
      ▼                ▼                ▼
 TRAVEL AGENT     DOCUMENT AGENT   PAYMENT AGENT
      │                │                │
      ▼                ▼                ▼
 FORM AGENT       GROCERY AGENT    RENEWAL AGENT
      │                │                │
      ▼                ▼                ▼
 BILL AGENT       SERVICE AGENT    FUTURE AGENTS
                       │
                       ▼
              EXTERNAL CONNECTORS
                       │
                       ▼
               AUDIT + RECEIPTS
                       │
                       ▼
             AEGIS SELF-HEALING
```

---

## 3. GREEN CONTAINER PURPOSE

The Green Container is not merely file storage. It is the **trusted information foundation** of the entire platform.

It may securely reference or contain customer-authorized information such as:

- PASSPORT INFORMATION
- IDENTITY DOCUMENTS
- DRIVER LICENSE INFORMATION
- ADDRESS INFORMATION
- TRAVEL INFORMATION
- VEHICLE RECORDS
- REAL-ESTATE DOCUMENTS
- CONTRACTS / INVOICES / FINANCIAL DOCUMENTS
- BILLING INFORMATION / AUTHORIZED PAYMENT REFERENCES
- HOUSEHOLD PREFERENCES / GROCERY PREFERENCES / TRAVEL PREFERENCES
- CUSTOMER-SPECIFIC AUTOMATION SETTINGS

### Security Domains (Vaults)

Sensitive categories must remain separated by security domain:

| Vault | Contents |
|---|---|
| IDENTITY VAULT | Passport, driver license, government ID |
| DOCUMENT VAULT | Contracts, invoices, real-estate documents |
| FINANCIAL AUTHORIZATION VAULT | Payment references, billing authorization |
| TRAVEL PROFILE | Travel preferences, frequent flyer, visa records |
| HOUSEHOLD PROFILE | Grocery preferences, household settings |
| OPTIONAL WELLNESS PROFILE | Explicitly opt-in only |
| BUSINESS PROFILE | Business documents, tax records |

> An agent authorized for grocery shopping must not automatically receive passport access.
> A travel agent must not automatically receive unrestricted financial information.
> Use **minimum necessary access**.

---

## 4. GREEN CONTAINER DATA OWNERSHIP

The customer remains the authority over customer data.

Every important data operation must support:

- **CONSENT** — the customer agreed
- **PURPOSE** — the stated reason for access
- **SCOPE** — which data fields are included
- **EXPIRATION** — how long the authorization lasts
- **REVOCATION** — the customer can withdraw at any time
- **AUDITABILITY** — every access is recorded

### Permission Model

```
WHO
+ CAN DO WHAT
+ WITH WHICH DATA
+ FOR WHICH PURPOSE
+ FOR HOW LONG
+ UNDER WHICH LIMITS
```

**Example:**

| Field | Value |
|---|---|
| AGENT | travel-agent |
| PERMISSION | read |
| DATA | passport_identity_fields |
| PURPOSE | prepare_travel_booking |
| EXPIRATION | 30 minutes |
| LIMIT | no unrelated document access |

---

## 5. CONSENT AND AUTHORIZATION ENGINE

One central **GREEN CONSENT & AUTHORIZATION ENGINE**. No AI agent may bypass it.

Every agent request must pass through:

```
IDENTITY CHECK → SESSION CHECK → PERMISSION CHECK → PURPOSE CHECK
      → RISK CHECK → ACTION LIMIT CHECK
      → ALLOW / CHALLENGE / DENY / REQUIRE APPROVAL
```

Every authorization decision must be recorded.

---

## 6. AUTOMATION LEVELS

| Level | Name | Examples | Authorization |
|---|---|---|---|
| 1 | INFORMATION | Search, compare, summarize, prepare form without submitting | Automatic when authorized |
| 2 | PREPARATION | Fill form, prepare shopping cart, prepare itinerary | Automatic when authorized |
| 3 | AUTHORIZED TRANSACTION | Buy groceries (within limit), book approved trip, pay bill | Requires explicit authorization or bounded rule |
| 4 | HIGH-RISK ACTION | Large payment, legal submission, identity-critical change, government application | Requires stronger verification; AI must not bypass |

---

## 7. VOICE AUTOMATION

```
VOICE INPUT → SPEECH PROCESSING → INTENT EXTRACTION
    → CUSTOMER IDENTITY CONTEXT → CONSENT ENGINE → RISK ENGINE
    → AGENT → CONFIRMATION (when required) → ACTION
```

Voice must not be the sole authorization mechanism for high-risk actions.

---

## 8. TRAVEL AUTOMATION

**GREEN TRAVEL AGENT** responsibilities:
- Search travel options, compare price/schedule/connections
- Prepare itineraries using authorized travel profile
- Prepare and (after authorization) complete booking
- Store receipts and confirmations
- Never expose the full Green Container to travel providers

---

## 9. GOVERNMENT AND FORM ASSISTANCE

**GREEN FORM ASSISTANT** purpose:
- Help customers understand required information
- Prepare forms using authorized customer data
- Reduce repetitive data entry
- Generate printable documents
- Track application requirements

The system must distinguish:
1. PREPARING a form
2. SUBMITTING a form
3. PAYING a government fee

These are **separate authorization events**. Do not attempt to bypass CAPTCHA, identity verification, or government security controls.

---

## 10. GROCERY AND HOUSEHOLD AUTOMATION

**GREEN HOUSEHOLD AGENT** functions:
- Recognize repeated purchase patterns
- Maintain customer-approved shopping preferences
- Prepare shopping lists and compare available options
- Order within customer-defined limits
- Track receipts and learn from customer corrections

Example authorization bounds: monthly grocery limit, per-order limit, approved stores, approved product substitutions.

> Lifestyle/wellness analysis must be **explicitly opt-in** and stored separately from identity documents.

---

## 11. BILL AND RENEWAL AUTOMATION

**GREEN BILL AGENT** / **GREEN RENEWAL AGENT** responsibilities:
- Remind, prepare, compare, verify due dates
- Check customer authorization before initiating any payment
- Save receipts and update status
- **Never expose raw payment credentials to AI prompts** — use provider tokens only

---

## 12. GREEN BUBBLES SECURITY LAYER

Every route toward the Green Container must pass through the defensive architecture.

| Bubble | Security Responsibility |
|---|---|
| HONEYPOT / DECEPTION | Detect suspicious interaction, isolate decoy services, collect telemetry |
| BEHAVIOR & TRUST | Session analysis, risk scoring, trust confidence |
| DATA INTEGRITY | Document hashes, database relationships, backup verification |
| IRON SHIELD | Rate limiting, authorization enforcement, session isolation, quarantine |
| CRYPTO & HIGH-VALUE | Payment protection, escrow, cryptographic key management |

> Do not claim that a visual dashboard bubble alone provides security. Every bubble must map to actual measurable controls.

---

## 13–17. BUBBLE DETAILS

See the full system directive (problem statement) for per-bubble technical requirements.

Key rules:
- Honeypots must remain **isolated** from production database, real customer documents, and payment credentials
- Behavior scoring must produce: risk score + confidence + reason codes + recommended action
- When integrity fails: detect → lock/quarantine → create glitch → create repair case → AEGIS repair → verify
- Iron Shield must implement actual rate limiting, authorization enforcement, and session isolation — not just a label
- No private keys in frontend. No service role key in frontend. No payment secret in AI prompts.

---

## 18. AEGIS SELF-HEALING

Aegis connects monitoring to automatic repair for **approved operational problems**:
- Failed workers, stale caches, broken non-critical connections
- Failed health checks, retryable connector failures, queue/replication issues

Aegis must **not** guess how to repair sensitive customer documents. Critical data problems require: **Preserve → Lock → Quarantine → Verify Recovery Source → Audit**.

---

## 19. AI AGENT ORCHESTRATOR

One central orchestrator. Each agent:

| Agent | Responsibility |
|---|---|
| green-orchestrator | Central dispatch |
| green-container-agent | Container read/write under consent |
| green-trust-agent | Trust scoring |
| green-security-agent | Security event handling |
| green-integrity-agent | Data integrity checks |
| green-repair-agent | Aegis-guided repairs |
| green-travel-agent | Travel search and booking |
| green-form-agent | Form preparation |
| green-payment-agent | Payment authorization |
| green-grocery-agent | Household/grocery ordering |
| green-renewal-agent | Bill and renewal reminders |
| green-audit-agent | Audit trail maintenance |
| green-report-agent | Daily report generation |

---

## 20. AGENT ACCESS TOKENS

No permanent unrestricted access. Use short-lived scoped authorization:

```
AGENT: green-travel-agent
CUSTOMER: customer_uuid
PURPOSE: flight_booking
ALLOWED DATA: name, date_of_birth, passport_required_fields, travel_preferences
ALLOWED ACTION: prepare_booking
EXPIRES: short duration (e.g. 30 minutes)
```

Record every access.

---

## 21. EXTERNAL CONNECTOR LAYER

Each connector must define: service, authentication method, allowed actions, data required, rate limit, timeout, retry policy, audit policy, failure policy.

Do not build automation that bypasses third-party security controls or terms.

---

## 22. AUDIT SYSTEM

Every sensitive action creates an audit record including: who requested, which agent acted, what data category, why, which permission authorized it, what external service was used, what action occurred, whether it succeeded, when, and whether customer confirmation was required.

Never put unnecessary raw sensitive documents into ordinary application logs.

---

## 23. GREEN CONTAINER DATABASE DOMAINS

Required tables (search existing schema before creating):

```
green_containers                 — master container per customer
green_container_objects          — individual stored items/vaults
green_container_permissions      — permission grants per object
green_container_consents         — consent records with purpose/scope/expiry
green_container_events           — lifecycle events
green_container_access_log       — every access record
green_container_integrity_checks — hash verification records
container_bubble_links           — links to security bubble events
container_repair_links           — links to Aegis repairs
agent_registry                   — registered agents and their capabilities
agent_permissions                — scoped permissions per agent+customer
agent_tasks                      — task queue
agent_actions                    — action log
automation_rules                 — customer-configured automation bounds
automation_approvals             — customer approvals for automation actions
external_connectors              — registered external service connectors
connector_actions                — connector execution log
payment_authorizations           — payment authorization tokens (never raw credentials)
voice_auth_registry              — voice session authorization records
trust_decisions                  — trust engine decisions
security_events                  — security incident records
algorithms                       — (exists in Aegis migration)
glitches                         — (exists in Aegis migration)
repairs                          — (exists in Aegis migration)
daily_security_reports           — (exists in Green Bubbles migration)
```

> **Before creating a table: search the existing schema first. Reuse or migrate existing structures where appropriate.**

---

## 24. DATA STORAGE RULE

| Storage Type | Contents |
|---|---|
| DATABASE | Metadata + relationships + authorization + audit |
| PRIVATE OBJECT STORAGE | Encrypted documents and files |
| SECRET MANAGER / KMS | Keys and secrets |

Never store production secrets in Git.

---

## 25. DASHBOARD REQUIREMENTS

**Admin dashboard must show:** Green Container health, Green Bubbles security, active automations, agent activity, trust decisions, container access, integrity checks, security incidents, Aegis repairs, external connector health, payment authorizations, daily reports.

**Customer dashboard must show:** My documents, my permissions, my automations, my connected services, my recent activity, my approval requests, my security, revoke access.

---

## 26. CUSTOMER CONTROL

The customer must be able to: see stored data categories, see connected services, see agent access, see automation rules, revoke permissions, disable automation, review important actions, remove/archive data, and see security activity.

---

## 27. FUTURE MEETING AND CLOSING ROOMS

The architecture must support future secure meeting rooms, deal rooms, closing rooms, document exchange, verification workflows, and escrow workflows — all using the same Green Container, Consent Engine, Trust Engine, Green Bubbles, Aegis, and Audit System.

Do not build a separate incompatible security architecture.

---

## 28. REQUIRED REPOSITORY STRUCTURE

```
/docs
    GREEN_CONTAINER_MASTER_AI_DIRECTIVE.md   ← this file

/database
    migrations/

/backend
    /green_container
    /agents
    /auth
    /consent
    /trust
    /security
    /aegis
    /connectors
    /audit

/frontend
    /components
    /pages
    /services

/tests
    /security
    /permissions
    /containers
    /agents
    /connectors
    /repairs
```

---

## 29. IMPLEMENTATION ORDER

All AI agents must follow this order:

1. INSPECT REPOSITORY
2. MAP EXISTING CODE
3. MAP EXISTING DATABASE
4. IDENTIFY DUPLICATION
5. CREATE MIGRATION PLAN
6. **SECURE GREEN CONTAINER** ← Phase 1 (current)
7. BUILD CONSENT ENGINE ← Phase 2
8. BUILD AGENT PERMISSIONS ← Phase 2
9. CONNECT GREEN BUBBLES ← Phase 3
10. CONNECT AEGIS ← Phase 3
11. BUILD AGENT ORCHESTRATOR ← Phase 4
12. BUILD CONNECTORS ← Phase 5
13. BUILD DASHBOARD ← Phase 6
14. BUILD AUDIT SYSTEM ← Phase 6
15. TEST ← Ongoing
16. SECURITY REVIEW ← Ongoing
17. DOCUMENT ACTUAL CAPABILITIES
18. DEPLOY IN STAGES

---

## 30. AGENT COLLABORATION RULE

Before changing shared architecture, an agent must:

1. Read this file
2. Inspect current implementation
3. Identify affected components
4. Preserve compatibility
5. Use migrations
6. Add tests
7. Document the change

Every major AI-generated change should state: **What changed, Why, Files changed, Database changes, Security impact, Tests added, Rollback method, Remaining limitations.**

---

## 31. SECURITY NON-NEGOTIABLES

- NO universal "ALLOW ALL" production RLS policy
- NO service role key in frontend
- NO database password in GitHub
- NO private crypto key in frontend
- NO raw payment secret in AI prompts
- NO unrestricted agent access
- NO raw biometric data in normal logs
- NO suspicious file execution on production
- NO automatic deletion of forensic evidence
- NO claim of perfect security
- NO AI-generated production shell command execution without control
- NO high-risk action without required authorization

---

## 32. CORE PRODUCT PRINCIPLE

> The Green Container should make repeated customer tasks easier without repeatedly asking the customer to manually enter the same information.

1. Customer provides information once
2. Customer controls permission
3. Green Container protects information
4. Authorized agents use only necessary data
5. Automation saves customer time
6. Important actions remain auditable
7. Green Bubbles protect the access path
8. Aegis monitors system health
9. Customer can see and control activity

---

## 33. FINAL DIRECTIVE

The Green Container is the center of Greens ACC. Build it as:

- A SECURE PERSONAL DATA VAULT
- A PERMISSION SYSTEM
- A CONSENT SYSTEM
- AN AUTOMATION FOUNDATION
- AN AI AGENT DATA GATEWAY
- A TRUST SYSTEM
- AN AUDITABLE SERVICE PLATFORM

Surround it with **GREEN BUBBLES**. Monitor and repair with **AEGIS**. Control all AI access through:

```
CONSENT + PURPOSE + MINIMUM NECESSARY ACCESS + SHORT-LIVED AUTHORIZATION + AUDIT
```

### Final Architecture

```
GREEN BUBBLES
        ↓
GREEN CONTAINER
        ↓
CONSENT & AUTHORIZATION
        ↓
AI ORCHESTRATOR
        ↓
SPECIALIZED AGENTS
        ↓
AUTHORIZED EXTERNAL SERVICES
        ↓
AUDIT + RECEIPTS
        ↓
AEGIS MONITORING & REPAIR
```

---

## REPOSITORY SCAN STATUS (Last Updated: 2026-07-12)

### REAL / WORKING
| Component | Location | Notes |
|---|---|---|
| Deal lifecycle tables | supabase/schema.sql | green_acc_deals, marketplace_listings, api_tokens, etc. |
| RBAC + RLS | migrations/01_rbac_core.sql | profiles table, role enum, 4 RLS policies |
| Aegis self-healing tables | migrations/03_aegis_self_healing.sql | algorithms, glitches, repairs, events, metrics |
| Green Bubbles tables | migrations/04_green_bubbles_defense.sql | threat_profiles, containment_actions, security_decisions |
| Green Bubbles edge function | supabase/functions/greenBubblesDefense.js | Real two-path logic, policy engine, capacity limits |
| Stripe payments | supabase/functions/createStripeCheckout.js | Entry fee + deal payments |
| React frontend | src/App.jsx | 5 routes: /, /rooms, /analytics, /dashboard, /security |
| Admin gate | src/components/DashboardGuard.jsx | VITE_APP_PASS protected |

### PARTIAL / MOCKED
| Component | Location | Issue |
|---|---|---|
| Waiting areas / green rooms | supabase/functions/greens-acc/index.ts | In-memory Map — state lost on cold start |
| Dashboard metrics | src/pages/Dashboard.jsx | Reads from ephemeral in-memory edge function |

### MISSING (Phase 1–6 to implement)
| Component | Phase | Priority |
|---|---|---|
| green_containers table | Phase 1 | P0 |
| green_container_objects | Phase 1 | P0 |
| green_container_permissions | Phase 1 | P0 |
| green_container_consents | Phase 2 | P0 |
| agent_registry | Phase 2 | P0 |
| agent_permissions | Phase 2 | P0 |
| trust_decisions | Phase 2 | P1 |
| payment_authorizations | Phase 2 | P1 |
| external_connectors | Phase 3 | P1 |
| Agent orchestrator | Phase 4 | P1 |
| Travel / Form / Grocery agents | Phase 5 | P2 |
| Customer control panel UI | Phase 6 | P2 |

---

*This directive was generated by Copilot AI agent after repository scan on 2026-07-12.*
*All future agents: update the REPOSITORY SCAN STATUS section when you complete a phase.*
