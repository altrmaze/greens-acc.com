# Greens ACC — Complete Functions Reference

All backend calls use `POST /supabase/functions/{name}` with `Content-Type: application/json`.  
Frontend base path: `const functionHost = '/supabase/functions';`

---

## 1. Supabase Edge Functions

### createDeal
Creates a new `green_acc_deals` record in Supabase.  
**Required:** `buyer_id`  
**Optional:** `seller_id`, `region`, `currency`, `amount_total`, `lc_reference_number`  
**Returns:** `{ deal: { id, entry_fee_status, handshake_status, compliance_status, ... } }`

```js
fetch('/supabase/functions/createDeal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    buyer_id: 'buyer-uuid',
    amount_total: 50000,
    lc_reference_number: 'LCR-2024-001'
  })
});
```

---

### processEntryFee
Marks the flat $20.00 activation fee as paid on a deal.  
**Required:** `deal_id`, `payer_id`, `amount` (must be exactly `20.0`)  
**Returns:** `{ deal: { entry_fee_status: 'paid', compliance_status, ... } }`

```js
fetch('/supabase/functions/processEntryFee', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deal_id: 'deal-uuid', payer_id: 'buyer-uuid', amount: 20.00 })
});
```

---

### createHandshakeSession
Confirms the handshake, locks escrow, calculates 2% commission.  
**Required:** `deal_id`, `payer_id`, `amount` (> 0)  
**Optional:** `lc_reference_number`  
**Returns:** `{ deal: { handshake_status, escrow_status, compliance_status, ... }, commission_amount }`

```js
fetch('/supabase/functions/createHandshakeSession', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deal_id: 'deal-uuid', payer_id: 'buyer-uuid', amount: 50000 })
});
```

---

### createStripeCheckout
Creates a Stripe Checkout session for the $20 entry fee.  
**Required:** `deal_id`, `payer_id`  
**Optional:** `amount`, `base_url`, `success_url`, `cancel_url`  
**Returns:** `{ url: 'https://checkout.stripe.com/...' }`  
**Requires env:** `STRIPE_SECRET_KEY`

```js
fetch('/supabase/functions/createStripeCheckout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deal_id: 'deal-uuid', payer_id: 'buyer-uuid', base_url: window.location.origin })
});
```

---

### stripeWebhook
Receives Stripe `checkout.session.completed` events and updates the deal record.  
**Body:** Raw Stripe event payload  
**Verifies payment** against Stripe API before patching Supabase  
**Requires env:** `STRIPE_SECRET_KEY`

---

### processWithdrawal
Initiates safe escrow release / withdrawal on a completed deal.  
**Required:** `deal_id`  
**Returns:** `{ payout_amount, lc_reference_number, escrow_status: 'released' }`

```js
fetch('/supabase/functions/processWithdrawal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deal_id: 'deal-uuid' })
});
```

---

### generateInstantRoom
Creates an encrypted instant meeting room with a shareable link.  
**Required:** `creator_company`  
**Optional:** `participant_email`  
**Returns:** `{ room_token, encryption_key, share_link, ... }`

```js
fetch('/supabase/functions/generateInstantRoom', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ creator_company: 'Acme Corp' })
});
```

---

### documentBridge
Registers a document for AES-256-GCM encrypted streaming (file NOT stored on Greens ACC servers).  
**Required:** `room_id`, `document_name`  
**Optional:** `document_type` (`pdf` | `docx` | `spreadsheet` | `contract` | `blueprint` | `legal` | `compliance`), `source_url`, `oauth_provider`, `uploaded_by`  
**Returns:** `{ document_id, encryption_metadata, ... }`

```js
fetch('/supabase/functions/documentBridge', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ room_id: 'room-1', document_name: 'contract.pdf', document_type: 'contract', uploaded_by: clientId })
});
```

---

### aiAgentAnalyze
Returns real-time strategic, legal, and financial insights on any text or event.  
**Body:** `{ type, room, text, metadata? }`  
**Returns:** `{ room, insights: string[] }`

```js
fetch('/supabase/functions/aiAgentAnalyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'message', room: 'room-1', text: 'We need to discuss pricing.' })
});
```

---

### aiSecretaryTools
Executive assistant: summarize documents, parse contract clauses, calculate FX/tariffs.  
**Required:** `action` (`summarize` | `parse` | `calculate`)  
- `summarize` also requires: `document_text`  
- `parse` also requires: `query`  
- `calculate` also requires: `currency_pair` (e.g. `USD/EUR`)  
**Returns:** `{ result: { ... } }`

```js
fetch('/supabase/functions/aiSecretaryTools', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'summarize', document_text: 'Full contract body here...' })
});
```

---

