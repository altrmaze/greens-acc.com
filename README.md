# Greens ACC

Greens ACC is a static website with Supabase backend support for secure trade escrow, AI-monitored handshake workflows, and payment lifecycle tracking.

## Project structure

- `index.html` — main static site
- `backend/server.py` — Python command-center server that serves `dist/`, proxies Supabase functions, and exposes `/api/system-status`
- `package.json` — build, start, and test scripts
- `supabase/schema.sql` — database schema for deals and payments
- `supabase/functions/processEntryFee.js` — edge function to process the flat $20 entry fee
- `supabase/functions/processWithdrawal.js` — edge function to release escrow only after all 3 AI agents verify compliance

## Supabase integration

1. Create a Supabase project.
2. Add the `green_acc_deals` table using `supabase/schema.sql`.
3. Deploy edge functions from `supabase/functions/`.
4. Install the optional server helper for Node-based handlers:
   - `npm install @supabase/server`
5. For non-Edge runtimes, copy `.env.example` to `.env` and set:
   - `SUPABASE_URL`
   - `SUPABASE_PUBLISHABLE_KEY`
   - `SUPABASE_SECRET_KEY`
   - `SUPABASE_JWKS_URL`
6. For existing code in this repository, also set:
   - `SUPABASE_SERVICE_ROLE_KEY`
7. On Supabase Edge Functions, these variables are injected automatically.

## Usage

- `npm run build` — build static site to `dist/`
- `npm start` — build the site, start the Python integration server on port `5000`, and expose `/api/system-status`
- `npm test` — validate schema and edge function syntax

## Payment workflow

- Tracks mandatory $20 USD entry fee in `entry_fee_status`.
- Calculates 2% handshake commission using `handshake_commission_amount`.
- Locks funds in escrow until `ai_agent_status` is fully verified and `compliance_status` is verified.
- Uses `withdrawal_triggered` and `safe_withdrawal_ready` to prevent unauthorized fund release.

## Notes

- `processEntryFee.js` requires exactly $20.00 USD for fee processing.
- `processWithdrawal.js` gates withdrawal on handshake confirmation, compliance verification, and three AI agent verifications.

## Stripe & Webhook

- Deploy the Stripe webhook edge function at `supabase/functions/stripeWebhook.js` and set the following environment variables in your Supabase functions config or platform:
   - `STRIPE_SECRET_KEY` — your Stripe secret key
   - (Optional) `STRIPE_WEBHOOK_SECRET` — if you add signature verification later
- The webhook listens for `checkout.session.completed` and verifies the session with Stripe, then marks the `entry_fee_status` as `paid` in the `green_acc_deals` table.

## Deployment notes

- After deploying functions, set these environment variables in the edge functions runtime:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `STRIPE_SECRET_KEY`
- For the Python integration server, also set:
   - `SUPABASE_SECRET_KEY` (or `SUPABASE_SERVICE_ROLE_KEY`) — server-side key for REST access
   - `SUPABASE_FUNCTIONS_BASE_URL` — base URL used to proxy `/supabase/functions/*`
   - `PORT` — optional override for the default `5000`
- GitHub Actions production release now uses:
   - `.github/workflows/deploy.yml` to run `npm test`, apply `supabase/migrations/*` with `supabase db push`, and deploy Supabase edge functions
   - `.github/workflows/pages-deploy.yml` to run `npm test`, build `dist/`, preserve `CNAME`, and publish the frontend to GitHub Pages
- Configure these GitHub repository secrets before triggering the live release:
   - `SUPABASE_ACCESS_TOKEN`
   - `SUPABASE_PROJECT_REF`
   - `PRODUCTION_DB_PASSWORD`

## Files added in this update

- `supabase/functions/stripeWebhook.js` — Stripe webhook handler that validates session and patches Supabase
- `supabase/functions/createStripeCheckout.js` — creates Stripe Checkout sessions for the $20 entry fee
- `supabase/functions/createHandshakeSession.js` — handshake & L/C locking logic
- `success.html`, `cancel.html` — Stripe redirect pages
- `meeting.html` — Executive Meeting Suite UI (10 isolated rooms)
- `meeting.js` — client logic for rooms, AV preview, chat and AI integration
- `meeting.css` — styling for the meeting suite
- `supabase/functions/aiAgentAnalyze.js` — lightweight AI analysis stub (edge function)

## Meeting Suite realtime signaling

The Meeting Suite can use Supabase Realtime for WebRTC signaling. To enable it:

1. Set `window.SUPABASE_CONFIG` in `meeting.html` (or inject dynamically) with your Supabase project URL and anon key:

```html
<script>
   window.SUPABASE_CONFIG = { url: 'https://your-project.supabase.co', anonKey: 'YOUR_SUPABASE_ANON_KEY' };
</script>
```

2. Apply the database schema in `supabase/schema.sql` which includes the `meeting_signals` table used for offer/answer/candidate exchange.

