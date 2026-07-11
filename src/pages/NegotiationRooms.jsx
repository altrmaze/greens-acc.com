import { useState } from 'react';
import AppNav from '../components/AppNav';
import { DashboardGuard } from '../components/DashboardGuard';

const SUPABASE_URL =
  import.meta?.env?.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' && window.__ENV__?.SUPABASE_URL) ||
  '';

const FUNCTION_BASE = `${SUPABASE_URL}/functions/v1/greens-acc`;

/**
 * Page 2 — Global Negotiation Rooms & Verification Gate
 *
 * Secure B2B negotiation spaces with:
 *  - $20 bot-prevention entry gate (connected to processEntryFee edge function)
 *  - Waiting area join + readiness tracking
 *  - Green room WebRTC session activation
 *  - Escrow verification status
 *  - Role-based permissions via DashboardGuard
 */
export default function NegotiationRooms() {
  const [entryStatus, setEntryStatus] = useState(null);
  const [waitingStatus, setWaitingStatus] = useState(null);
  const [roomStatus, setRoomStatus] = useState(null);
  const [loading, setLoading] = useState({});

  const setLoad = (key, val) =>
    setLoading((prev) => ({ ...prev, [key]: val }));

  /* ── Trigger $20 entry fee gate ──────────────────────────────── */
  const handleEntryFee = async () => {
    setLoad('entry', true);
    setEntryStatus(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/processEntryFee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 2000, currency: 'usd' }),
      });
      const data = await res.json();
      setEntryStatus(res.ok
        ? { ok: true, msg: 'Entry gate cleared. Proceed to negotiation.' }
        : { ok: false, msg: data.error || 'Entry fee failed.' });
    } catch {
      setEntryStatus({ ok: false, msg: 'Network error — retry.' });
    } finally {
      setLoad('entry', false);
    }
  };

  /* ── Join waiting area ───────────────────────────────────────── */
  const handleJoinWaiting = async () => {
    setLoad('waiting', true);
    setWaitingStatus(null);
    try {
      const res = await fetch(`${FUNCTION_BASE}/api/v1/meetings/waiting-area/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: 'deal-777',
          user_id: 'user-current',
          terms_accepted: true,
          compliance_verified: true,
        }),
      });
      const data = await res.json();
      setWaitingStatus(res.ok
        ? { ok: true, data }
        : { ok: false, msg: data.detail || 'Could not join waiting area.' });
    } catch {
      setWaitingStatus({ ok: false, msg: 'Network error — retry.' });
    } finally {
      setLoad('waiting', false);
    }
  };

  /* ── Activate green room ─────────────────────────────────────── */
  const handleActivateRoom = async () => {
    setLoad('room', true);
    setRoomStatus(null);
    try {
      const res = await fetch(
        `${FUNCTION_BASE}/api/v1/meetings/green-room/activate?deal_id=deal-777`,
        { method: 'POST' }
      );
      const data = await res.json();
      setRoomStatus(res.ok
        ? { ok: true, data }
        : { ok: false, msg: data.detail || 'Room activation failed.' });
    } catch {
      setRoomStatus({ ok: false, msg: 'Network error — retry.' });
    } finally {
      setLoad('room', false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <h1 className="text-3xl font-extrabold text-indigo-400 tracking-tight">
          🤝 Global Negotiation Rooms
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Secure escrow-verified B2B rooms · $20 anti-bot entry gate · Role-gated access
        </p>
      </header>

      <main className="max-w-7xl mx-auto px-6 pb-16 space-y-8">

        {/* ── Step 1: Entry Gate ───────────────────────────────────── */}
        <StepCard
          step="01"
          title="Bot-Prevention Entry Gate"
          description="A flat $20.00 activation charge is required before accessing the negotiation environment. This ensures only verified commercial entities enter the ecosystem."
          accent="indigo"
        >
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleEntryFee}
              disabled={loading.entry}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm
                font-semibold shadow-lg shadow-indigo-600/20 disabled:opacity-50 transition-all"
            >
              {loading.entry ? 'Processing…' : '💳 Pay $20.00 Activation Fee'}
            </button>
            {entryStatus && (
              <StatusBadge ok={entryStatus.ok} msg={entryStatus.msg} />
            )}
          </div>
        </StepCard>

        {/* ── Step 2: Waiting Area ─────────────────────────────────── */}
        <StepCard
          step="02"
          title="Waiting Area — Terms Acceptance"
          description="All contract conditions and compliance mandates must be accepted before entering the deal negotiation queue. System monitors participant readiness in real time."
          accent="cyan"
        >
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleJoinWaiting}
              disabled={loading.waiting}
              className="px-6 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-600 text-white text-sm
                font-semibold shadow-lg disabled:opacity-50 transition-all"
            >
              {loading.waiting ? 'Joining…' : '📋 Accept Terms & Enter Queue'}
            </button>
            {waitingStatus && (
              <StatusBadge
                ok={waitingStatus.ok}
                msg={
                  waitingStatus.ok
                    ? `Queue joined · ${waitingStatus.data?.active_participants?.length ?? 0} participant(s) · ${waitingStatus.data?.ready_for_negotiation ? '✅ Ready' : '⏳ Waiting'}`
                    : waitingStatus.msg
                }
              />
            )}
          </div>
        </StepCard>

        {/* ── Step 3: Green Room Activation ────────────────────────── */}
        <StepCard
          step="03"
          title="Secure Green Room — WebRTC Channel"
          description="Isolated, end-to-end encrypted audio/video negotiation session. WebRTC channel is provisioned after waiting area sign-off. Session is logged and compliance-audited."
          accent="emerald"
        >
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleActivateRoom}
              disabled={loading.room}
              className="px-6 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-sm
                font-semibold shadow-lg disabled:opacity-50 transition-all"
            >
              {loading.room ? 'Activating…' : '🟢 Establish Live WebRTC Channel'}
            </button>
            {roomStatus && (
              <StatusBadge
                ok={roomStatus.ok}
                msg={
                  roomStatus.ok
                    ? `Channel: ${roomStatus.data?.webrtc_channel_id ?? 'active'}`
                    : roomStatus.msg
                }
              />
            )}
          </div>
        </StepCard>

        {/* ── Role-Gated Panels ─────────────────────────────────────── */}
        <DashboardGuard requiredRole="financial_manager">
          <FinancialManagerPanel />
        </DashboardGuard>

        <DashboardGuard requiredRole="accounting_staff">
          <AccountingStaffPanel />
        </DashboardGuard>

      </main>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function StepCard({ step, title, description, accent, children }) {
  const colors = {
    indigo:  'border-indigo-500/30 bg-indigo-950/20',
    cyan:    'border-cyan-500/30 bg-cyan-950/20',
    emerald: 'border-emerald-500/30 bg-emerald-950/20',
  };
  const stepColors = {
    indigo:  'text-indigo-400',
    cyan:    'text-cyan-400',
    emerald: 'text-emerald-400',
  };
  return (
    <div className={`rounded-2xl border px-6 py-6 ${colors[accent] || ''}`}>
      <div className="flex items-start gap-4">
        <span className={`text-4xl font-black font-mono opacity-30 ${stepColors[accent]}`}>
          {step}
        </span>
        <div className="flex-1">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <p className="text-sm text-slate-400 mt-1">{description}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ ok, msg }) {
  return (
    <span
      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
        ok
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
          : 'bg-red-500/10 text-red-400 border-red-500/30'
      }`}
    >
      {ok ? '✅' : '❌'} {msg}
    </span>
  );
}