### aiComplianceLawyer
Checks conversation / document content against OFAC sanctions, restricted regions, illegal commodities, and export controls. Triggers a kill switch on critical violations.  
**Required:** `room_id`, plus `conversation_text` and/or `document_content`  
**Returns:** `{ violations_detected, kill_switch_triggered, kill_switch_reason, violations: [], ... }`

```js
fetch('/supabase/functions/aiComplianceLawyer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ room_id: 'room-1', conversation_text: 'Chat log here...', document_content: '' })
});
```

---

### auditContractCompliance
Audits a contract body against CISG, INCOTERMS 2020, UNIDROIT, and AML/KYC standards.  
**Required:** `text` (full contract body)  
**Optional:** `contract_id`  
**Returns:** `{ compliant, applied_frameworks, discrepancies, recommended_clauses, timestamp }`

```js
fetch('/supabase/functions/auditContractCompliance', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ contract_id: 'c-001', text: 'Full contract text...' })
});
```

---

### marketplaceEngine
Lists an asset for sale or processes a marketplace verification fee.  
**Required:** `action` (`list_asset` | `process_verification`)  
- `list_asset` also requires: `title`, `category`, `seller_id`; optional: `quantity`, `price_per_unit`, `description`  
- `process_verification` also requires: `listing_id`, `payer_id`  
**Returns:** action-specific listing or verification receipt

```js
fetch('/supabase/functions/marketplaceEngine', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'list_asset', title: 'Soybeans 500t', category: 'agricultural', seller_id: 'seller-uuid' })
});
```

---

### supplyChainCoordinator
Initializes a shipment or advances a supply chain milestone.  
**Required:** `action` (`init_shipment` | `advance_milestone`)  
- `init_shipment` also requires: `order_id`, `origin`, `destination`; optional: `carrier_id`  
- `advance_milestone` also requires: `tracking_id`, `new_milestone`  
**Returns:** shipment record or updated milestone status

```js
fetch('/supabase/functions/supplyChainCoordinator', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'init_shipment', order_id: 'ord-001', origin: 'Dubai', destination: 'Lagos' })
});
```

---

### generatePressRelease
Generates a formatted press release from a confirmed deal.  
**Required:** `deal_id`, `buyer_name`, `seller_name`  
**Optional:** `region`, `amount_total`, `lc_reference_number`  
**Returns:** `{ press_release: string, announcement_id, ... }`

```js
fetch('/supabase/functions/generatePressRelease', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deal_id: 'deal-uuid', buyer_name: 'Acme Corp', seller_name: 'Global Trade Ltd' })
});
```

---

### syndicateAnnouncement
Syndicates a press release to TechCrunch, Bloomberg, Reuters, LinkedIn, and X (mock endpoints).  
**Required:** `announcement_id`, `press_release`  
**Optional:** `deal_id`, `social_posts`  
**Returns:** `{ published_count, failed_count, syndication_metadata }`

```js
fetch('/supabase/functions/syndicateAnnouncement', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ announcement_id: 'ann-001', press_release: 'Full press release text...' })
});
```

---

### newsWebhook
Inserts a news item into the `global_news` table and triggers a Supabase Realtime broadcast.  
**Required:** `title`  
**Optional:** `source`, `summary`, `category`, `severity` (`low` | `medium` | `high` | `critical`), `metadata`  
**Returns:** the inserted news record

```js
fetch('/supabase/functions/newsWebhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ source: 'Reuters', title: 'Markets Update', category: 'finance', severity: 'low' })
});
```

---

## 2. Frontend Functions — `index.html` (inline IIFE)

> All DOM writes use `textContent` / `createElement`. No `innerHTML` with user data.

### DOM helpers
```js
function setText(node, value)   // null-safe node.textContent = value
function setClass(node, value)  // null-safe node.className = value
function listen(node, ev, fn)   // null-safe addEventListener
function getVal(node)           // returns trimmed string from input
function getNum(node)           // returns finite number from input
function fmtUsd(v)              // formats number as $1,234.56
function getCurrentLocale()     // maps language selector → BCP-47 locale
```

### Clock
```js
function updateClocks()
// Updates clockUtc, clockLocal, clockRegion every second via setInterval
// Reads from languageSelect and regionSelect
```

### Pipeline UI
```js
function setStepState(circle, statusEl, state, label)
// state: 'pending' | 'active' | 'complete' | 'error'
// Applies Tailwind classes to pipeline step circle + badge

function updatePipeline()
// Re-renders all 5 deal pipeline steps from dealStatus object
// Steps: entry_fee → handshake → escrow → compliance → withdrawal
```