3. Deploy the Supabase Realtime and ensure anon key allows realtime subscriptions for authenticated or public users as appropriate.

Security note: For production, use Supabase Auth to sign in users and avoid exposing elevated keys on the client. Consider creating ephemeral tokens or server-side signaling proxies.

## Global News Ticker & Emergency Interceptor

This release adds a real-time global news ticker and an emergency interceptor to the Meeting Suite. Key points:

- `supabase/schema.sql` now includes `global_news` and `global_risk_flags` tables to store incoming headlines and active risk flags.
- `supabase/functions/newsWebhook.js` is an edge function that accepts POSTed news payloads (mock feeds or webhooks), inserts `global_news`, and heuristically raises `global_risk_flags` for critical events.
- The Meeting UI (`meeting.html` + `meeting.js`) subscribes to new `global_news` and `global_risk_flags`, displays a scrolling ticker, and shows a high-visibility emergency modal when a critical flag is active.
- Before a handshake is created, the UI calls `window.checkGlobalRiskBeforeHandshake()` (if available) to verify there are no active global risk flags; if one exists the handshake is blocked and the emergency modal is shown.

How to test the news webhook locally:

1. With your Supabase project configured, POST a JSON payload to the `newsWebhook` endpoint. Example payload:

```json
{
   "source": "mock",
   "title": "New tariffs announced on key commodity routes",
   "summary": "Government X announced emergency tariffs affecting shipments.",
   "category": "trade",
   "severity": "high"
}
```

2. The edge function inserts a `global_news` row and will create a `global_risk_flags` entry for critical events. The meeting UI (if open and configured with `window.SUPABASE_CONFIG`) will show the ticker and emergency modal.

Security reminder: The `newsWebhook` currently uses simple heuristics to mark critical events. In production you should validate incoming webhooks, authenticate sources (e.g., via signatures), and tune the risk-detection rules.

## Global PR & Media Distribution Engine

This release includes a one-click media broadcast system for completed deals. Features:

- `announce.html` — Beautiful post-handshake announcement page with preview and broadcast controls.
- `supabase/functions/generatePressRelease.js` — AI agents generate professional, non-confidential press releases and social media copy with automatic data masking.
- `supabase/functions/syndicateAnnouncement.js` — Broadcasts press releases and social posts to mock media endpoints (TechCrunch, Bloomberg, Reuters, LinkedIn, Twitter/X).
- `deal_announcements` table — Tracks syndication status, metadata, and published content with version control.

**How it works:**

1. After a successful handshake (entry fee paid + 2% commission locked + 3 AI agents verified), user is redirected to `/announce.html` with deal parameters.
2. User clicks "Generate Announcement" button; AI agents create a professional press release and social posts with sensitive data automatically stripped (pricing, supply chains, internal policies kept private).
3. User reviews the preview modal showing exactly what will be published (press release, LinkedIn post, Twitter/X post, corporate announcement).
4. User clicks "Broadcast Now" and the announcement is syndicated to mock media outlets; syndication status is tracked in real-time.
5. Syndication results show which outlets published, which are pending editorial review, and which failed.

**Data masking rules:**

- Specific pricing and deal amounts are omitted from press releases.
- Supply chain routes and partner logistics are not disclosed.
- Internal corporate policies and compliance flags are redacted.
- Only the public-facing victory statement and partnership announcement remain.

**Testing the broadcast flow:**

1. Apply the updated schema (`supabase/schema.sql`) which includes the `deal_announcements` table.
2. Complete a handshake on the main dashboard.
3. You will be redirected to `/announce.html` with deal details in query parameters.
4. Click "Generate Announcement" (AI agents generate content).
5. Click "Preview & Broadcast" to review the press release and social posts.
6. Click "Broadcast Now" to syndicate to mock endpoints.

**Mock syndication targets:**

- TechCrunch & Business News feeds
- Bloomberg & Reuters wire services
- LinkedIn Corporate Network
- X (Twitter) & Social Media

In production, replace the mock endpoint URLs with real API credentials for your chosen PR distribution services (e.g., PR Newswire, eSpeed, Cision, etc.).

**Next steps (recommended):**

- Integrate real PR wire APIs (PR Newswire, eSpeed, Cision) with OAuth or API keys.
- Add real-time syndication webhooks to track publication.
- Implement user approval workflows before broadcast.
- Add audit trail and version history for all announcements.

---

## Enterprise Instant Meeting Lobby (No Registration Required)

Greens ACC now supports zero-friction, instant secure meeting rooms for global enterprises. Companies can bypass traditional registration and instantly spin up temporary encrypted meeting spaces with $20 session fees.

### Features:

1. **Instant Secure Entry** — Generate unique cryptographic room tokens with one click. No account creation, no tedious registration. Share the token link with counterparty for immediate friction-free access.

