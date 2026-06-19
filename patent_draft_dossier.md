# GreenACC Platform — Patent Draft Dossier

**Document Classification:** Intellectual Property Technical Specification  
**Revision:** 1.0  
**Date:** 2026-06-19  
**Repository:** altrmaze/greens-acc.com  
**Domain:** greens-acc.com  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Edge Function API Routing](#4-edge-function-api-routing)
5. [Complete Relational Database Schema](#5-complete-relational-database-schema)
6. [Data Flow Maps](#6-data-flow-maps)
7. [Encryption & Security Architecture](#7-encryption--security-architecture)
8. [State Management Logic](#8-state-management-logic)
9. [AI Agent Verification System](#9-ai-agent-verification-system)
10. [Payment & Escrow Lifecycle](#10-payment--escrow-lifecycle)
11. [Real-Time Compliance Engine](#11-real-time-compliance-engine)
12. [Meeting Room & WebRTC Architecture](#12-meeting-room--webrtc-architecture)
13. [Press Release & Syndication Engine](#13-press-release--syndication-engine)
14. [Code Audit & Repair Summary](#14-code-audit--repair-summary)
15. [Naming & Prefixing Standards](#15-naming--prefixing-standards)
16. [Novel Claims for Patent Consideration](#16-novel-claims-for-patent-consideration)

---

## 1. Executive Summary

GreenACC is a B2B international trade facilitation platform combining:

- **AI-monitored escrow** with triple-agent verification before any fund release
- **Real-time OFAC/sanctions compliance** screening during live meetings
- **Encrypted instant meeting rooms** with WebRTC peer-to-peer video/audio
- **Letter of Credit (L/C) management** integrated with handshake workflows
- **Press release and syndication automation** on deal completion
- **Global news risk interception** that can halt handshake proceedings

The platform is deployed as a static HTML/JS frontend served from `dist/` with a Supabase backend providing PostgreSQL persistence, real-time subscriptions (Supabase Realtime), and serverless edge functions.

**Fee Structure:**
- Flat $20.00 USD activation/entry fee per deal (paid via Stripe)
- 2% commission on deal amount, locked in escrow until AI verification clears
- $20.00 session fee per instant meeting room (24-hour expiry)

---

## 2. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                           │
│  index.html  ·  meeting.html  ·  announce.html  ·  meeting.js   │
│         Tailwind CSS · Supabase JS SDK · SimplePeer             │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS / Supabase Realtime WS
┌────────────────────────▼────────────────────────────────────────┐
│                    SUPABASE EDGE LAYER                          │
│   13 serverless edge functions (Node.js ESM export async POST)  │
│   Auth: SUPABASE_SERVICE_ROLE_KEY  ·  STRIPE_SECRET_KEY         │
└──────┬──────────────────────────────────────────┬───────────────┘
       │ PostgreSQL REST API                       │ Stripe API
┌──────▼──────────────────┐             ┌──────────▼──────────────┐
│   SUPABASE POSTGRESQL   │             │       STRIPE             │
│  8 tables · indexes     │             │  Checkout Sessions       │
│  triggers/constraints   │             │  Webhooks                │
└─────────────────────────┘             └─────────────────────────┘
```

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, Tailwind CSS (CDN), vanilla JavaScript (ESM) |
| Real-time | Supabase Realtime (WebSocket, postgres_changes) |
| Video/Audio | WebRTC via SimplePeer library |
| Backend Functions | Supabase Edge Functions (Node.js ESM) |
| Database | PostgreSQL (Supabase hosted) with pgcrypto extension |
| Payments | Stripe Checkout + Webhooks |
| AI Analysis | Heuristic rules engine (production: pluggable LLM) |
| Deployment | Static files in `dist/`; Python HTTP server for local dev |

---

## 3. Frontend Architecture

### Pages

| File | Purpose |
|---|---|
| `index.html` | Main landing page: deal creation, handshake, status dashboard, features |
| `meeting.html` | Meeting suite UI: video grid, chat, AI panel, document bridge |
| `announce.html` | Deal announcement / press release generation UI |
| `success.html` | Stripe checkout success landing page |
| `cancel.html` | Stripe checkout cancel landing page |

### Key Client-Side Modules (`meeting.js`)

| Function | Responsibility |
|---|---|
| `initSupabase()` | Bootstrap Supabase JS client from `window.SUPABASE_CONFIG` |
| `initNewsAndRisk()` | Fetch global news, subscribe to `global_news` and `global_risk_flags` via Realtime |
| `renderTicker()` | Render scrolling news ticker from `global_news` records |
| `prependTickerItem()` | Live-prepend incoming news items to ticker DOM |
| `handleRiskFlag()` | Activate emergency modal; block handshake if risk flag is active |
| `clearRisk()` | Dismiss risk alert and re-enable handshake flow |
| `showEmergencyModal()` / `hideEmergencyModal()` | DOM modal control for critical global events |
| `checkGlobalRiskBeforeHandshake()` | Query `global_risk_flags` for active flags before allowing handshake |
| `subscribeToSignals()` | Subscribe to `meeting_signals` table for WebRTC signaling |
| `createSignal()` | Insert a WebRTC offer/answer/candidate into `meeting_signals` |
| `fetchRooms()` | Populate static 10-room demo grid |
| `selectRoom()` | Set `activeRoom` state and update UI |
| `joinRoom()` | `getUserMedia` → create SimplePeer initiator → subscribe to signals |
| `handleIncomingSignal()` | Create or retrieve SimplePeer for incoming sender; relay signal data |
| `leaveRoom()` | Stop all media tracks; clear video grid |
| `appendChat()` | XSS-safe DOM append to chat log |
| `escapeHtml()` | String sanitiser: escapes `&`, `<`, `>` |
| `sendMessage()` | Append chat + call `postAiEvent` |
| `postAiEvent()` | POST to `/supabase/functions/aiAgentAnalyze` and render returned insights |
| `showAiInsight()` | Prepend insight card to AI panel |
| `uploadFile()` | Trigger file upload placeholder + `postAiEvent` with filename |
| `generateInstantRoom()` | POST to `generateInstantRoom` edge function; display shareable link |
| `registerDocument()` | POST to `documentBridge` to register a document reference |

### Global Event Bus (CustomEvents)

| Event | Direction | Description |
|---|---|---|
| `attemptHandshake` | Dispatch → window | Signals intent to confirm handshake |
| `handshakeBlocked` | window → listeners | Fired if active risk flag prevents handshake |
| `handshakeAllowed` | window → listeners | Fired if handshake may proceed |
| `handshakeHalted` | window → listeners | Fired when user explicitly halts due to risk |

---

## 4. Edge Function API Routing

All functions are deployed as Supabase Edge Functions. The local function host is `/supabase/functions`. Each function exports a single `async function POST(request)`.

### Function Registry

| File | Endpoint Path | Auth Required | External APIs |
|---|---|---|---|
| `processEntryFee.js` | `/processEntryFee` | Service role key | Supabase REST |
| `createHandshakeSession.js` | `/createHandshakeSession` | Service role key | Supabase REST |
| `createStripeCheckout.js` | `/createStripeCheckout` | Service role key | Stripe + Supabase REST |
| `stripeWebhook.js` | `/stripeWebhook` | Stripe webhook signature | Stripe + Supabase REST |
| `processWithdrawal.js` | `/processWithdrawal` | Service role key | Supabase REST |
| `aiAgentAnalyze.js` | `/aiAgentAnalyze` | None (open) | None |
| `newsWebhook.js` | `/newsWebhook` | Service role key | Supabase REST |
| `generatePressRelease.js` | `/generatePressRelease` | Service role key | Supabase REST |
| `syndicateAnnouncement.js` | `/syndicateAnnouncement` | Service role key | Supabase REST + Mock syndication targets |
| `generateInstantRoom.js` | `/generateInstantRoom` | Service role key | Supabase REST |
| `documentBridge.js` | `/documentBridge` | Service role key | Supabase REST |
| `aiSecretaryTools.js` | `/aiSecretaryTools` | Service role key | Supabase REST |
| `aiComplianceLawyer.js` | `/aiComplianceLawyer` | Service role key | Supabase REST |

### Environment Variables

| Variable | Used By |
|---|---|
| `SUPABASE_URL` | All 13 functions |
| `SUPABASE_SERVICE_ROLE_KEY` | All 13 functions |
| `STRIPE_SECRET_KEY` | `createStripeCheckout`, `stripeWebhook` |

---

## 5. Complete Relational Database Schema

PostgreSQL extension: `pgcrypto` (provides `gen_random_uuid()`).

---

### Table: `public.green_acc_deals`

Primary table for B2B deal lifecycle tracking.

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | Unique deal identifier |
| `created_at` | `timestamptz` | `now()` | NOT NULL | Deal creation timestamp |
| `buyer_id` | `uuid` | — | — | Buyer/payer reference |
| `seller_id` | `uuid` | — | — | Seller reference |
| `region` | `text` | `'US'` | NOT NULL | Trade region code (US, EU, APAC, ME, LATAM, AFRICA) |
| `currency` | `text` | `'USD'` | NOT NULL | Deal currency |
| `amount_total` | `numeric(12,2)` | `0.00` | NOT NULL | Total deal amount |
| `entry_fee_amount` | `numeric(12,2)` | `20.00` | NOT NULL | Flat activation fee (always $20.00) |
| `entry_fee_status` | `text` | `'pending'` | NOT NULL, CHECK | One of: `pending`, `paid`, `verified`, `refunded` |
| `handshake_commission_rate` | `numeric(5,4)` | `0.02` | NOT NULL | Commission rate (2%) |
| `handshake_commission_amount` | `numeric(12,2)` | GENERATED | STORED | `round(amount_total * rate, 2)` — computed column |
| `lc_reference_number` | `text` | — | — | Letter of Credit reference |
| `handshake_status` | `text` | `'pending'` | NOT NULL, CHECK | One of: `pending`, `confirmed`, `rejected` |
| `escrow_status` | `text` | `'locked'` | NOT NULL, CHECK | One of: `locked`, `released`, `pending`, `cancelled` |
| `funds_locked` | `boolean` | `true` | NOT NULL | True until AI verification and compliance clear |
| `compliance_status` | `text` | `'pending'` | NOT NULL, CHECK | One of: `pending`, `verified`, `failed` |
| `safe_withdrawal_ready` | `boolean` | `false` | NOT NULL | True when all gates passed and withdrawal is safe |
| `withdrawal_triggered` | `boolean` | `false` | NOT NULL | True when withdrawal has been triggered |
| `ai_agent_status` | `jsonb` | `{"agent1":"pending","agent2":"pending","agent3":"pending"}` | NOT NULL | Per-agent verification state |
| `last_updated` | `timestamptz` | `now()` | NOT NULL | Last modification timestamp |

**Indexes:**
- `idx_green_acc_deals_lc_reference_number` on `(lc_reference_number)`
- `idx_green_acc_deals_buyer_id` on `(buyer_id)`
- `idx_green_acc_deals_seller_id` on `(seller_id)`

---

### Table: `public.meeting_signals`

WebRTC signaling table. Used by Supabase Realtime to relay offer/answer/ICE candidates between peers.

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | Signal record ID |
| `room_id` | `text` | — | NOT NULL | Meeting room identifier |
| `sender_id` | `text` | — | NOT NULL | UUID of the sending client |
| `target_id` | `text` | — | — | UUID of target client (null = broadcast) |
| `signal_type` | `text` | — | NOT NULL | One of: `offer`, `answer`, `candidate` |
| `signal_data` | `jsonb` | — | NOT NULL | WebRTC signal payload |
| `created_at` | `timestamptz` | `now()` | NOT NULL | Signal creation time |

**Indexes:**
- `idx_meeting_signals_room_id` on `(room_id)`

---

### Table: `public.global_news`

Emergency news feed for the global risk interception system.

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | News record ID |
| `source` | `text` | — | — | News source identifier |
| `title` | `text` | — | — | News headline |
| `summary` | `text` | — | — | News summary body |
| `category` | `text` | — | — | Category (e.g. `tariff`, `conflict`, `general`) |
| `severity` | `text` | — | — | Severity level (`low`, `high`, `critical`) |
| `metadata` | `jsonb` | — | — | Additional structured metadata |
| `created_at` | `timestamptz` | `now()` | NOT NULL | Ingestion timestamp |

**Indexes:**
- `idx_global_news_created_at` on `(created_at)`

---

### Table: `public.global_risk_flags`

Active risk flags derived from global news, used to gate handshake operations.

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | Flag record ID |
| `news_id` | `uuid` | — | REFERENCES `global_news(id)` ON DELETE SET NULL | Source news record |
| `scope` | `text` | `'global'` | NOT NULL | Risk scope (`global` or room-specific) |
| `active` | `boolean` | `true` | NOT NULL | Whether this flag is currently active |
| `reason` | `text` | — | — | Human-readable reason |
| `created_at` | `timestamptz` | `now()` | NOT NULL | Flag creation time |

**Indexes:**
- `idx_global_risk_flags_scope` on `(scope)`

---

### Table: `public.deal_announcements`

Press release records and syndication tracking for completed deals.

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | Announcement ID |
| `deal_id` | `uuid` | — | NOT NULL | Reference to `green_acc_deals.id` |
| `press_release` | `text` | — | — | Full press release text |
| `social_posts` | `jsonb` | — | — | LinkedIn, Twitter/X, corporate post variants |
| `syndication_status` | `text` | `'draft'` | NOT NULL | One of: `draft`, `preview`, `published`, `failed` |
| `syndication_metadata` | `jsonb` | — | — | Per-target syndication results (status, URL, timestamp) |
| `published_at` | `timestamptz` | — | — | Timestamp of publication |
| `created_at` | `timestamptz` | `now()` | NOT NULL | Record creation time |

**Indexes:**
- `idx_deal_announcements_deal_id` on `(deal_id)`
- `idx_deal_announcements_status` on `(syndication_status)`

---

### Table: `public.instant_rooms`

Encrypted meeting rooms with 24-hour expiry and session fee tracking.

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | Room UUID |
| `room_token` | `text` | — | NOT NULL UNIQUE | 32-hex-char cryptographic access token |
| `room_name` | `text` | — | — | Human-readable room name (`company-token8chars`) |
| `creator_company` | `text` | — | — | Creating company name |
| `participant_company` | `text` | — | — | Invited participant company |
| `encryption_key` | `text` | — | — | AES-256 key material (64 hex chars = 32 bytes) |
| `session_fee_status` | `text` | `'pending'` | NOT NULL | One of: `pending`, `paid`, `expired` |
| `created_at` | `timestamptz` | `now()` | NOT NULL | Room creation time |
| `expires_at` | `timestamptz` | `now() + interval '24 hours'` | NOT NULL | Auto-expiry timestamp |
| `is_active` | `boolean` | `true` | NOT NULL | Whether room is currently active |

**Indexes:**
- `idx_instant_rooms_token` on `(room_token)`
- `idx_instant_rooms_active` on `(is_active)`

---

### Table: `public.document_references`

Pointers to external documents; files are never stored on GreenACC servers.

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | Document reference ID |
| `room_id` | `uuid` | — | REFERENCES `instant_rooms(id)` ON DELETE CASCADE | Associated room |
| `document_name` | `text` | — | — | File name or document title |
| `document_type` | `text` | — | — | One of: `pdf`, `docx`, `spreadsheet`, `contract`, `blueprint`, `legal`, `compliance` |
| `source_url` | `text` | — | — | External URL (Google Drive, OneDrive, Dropbox, etc.) |
| `oauth_provider` | `text` | — | — | OAuth provider (`gdrive`, `onedrive`, etc.) |
| `encryption_metadata` | `jsonb` | — | — | AES-256-GCM cipher info, streaming flag, server_stored=false |
| `uploaded_by` | `text` | — | — | Uploading client ID |
| `created_at` | `timestamptz` | `now()` | NOT NULL | Upload time |

**Indexes:**
- `idx_document_references_room` on `(room_id)`

---

### Table: `public.compliance_logs`

Audit trail of all compliance violations detected by the AI Compliance Lawyer.

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | Log entry ID |
| `room_id` | `uuid` | — | REFERENCES `instant_rooms(id)` ON DELETE CASCADE | Associated room |
| `violation_type` | `text` | — | — | One of: `sanction_violation`, `entity_sanction`, `illegal_commodity`, `export_control_violation`, `tariff_bypass` |
| `severity` | `text` | `'warning'` | NOT NULL | One of: `warning`, `critical`, `kill_switch` |
| `description` | `text` | — | — | Human-readable violation description |
| `detected_content` | `text` | — | — | Exact content that triggered the rule |
| `legal_citation` | `text` | — | — | Relevant legal reference (OFAC, EAR, ITAR, etc.) |
| `ai_recommendation` | `text` | — | — | AI-generated remediation recommendation |
| `is_resolved` | `boolean` | `false` | NOT NULL | Resolution status |
| `created_at` | `timestamptz` | `now()` | NOT NULL | Detection timestamp |

**Indexes:**
- `idx_compliance_logs_room` on `(room_id)`
- `idx_compliance_logs_severity` on `(severity)`

---

### Table: `public.room_sessions`

Tracks live session state per room, including compliance status and kill-switch state.

| Column | Type | Default | Constraints | Description |
|---|---|---|---|---|
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | Session ID |
| `room_id` | `uuid` | — | REFERENCES `instant_rooms(id)` ON DELETE CASCADE | Associated room |
| `session_status` | `text` | `'active'` | NOT NULL | One of: `active`, `suspended`, `killed`, `completed` |
| `compliance_flags` | `jsonb` | — | — | Active compliance flag map |
| `kill_switch_triggered` | `boolean` | `false` | NOT NULL | Whether kill switch has fired |
| `kill_switch_reason` | `text` | — | — | Reason for kill switch activation |
| `handshake_allowed` | `boolean` | `true` | NOT NULL | Whether handshake is permitted in this session |
| `payment_allowed` | `boolean` | `true` | NOT NULL | Whether payment is permitted in this session |
| `last_ai_check` | `timestamptz` | — | — | Timestamp of most recent AI compliance scan |
| `created_at` | `timestamptz` | `now()` | NOT NULL | Session creation time |

**Indexes:**
- `idx_room_sessions_status` on `(session_status)`

---

### Schema Foreign Key Relationships

```
global_risk_flags.news_id  →  global_news.id  (ON DELETE SET NULL)
document_references.room_id  →  instant_rooms.id  (ON DELETE CASCADE)
compliance_logs.room_id  →  instant_rooms.id  (ON DELETE CASCADE)
room_sessions.room_id  →  instant_rooms.id  (ON DELETE CASCADE)
```

*(Note: `deal_announcements.deal_id` references `green_acc_deals.id` by convention but without a formal FK constraint in schema v1.)*

---

## 6. Data Flow Maps

### 6.1 Deal Creation & Entry Fee Flow

```
Client (index.html)
  │
  ├─ [1] POST /supabase/functions/createStripeCheckout
  │       Body: { deal_id, payer_id, amount, base_url }
  │       → Creates Stripe Checkout Session (payment_method_types: ['card'])
  │       → Stores metadata: { deal_id, payer_id, entry_fee: '20.00' } on Stripe session
  │       → On Stripe success: PATCH green_acc_deals SET entry_fee_status='paid'
  │       ← Returns { session_url }
  │
  ├─ [2] User completes Stripe payment → redirected to /success.html
  │
  ├─ [3] Stripe sends webhook → POST /supabase/functions/stripeWebhook
  │       Event type: checkout.session.completed
  │       → Verifies session with Stripe API (GET /v1/checkout/sessions/{id})
  │       → If payment_status='paid': PATCH green_acc_deals SET entry_fee_status='paid'
  │       ← Returns { received: true }
  │
  └─ [4] POST /supabase/functions/processEntryFee (direct/manual path)
          Body: { deal_id, payer_id, amount: 20.00 }
          → Validates amount === 20.00 exactly
          → PATCH green_acc_deals SET entry_fee_status='paid', buyer_id=payerId
          ← Returns { message, deal }
```

### 6.2 Handshake & Escrow Lock Flow

```
Client (index.html — Handshake tab)
  │
  └─ POST /supabase/functions/createHandshakeSession
          Body: { deal_id, payer_id, amount, lc_reference_number? }
          → Validates amount > 0
          → Computes commission: round(amount * 0.02, 2)
          → PATCH green_acc_deals SET:
              handshake_status='confirmed'
              escrow_status='locked'
              funds_locked=true
              compliance_status='verified'
              entry_fee_status='paid'
              ai_agent_status={agent1:'verified', agent2:'verified', agent3:'verified'}
              lc_reference_number=...
          ← Returns { commission_amount, deal }
```

### 6.3 Withdrawal Gate Flow

```
Client
  │
  └─ POST /supabase/functions/processWithdrawal
          Body: { deal_id }
          → GET green_acc_deals WHERE id=deal_id
          → Gate 1: ai_agent_status.agent1/2/3 must all be 'verified'
          → Gate 2: entry_fee_status must be 'paid' or 'verified'
          → Gate 3: handshake_status must be 'confirmed'
          → Gate 4: compliance_status must be 'verified'
          → Gate 5: funds_locked must be true
          → PATCH green_acc_deals SET:
              escrow_status='released'
              funds_locked=false
              safe_withdrawal_ready=true
              withdrawal_triggered=true
          ← Returns { payout_amount, handshake_commission_amount, lc_reference_number, deal }
```

### 6.4 Instant Room Creation Flow

```
Client (meeting.html)
  │
  └─ POST /supabase/functions/generateInstantRoom
          Body: { creator_company }
          → Generates 32-hex room_token (crypto.getRandomValues, 16 bytes)
          → Generates 64-hex encryption_key (crypto.getRandomValues, 32 bytes)
          → room_name = "{creator_company}-{token[0:8]}"
          → INSERT instant_rooms (room_token, room_name, creator_company, encryption_key, ...)
          → INSERT room_sessions (room_id, session_status='active', handshake_allowed=true, ...)
          → share_link = "{origin}/meeting.html?room_token=...&encryption_key=...&fee_required=true"
          ← Returns { room, session, share_link, room_token, encryption_key }
```

### 6.5 Compliance Screening Flow (AI Compliance Lawyer)

```
Client or System
  │
  └─ POST /supabase/functions/aiComplianceLawyer
          Body: { room_id, conversation_text?, document_content? }
          → Concatenates all text
          → Screens against:
              restrictedRegions: [iran, syria, north korea, cuba, crimea]
              sanctionedEntities: [irgc, hamas, hezbollah, ofac]
              illegalCommodities: [weapons, explosives, narcotics, biological agents]
              exportControls: [encryption key, advanced semiconductor, military technology]
              tariffEvasion: [circumvent tariff, avoid duty, tariff evasion, misclassify shipment]
          → For each violation: INSERT compliance_logs
          → If kill switch triggered:
              GET room_sessions WHERE room_id=...
              PATCH room_sessions SET:
                  session_status='killed'
                  kill_switch_triggered=true
                  kill_switch_reason=...
                  handshake_allowed=false
                  payment_allowed=false
          ← Returns { violations, compliance_logs, kill_switch_triggered }
```

### 6.6 Global News Risk Interception Flow

```
External news source → POST /supabase/functions/newsWebhook
  Body: { source, title, summary, category, severity, metadata }
  → INSERT global_news
  → Heuristic severity check (keywords: tariff, conflict, war, sanction, canal, etc.)
  → If critical: INSERT global_risk_flags (active=true)
  ← Returns { news, flag? }

Supabase Realtime (meeting.js client):
  → Subscribes to INSERT on global_news → updates news ticker
  → Subscribes to INSERT on global_risk_flags WHERE active=true → fires handleRiskFlag()
  → handleRiskFlag() → showEmergencyModal() → posts AI mitigation request
  → window.checkGlobalRiskBeforeHandshake() → queries global_risk_flags active=true
  → If flag active: dispatches handshakeBlocked event → UI prevents handshake
```

### 6.7 WebRTC Signaling Flow

```
Peer A (Initiator)                         Peer B (Listener)
     │                                           │
     ├─ getUserMedia()                           │
     ├─ new SimplePeer({ initiator: true })      │
     ├─ peer.on('signal') →                      │
     │     createSignal(roomId, clientIdA,        │
     │       null, 'offer', signalData)           │
     │     → INSERT meeting_signals              │
     │                                           │
     │        Supabase Realtime INSERT event     │
     │           ────────────────────────────►  │
     │                                     handleIncomingSignal(rec)
     │                                     new SimplePeer({ initiator: false })
     │                                     peer.signal(data) ← apply offer
     │                                     peer.on('signal') →
     │                                       createSignal(roomId, clientIdB,
     │                                         clientIdA, 'answer', signalData)
     │                                         → INSERT meeting_signals
     │
     │  Supabase Realtime INSERT event
     │ ◄────────────────────────────────────────
     │  handleIncomingSignal(rec) → peer.signal(answer)
     │
     │◄═══════════════ Direct P2P WebRTC Stream ═══════════════►│
```

---

## 7. Encryption & Security Architecture

### 7.1 Room Token Generation

- **Algorithm:** `crypto.getRandomValues()` (Web Crypto API) over 16 bytes
- **Output:** 32 hexadecimal characters (128-bit entropy)
- **Storage:** Stored in `instant_rooms.room_token` with UNIQUE constraint
- **Transmission:** Included in shareable meeting room URL as query parameter

### 7.2 Encryption Key Generation

- **Algorithm:** `crypto.getRandomValues()` over 32 bytes
- **Output:** 64 hexadecimal characters (256-bit key material)
- **Intended Use:** AES-256-GCM key for document streaming cipher
- **Storage:** Stored in `instant_rooms.encryption_key` column

### 7.3 Document Encryption Metadata

Per `documentBridge.js`, all document references include:

```json
{
  "cipher": "AES-256-GCM",
  "is_encrypted": true,
  "encryption_algorithm": "AES-256-GCM",
  "streaming": true,
  "server_stored": false
}
```

Files are never stored on GreenACC servers — only metadata pointers (URL + OAuth provider) are stored. Access requires presenting a valid room session token.

### 7.4 API Authentication

All edge functions authenticate to Supabase using:

```
Authorization: ******
apikey: ${SUPABASE_SERVICE_ROLE_KEY}
```

Stripe API authentication:
```
Authorization: ******
```

### 7.5 XSS Prevention

The `escapeHtml()` function in `meeting.js` sanitises all user-generated content before DOM insertion:

```js
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
```

Applied to: chat messages, news ticker content, AI insight cards.

### 7.6 OFAC / Sanctions Screening

Real-time keyword matching against:
- **Restricted Regions (OFAC SDN / EU Sanctions Reg. 833/2014):** Iran, Syria, North Korea, Cuba, Crimea
- **Sanctioned Entities (OFAC SDN List):** IRGC, Hamas, Hezbollah
- **Illegal Commodities (CITES / Arms Trade Treaty):** Weapons, Explosives, Narcotics, Biological Agents
- **Export Controls (EAR / ITAR):** Encryption Key, Advanced Semiconductor, Military Technology
- **Tariff Evasion (WCO / Customs Valuation Agreement):** Circumvent Tariff, Avoid Duty, Tariff Evasion, Misclassify Shipment

Violations at `critical` severity automatically trigger the kill switch, setting `session_status='killed'`, `handshake_allowed=false`, `payment_allowed=false`.

---

## 8. State Management Logic

### 8.1 Deal State Machine

```
                     ┌──────────────────────────────┐
                     │      DEAL CREATED             │
                     │  entry_fee_status: pending    │
                     │  handshake_status: pending    │
                     │  escrow_status: locked        │
                     │  funds_locked: true           │
                     │  compliance_status: pending   │
                     └──────────────┬───────────────┘
                                    │ processEntryFee / stripeWebhook
                                    ▼
                     ┌──────────────────────────────┐
                     │   ENTRY FEE PAID              │
                     │  entry_fee_status: paid       │
                     └──────────────┬───────────────┘
                                    │ createHandshakeSession
                                    ▼
                     ┌──────────────────────────────┐
                     │   HANDSHAKE CONFIRMED         │
                     │  handshake_status: confirmed  │
                     │  escrow_status: locked        │
                     │  compliance_status: verified  │
                     │  ai_agent_status: all verified│
                     └──────────────┬───────────────┘
                                    │ processWithdrawal (all 5 gates pass)
                                    ▼
                     ┌──────────────────────────────┐
                     │   WITHDRAWAL TRIGGERED        │
                     │  escrow_status: released      │
                     │  funds_locked: false          │
                     │  safe_withdrawal_ready: true  │
                     │  withdrawal_triggered: true   │
                     └──────────────────────────────┘
```

### 8.2 Room Session State Machine

```
  CREATED  →  ACTIVE  →  SUSPENDED  →  COMPLETED
                │
                └──→  KILLED  (compliance kill switch)
```

Kill switch transition sets: `handshake_allowed=false`, `payment_allowed=false`, `kill_switch_triggered=true`.

### 8.3 AI Agent State per Deal

Each deal tracks three independent AI agent verifications:

```json
{
  "agent1": "pending | verified | failed",
  "agent2": "pending | verified | failed",
  "agent3": "pending | verified | failed"
}
```

Withdrawal is blocked unless all three agents are `"verified"`.

### 8.4 News Risk Flag State

- Flags inserted as `active: true` when critical keywords detected
- Client-side `checkGlobalRiskBeforeHandshake()` queries flags before each handshake attempt
- Risk flags can be dismissed by user (`clearRisk()` → `hideEmergencyModal()`)
- Flag deactivation (setting `active: false`) is not currently automated — requires manual DB update

---

## 9. AI Agent Verification System

### 9.1 `aiAgentAnalyze.js` — Real-Time Insights Engine

**Trigger:** Called on every chat message, room join, file upload, or risk alert  
**Input:** `{ type, room, text, metadata? }`  
**Output:** `{ room, insights[] }`

**Heuristic Rules:**

| Condition | Insight |
|---|---|
| `text.length < 40` | "Quick note: consider clarifying the key deliverable." |
| `/price\|cost\|fee\|commission/i` in text | "Finance: check commission rates and currency exposure." |
| `/contract\|lc\|letter of credit/i` in text | "Legal: ensure LC reference and bank terms are captured in the contract." |
| None matched | "Strategic: consider escalation path and fallback timeline." |

### 9.2 `aiSecretaryTools.js` — Document & Financial Analysis

**Actions:**

| Action | Input | Output |
|---|---|---|
| `summarize` | `document_text` | Word count, section count, key points, executive summary, reading time |
| `parse` | `document_text`, `query` | Matching clauses, potential weaknesses, risk level, recommended edits |
| `calculate` | `currency_pair` (e.g. `USD/EUR`) | Exchange rate, tariff estimate, trade compliance, sanctions check, shipping days |

### 9.3 `aiComplianceLawyer.js` — OFAC & Legal Screening Engine

Real-time pattern matching against five violation categories. Each violation logged to `compliance_logs`. Kill switch auto-fires on `critical` violations.

---

## 10. Payment & Escrow Lifecycle

### 10.1 Stripe Checkout Integration

1. `createStripeCheckout.js` assembles a `URLSearchParams`-encoded Stripe Checkout API call
2. `line_items`: 1 × `GreenACC Entry Fee` at `unit_amount: 2000` (= $20.00 USD)
3. Stripe `metadata`: `{ deal_id, payer_id, entry_fee: '20.00' }`
4. Success/cancel URLs constructed from `base_url` parameter
5. After Stripe session created, Supabase deal record immediately patched with `entry_fee_status='paid'`

### 10.2 Stripe Webhook Verification

`stripeWebhook.js` performs secondary verification by calling `GET /v1/checkout/sessions/{sessionId}` to confirm `payment_status === 'paid'` before updating the database. This prevents replay attacks via unverified webhook payloads.

### 10.3 Commission Calculation

```
commission_amount = round(amount_total × 0.02, 2)
payout_amount = amount_total - commission_amount
```

The `handshake_commission_amount` is also a **computed/generated column** in PostgreSQL:
```sql
generated always as (round(amount_total * handshake_commission_rate, 2)) stored
```

### 10.4 Withdrawal Gates (5-Factor Authorization)

All five must pass before `processWithdrawal` proceeds:

1. All 3 AI agents must be `'verified'`
2. `entry_fee_status` must be `'paid'` or `'verified'`
3. `handshake_status` must be `'confirmed'`
4. `compliance_status` must be `'verified'`
5. `funds_locked` must be `true` (prevents double-withdrawal)

---

## 11. Real-Time Compliance Engine

### 11.1 Global News Severity Detection (`newsWebhook.js`)

**Severe keywords triggering risk flags:**
`tariff`, `conflict`, `war`, `closure`, `blockade`, `devaluation`, `sanction`, `strike`, `supply chain`, `sank`, `sinking`, `canal`, `shortage`

Any news with severity `'high'` or `'critical'` also auto-flags regardless of keyword match.

### 11.2 Client-Side Risk Subscription

```js
supabase.channel('global_risk_flags:public')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'global_risk_flags' }, ...)
  .subscribe();
```

On INSERT with `active=true`, fires `handleRiskFlag()` → displays emergency modal → calls AI for mitigation suggestions.

### 11.3 Pre-Handshake Risk Check

Before any handshake confirmation, `window.checkGlobalRiskBeforeHandshake()` queries:
```sql
SELECT * FROM global_risk_flags WHERE active = true LIMIT 1
```
If any flag is active, `handshakeBlocked` event is dispatched, preventing the handshake API call.

---

## 12. Meeting Room & WebRTC Architecture

### 12.1 Room Configuration

- Static demo rooms: 10 rooms (`room-1` through `room-10`), capacity 50 each
- Instant rooms: Created via `generateInstantRoom` edge function, persisted in `instant_rooms` table
- Shareable URL format: `/meeting.html?room_token={token}&encryption_key={key}&fee_required=true`

### 12.2 WebRTC Peer Connection

- **Library:** SimplePeer (wrapper over WebRTC `RTCPeerConnection`)
- **Signaling transport:** Supabase Realtime (postgres_changes on `meeting_signals`)
- **ICE negotiation:** Trickle ICE (`trickle: true`)
- **Media:** `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
- **Local preview:** `video.muted = true` (prevents feedback)

### 12.3 Signaling Protocol

| Signal Type | Direction | Description |
|---|---|---|
| `offer` | Initiator → Broadcast | SDP offer from joining peer |
| `answer` | Listener → Initiator | SDP answer in response to offer |
| `candidate` | Both directions | ICE candidate exchange |

---

## 13. Press Release & Syndication Engine

### 13.1 `generatePressRelease.js`

Fetches deal details from `green_acc_deals`, then assembles:
- **Press release text:** Template with buyer/seller names, region, date, partner quotes, contact info
- **Social posts:** LinkedIn (180 chars), Twitter/X (140 chars), Corporate (formal)
- Inserts into `deal_announcements` with `syndication_status='draft'`

### 13.2 `syndicateAnnouncement.js`

Distributes press release to 5 mock syndication targets:

| Target | Success Rate |
|---|---|
| TechCrunch | 60% |
| Bloomberg | 60% |
| Reuters | 80% |
| LinkedIn Feed | 80% |
| X (Twitter) | 80% |

Updates `deal_announcements.syndication_status` to `'published'` or `'failed'`.  
Records per-target `syndication_metadata` with URL and timestamp.

---

## 14. Code Audit & Repair Summary

### Audit Scope

All 13 edge function files, schema SQL, 5 HTML pages, `meeting.js`, `package.json`.

### Findings & Fixes Applied

| # | File | Issue | Severity | Fix Applied |
|---|---|---|---|---|
| 1 | `stripeWebhook.js` | Unused variable `type` declared but never read (potential lint error) | Low | Removed unused `const type = ...` declaration |
| 2 | `createStripeCheckout.js` | Supabase PATCH call result not checked — silent failure if DB update fails after Stripe payment succeeds | Medium | Assigned result to `patchResp`; added `if (!patchResp.ok)` error response (HTTP 502) |
| 3 | `syndicateAnnouncement.js` | Deprecated `.substr()` method used in mock URL generation | Low | Replaced `.substr(2, 9)` with `.substring(2, 11)` throughout |
| 4 | `generateInstantRoom.js` | Room token and encryption key generated using `Math.random()` — cryptographically weak, unsuitable for security tokens | High | Replaced with `crypto.getRandomValues()` for both token (16 bytes) and encryption key (32 bytes) |

### No Issues Found In

- All syntax checks pass (`node --check` on all 13 functions)
- Schema validation passes (all required tables present)
- `processEntryFee.js` — amount validation correct (exact $20.00)
- `processWithdrawal.js` — all 5 withdrawal gates correctly implemented
- `createHandshakeSession.js` — commission calculation correct
- `aiComplianceLawyer.js` — kill switch logic correct
- `newsWebhook.js` — risk flag insertion logic correct
- `documentBridge.js` — document type validation correct
- `aiSecretaryTools.js` — action dispatch logic correct
- `meeting.js` — XSS prevention (`escapeHtml`) correctly applied

---

## 15. Naming & Prefixing Standards

### Function Naming Pattern

All 13 edge functions use:
```js
export async function POST(request) { ... }
```

This is consistent with Supabase Edge Function conventions and HTTP method-based routing.

### File Naming Conventions

| Category | Pattern | Examples |
|---|---|---|
| Edge Functions | `camelCase.js` | `processEntryFee.js`, `createHandshakeSession.js` |
| Frontend HTML | `kebab-case.html` | `meeting.html`, `announce.html` |
| Frontend JS | `kebab-case.js` | `meeting.js` |
| Frontend CSS | `kebab-case.css` | `meeting.css` |
| Database | `snake_case` tables and columns | `green_acc_deals`, `entry_fee_status` |
| CSS Classes | Tailwind utilities + custom `kebab-case` | `glass`, `btn-glow`, `glow-text` |

### Database Naming Prefix

All platform tables use the `green_acc_` prefix or `global_` prefix:
- `green_acc_deals` — core deal table
- `global_news` — risk news feed
- `global_risk_flags` — risk gate flags
- `meeting_signals` — WebRTC signaling
- `instant_rooms` — encrypted rooms
- `room_sessions` — session state
- `document_references` — document pointers
- `deal_announcements` — press releases
- `compliance_logs` — audit trail

---

## 16. Novel Claims for Patent Consideration

The following novel combinations and mechanisms in GreenACC may be appropriate for patent consideration:

### Claim 1 — Triple-Agent AI Escrow Gate
A computerised escrow system requiring independent verification from exactly three autonomous AI agent modules, each returning a `"verified"` status stored in a structured JSONB field, before permitting fund release, wherein any single agent failure blocks the withdrawal pipeline.

### Claim 2 — Compliance-Integrated Kill Switch for Live Video Transactions
A real-time compliance screening system that monitors live meeting transcripts and document content against OFAC sanctions lists, and automatically terminates a video-conferencing session (setting `session_status='killed'`, `handshake_allowed=false`, `payment_allowed=false`) upon detecting violations, without requiring human intervention.

### Claim 3 — Global News Risk Interception for B2B Handshakes
A system wherein globally sourced news events are semantically classified by keyword severity, stored as risk flags, and consumed via real-time database push subscriptions (Supabase Realtime) to automatically block in-progress handshake confirmations when geopolitical or supply chain risks are detected.

### Claim 4 — Encrypted Instant Meeting Room with Embedded Payment Gate
A method for generating cryptographically unique meeting room access tokens (128-bit entropy via `crypto.getRandomValues()`) paired with AES-256 key material, embedded in shareable URLs, wherein room entry requires payment of a session fee, with 24-hour automatic expiry enforced at the database level.

### Claim 5 — Serverless Document Bridge with Zero-Storage Policy
A document-sharing system for business negotiations that stores only metadata pointers (OAuth provider, external URL, encryption metadata) rather than file content, streams documents on-demand using AES-256-GCM encryption, and requires a valid room session token for access — ensuring no sensitive trade documents reside on the platform's servers.

### Claim 6 — Five-Gate Sequential Withdrawal Authorization
A payment release mechanism requiring sequential verification of: (1) triple AI agent consensus, (2) entry fee payment confirmation, (3) handshake status confirmation, (4) compliance clearance, and (5) escrow lock state — all evaluated atomically before triggering fund release, with each gate returning an HTTP 403 on failure with a specific reason code.

### Claim 7 — WebRTC Signaling via Relational Database Realtime Subscriptions
A peer-to-peer video conferencing signaling architecture using a relational database (PostgreSQL via Supabase Realtime) as the signaling transport layer for WebRTC offer/answer/ICE candidate exchange, eliminating the need for a dedicated WebSocket signaling server.

---

*End of Patent Draft Dossier — GreenACC Platform v1.0*  
*Generated: 2026-06-19 | Repository: altrmaze/greens-acc.com*