### Status & Logging
```js
function updateAgentBadge(node, index, status)
// Styles AI agent badge: 'verified' (green) | 'rejected' (red) | other (grey)

function updateDealStatusUI()
// Syncs all status text + agent badges + pipeline from dealStatus

function appendLog(message, level)
// Appends timestamped row to agent activity log
// level: 'info' | 'warning' | 'alert' | 'success'

function showConversation(message, speaker)
// Appends a chat bubble to the negotiation conversation log

function setSystemStatus(text, colorClass)
// Updates the top system status badge
```

### Backend Actions
```js
async function handleCreateDeal()
// Reads: buyerIdInput, dealAmountInput, lcReferenceInput
// Calls: POST /supabase/functions/createDeal
// Updates: dealIdInput.value, dealStatus, appendLog

async function handleEntryFee()
// Reads: dealIdInput, buyerIdInput, lcReferenceInput
// Calls: POST /supabase/functions/processEntryFee  (amount: 20)
// Updates: dealStatus.entry_fee_status, pipeline step 1

async function handleHandshake()
// Reads: dealIdInput, buyerIdInput, dealAmountInput, lcReferenceInput
// Guard: entry_fee must be 'paid' or 'verified'
// Guard: calls window.checkGlobalRiskBeforeHandshake() first
// Calls: POST /supabase/functions/createHandshakeSession
// Updates: dealStatus (handshake, escrow, compliance, ai_agent_status)
// Redirects to: /announce.html?deal_id=...&buyer_name=...&...

async function handleWithdrawal()
// Reads: dealIdInput
// Calls: POST /supabase/functions/processWithdrawal
// Updates: dealStatus.escrow_status = 'released', safe_withdrawal_ready = true
```

### Deal State Object
```js
const dealStatus = {
  entry_fee_status:      'pending',   // 'pending' | 'paid' | 'verified'
  handshake_status:      'pending',   // 'pending' | 'confirmed' | 'rejected'
  compliance_status:     'pending',   // 'pending' | 'verified' | 'failed'
  escrow_status:         'locked',    // 'locked' | 'released'
  funds_locked:          true,
  safe_withdrawal_ready: false,
  ai_agent_status: {
    agent1: 'pending',                // 'pending' | 'verified' | 'rejected'
    agent2: 'pending',
    agent3: 'pending'
  }
};
```

### Constants
```js
const functionHost     = '/supabase/functions';
const ENTRY_FEE_AMOUNT = 20;           // flat $20.00 activation fee
```

### Event Listeners (wired on load)
| Trigger | Action |
|---|---|
| Language selector change | Syncs negotiation language selector |
| Region selector change | Updates clock timezone |
| "Next Payment Step" click | Cycles through 5 KYC/payment step labels |
| "Start Conversation" click | Plays 3-turn multilingual dialogue |
| "Check Handshake" click | Opens Stripe Checkout (calls `createStripeCheckout`) |
| Deal amount input | Live commission preview at 2% |
| `window.load` | Calls `/api/system-status`; auto-creates deal if no dealId |

---

## 3. Frontend Functions — `meeting.js`

### Supabase Initialization & Realtime
```js
function initSupabase()
// Reads window.SUPABASE_CONFIG { url, anonKey }
// Creates window.supabase.createClient(url, anonKey)

async function initNewsAndRisk()
// Loads last 50 global_news records, renders ticker
// Subscribes to global_news INSERT events (Realtime)
// Subscribes to global_risk_flags INSERT events (Realtime)

function renderTicker(newsList)
// Renders scrolling news ticker from array of news records

function prependTickerItem(item)
// Prepends a single new news item to the live ticker
```

### Risk & Emergency Modal
```js
function handleRiskFlag(flagRec)
// Sets globalRiskActive = true
// Calls showEmergencyModal(flagRec.reason)
// Notifies AI agents via postAiEvent()

function clearRisk()
// Resets globalRiskActive = false, hides emergency modal

function showEmergencyModal(message)
// Shows #emergency-modal overlay with title + body text

function hideEmergencyModal()
// Hides #emergency-modal overlay

window.checkGlobalRiskBeforeHandshake = async function()
// Queries global_risk_flags WHERE active = true
// Returns { ok: bool, active: bool, flag?: record }
// Exposed on window so index.html IIFE can call it
```

### WebRTC Signaling
```js
async function subscribeToSignals(roomId, onSignal)
// Subscribes to meeting_signals Supabase Realtime channel
// Filter: room_id = roomId, event = INSERT
// Calls onSignal(record) for each incoming signal

async function createSignal(roomId, senderId, targetId, type, data)
// Inserts a row into meeting_signals table
// type: 'offer' | 'answer'
// data: SimplePeer signal object
```