function FinancialManagerPanel() {
  return (
    <section className="bg-slate-900 rounded-2xl border border-slate-800 px-6 py-8">
      <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-1">
        💹 Financial Manager
      </h2>
      <p className="text-sm text-slate-400 mb-6">Macro reporting, cross-border tax config & currency risk</p>
      <div className="grid sm:grid-cols-3 gap-4">
        {['Macro Financial Summary', 'Cross-Border Tax Config', 'Currency Fluctuation Dashboard', 'Operational Cost Reports', 'FX Risk Metrics', 'Budget Projections'].map((m) => (
          <ModuleCard key={m} label={m} />
        ))}
      </div>
    </section>
  );
}

function AccountingStaffPanel() {
  return (
    <section className="bg-slate-900 rounded-2xl border border-slate-800 px-6 py-8">
      <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2 mb-1">
        📋 Accounting
      </h2>
      <p className="text-sm text-slate-400 mb-4">Data entry · Invoice processing · Individual ledger inputs</p>
      <div className="bg-amber-900/20 border border-amber-500/30 rounded-xl px-4 py-3 mb-6 text-xs text-amber-300 font-medium">
        This workspace is restricted to data-entry and invoice processing.
        Global financial summaries, approval buttons, and contract signatures are
        not available at this clearance level.
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {['New Invoice Entry', 'Individual Billing Log', 'Manual Ledger Input', 'My Submitted Records'].map((m) => (
          <ModuleCard key={m} label={m} />
        ))}
      </div>
    </section>
  );
}

function ModuleCard({ label }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 text-sm font-semibold
      text-slate-300 hover:border-indigo-500/50 hover:bg-slate-700 transition-all cursor-pointer">
      {label}
    </div>
  );
}