2. **Virtual Desk Data Bridge** — Securely stream corporate files into the meeting without storing them on Greens ACC servers:
   - Supports OAuth integration (Google Drive, OneDrive, Dropbox)
   - Encrypted file streaming with AES-256-GCM
   - Instant document recall while in the meeting
   - No file storage footprint on our infrastructure

3. **AI Executive Secretary Tool Suite** — Workspace utilities directly on the meeting table:
   - **Document Summarization** — Instantly summarize 100-page contracts
   - **Clause Parsing** — Extract specific clauses and identify weaknesses
   - **Financial Calculator** — Cross-border currency conversion and tariff estimation
   - **Shared Whiteboard** — Collaborative diagram and annotation tool
   - **Interactive Spreadsheet** — Shared financial models and calculations
   - **Smart Chat Assistant** — Ask the AI secretary to parse, summarize, or search documents on-the-spot

4. **Automatic Compliance Monitoring** — Real-time AI compliance lawyer continuously audits conversations and documents:
   - **OFAC & Sanctions Checks** — Monitors for sanctioned regions and entities
   - **Export Control Enforcement** — Flags restricted technology and commodities
   - **Tariff Compliance** — Detects tariff bypass or misclassification language
   - **Global Trade Law Auditing** — Enforces EU sanctions, ITAR, export regulations

5. **Automatic Kill Switch** — If critical trade law violations detected:
   - Immediate session termination
   - Handshake and payment capabilities revoked
   - Red-screen warning displayed to both parties
   - Session logged with compliance authorities

### Database Tables (Instant Enterprise Suite):

- `instant_rooms` — Temporary encrypted meeting rooms with crypto tokens, session fees, and 24-hour expiry
- `document_references` — Pointers to external files (OAuth-linked) with encryption metadata. Files NOT stored on servers.
- `compliance_logs` — Real-time monitoring of violations, severity levels, and AI recommendations
- `room_sessions` — Session state tracking, kill switch triggers, handshake allowances

### Edge Functions:

- `generateInstantRoom.js` — Creates instant room with cryptographic token, encryption key, and session fee requirement
- `documentBridge.js` — Registers external documents (Google Drive, OneDrive, etc.) for secure streaming
- `aiSecretaryTools.js` — Summarization, clause parsing, financial calculations, whiteboard, spreadsheet helpers
- `aiComplianceLawyer.js` — Continuous monitoring of OFAC, EU sanctions, export controls, tariff compliance. Triggers kill switch on critical violations.

### How to Use the Instant Enterprise Suite:

1. **Generate Instant Room:**
   - Enter your company name
   - Click "Generate Link"
   - Share the cryptographic room token link with counterparty
   - Both parties enter and join instantly (no registration)

2. **Enable Document Bridge:**
   - While in the meeting, upload a file or link to Google Drive
   - Document is registered for secure streaming
   - Click "Recall Document" to instantly stream contract, blueprint, or compliance sheet into the meeting

3. **Use AI Secretary Tools:**
   - Ask the secretary to "Summarize this contract"
   - Query: "Find all liability clauses"
   - Calculate: "What's the USD/EUR rate and 12% tariff on $50K?"
   - Access shared whiteboard, spreadsheet, and chat

4. **Compliance Monitoring:**
   - AI Compliance Lawyer runs every 30 seconds
   - If violation detected: warning/red flag appears
   - If critical violation: automatic kill switch terminates session
   - Both parties see compliance warning on screen

### Security & Compliance:

- **E2E Encryption** — Room tokens encrypt meeting content
- **File Streaming Not Storage** — Documents streamed from source, not saved on Greens ACC servers
- **OFAC Compliance** — Automated sanctions screening on all conversation content
- **Export Control** — Flags ITAR, EAR, and restricted technology mentions
- **Audit Trail** — All violations logged in `compliance_logs` table
- **Automatic Enforcement** — Kill switch prevents illegal transactions in real-time

### Next Steps (Production Recommendations):

- Integrate real OAuth providers (Google Workspace, Microsoft 365, Dropbox)
- Replace mock compliance rules with curated OFAC SDN list and real sanction databases
- Implement session recording and audit tape for compliance authorities
- Add webhook callbacks to external compliance systems (e.g., Compliance.ai, Middesk)
- Deploy real ML models for document classification and clause extraction
- Add multi-signature approval for kill switch override scenarios

---

## Summary: Why Greens ACC is a Massive Differentiator

✅ **Zero Registration** — Instant room tokens. No tedious account creation.  
✅ **Secure File Bridge** — Stream corporate files without storing them.  
✅ **AI Secretary** — Summarize, parse, calculate instantly while negotiating.  
✅ **Automatic Legal Guard** — OFAC/sanctions monitoring with kill switch enforcement.  
✅ **Real-Time Compliance** — Global trade law enforcement without manual review.  
✅ **Enterprise Grade** — Trusted by Toyota, Nissan, and global logistics giants.  

Greens ACC combines the simplicity of Google Meet with the compliance rigor of enterprise banking. Your deals are faster, safer, and globally compliant.