### Room Management
```js
async function fetchRooms()
// Generates 10 static executive rooms, calls renderRooms()

function renderRooms()
// Renders room cards into #rooms-grid with "Join" buttons

function selectRoom(id)
// Sets activeRoom, updates room header UI

async function createRoom()
// Placeholder (local only, no backend call)
```

### Media & Peers
```js
async function joinRoom()
// Requests camera + mic via getUserMedia()
// Calls initSupabase() then subscribeToSignals()
// Creates SimplePeer (initiator: true), broadcasts offer via createSignal()
// Calls postAiEvent({ type: 'join', ... })

async function handleIncomingSignal(rec)
// Creates or updates a SimplePeer for an incoming offer/answer
// Skips signals from own clientId

function leaveRoom()
// Stops all media tracks, clears #video-grid
```

### Chat & AI
```js
function appendChat(msg, who = 'System')
// Appends a chat message div to #chat-log

function escapeHtml(s)
// Escapes & < > for safe innerHTML usage

async function sendMessage()
// Reads #chat-input, calls appendChat(), then postAiEvent()

async function postAiEvent(event)
// POST /supabase/functions/aiAgentAnalyze with event object
// Calls showAiInsight() for each insight returned

function showAiInsight(text)
// Prepends an insight card to #ai-insights panel
```

### File & Document
```js
async function uploadFile()
// Reads #file-input, notifies AI via postAiEvent({ type: 'file', ... })
// Placeholder — no actual Supabase storage call yet

async function registerDocument()
// Prompts for document name via prompt()
// POST /supabase/functions/documentBridge
// { room_id, document_name, document_type, uploaded_by: clientId }
```

### Instant Room
```js
async function generateInstantRoom()
// Reads #instant-company-name
// POST /supabase/functions/generateInstantRoom
// Displays share link in #share-link, shows #instant-room-output
// Stores room_token and encryption_key in module-level vars
```

### AI Secretary Tools
```js
async function runSecretaryCommand(action, query)
// POST /supabase/functions/aiSecretaryTools
// action: 'summarize' | 'parse' | 'calculate'
// Renders formatted result into #secretary-output
// summarize → executive_summary, reading_time_minutes, word_count
// parse     → matching_clauses count, potential_weaknesses count
// calculate → currency_pair rate, tariff estimate
```

### Compliance & Kill Switch
```js
async function runComplianceCheck()
// Scrapes #chat-log text
// POST /supabase/functions/aiComplianceLawyer
// Calls triggerKillSwitch() if kill_switch_triggered === true
// Runs on setInterval every 30 seconds

function triggerKillSwitch(reason, violations)
// Sets killSwitchActive = true
// Shows #kill-switch-modal with reason and violation details
// Dispatches window CustomEvent 'killSwitchTriggered'
```

### Module-level State
```js
let supabase = null;               // Supabase browser client
let supabaseSubscription = null;   // active Realtime subscription
let rooms = [];                    // list of available rooms
let activeRoom = null;             // currently selected room object
let localStream = null;            // getUserMedia MediaStream
let peers = {};                    // map of sender_id → SimplePeer instance
let globalRiskActive = false;      // true when a risk flag is active
let currentRisk = null;            // current risk flag record
let currentRoomToken = null;       // token from generateInstantRoom
let currentEncryptionKey = null;   // key from generateInstantRoom
let killSwitchActive = false;      // true after compliance kill switch fires

const clientId = crypto.randomUUID();  // unique ID for this browser session
const functionHost = '/supabase/functions';
```

---

## 4. API Routes (backend)

| Route | Method | Response |
|---|---|---|
| `/api/supabase-config` | GET | `{ url, anonKey }` |
| `/api/system-status` | GET | `{ status: 'ok', supabase_configured: bool }` |
| `/supabase/functions/:name` | POST | proxied to Supabase edge function |
| `*` | GET | static files from `dist/` |

---

## 5. Key Pages

| File | URL | Purpose |
|---|---|---|
| `index.html` | `/` | Main deal dashboard — create deal, pay entry fee, handshake, withdrawal |
| `meeting.html` | `/meeting` | Meeting suite — video rooms, chat, AI tools, compliance |
| `announce.html` | `/announce` | Deal announcement page (redirected to after handshake) |
| `success.html` | `/success` | Stripe payment success page |
| `cancel.html` | `/cancel` | Stripe payment cancel page |

---

## 6. Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `SUPABASE_URL` | all | Supabase project URL |
| `SUPABASE_ANON_KEY` | browser client | Public anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | server + edge functions | Service-role key (server-side only) |
| `STRIPE_SECRET_KEY` | `createStripeCheckout`, `stripeWebhook` | Stripe secret key |
| `PORT` | `backend/server.py`, `backend/server.js` | Server port (default: 5000 / 3000) |
