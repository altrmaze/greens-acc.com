import { useState, useEffect, useRef } from 'react';
import './LandingPage.css';

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const LOCALE_MAP = { en: 'en-US', ar: 'ar-SA', hi: 'hi-IN', pl: 'pl-PL', fr: 'fr-FR', zh: 'zh-CN' };
const FUNCTION_HOST = '/supabase/functions';
const ENTRY_FEE_AMOUNT = 20;

const NEGOTIATION_PHRASES = {
  en: {
    hello    : 'Hello — the offer is ready for secure review.',
    reply    : 'Terms confirmed. Awaiting safe closing handshake.',
    handshake: 'Handshake acknowledged. Final decision with analyst.'
  },
  ar: {
    hello    : 'مرحباً — العرض جاهز للمراجعة الآمنة.',
    reply    : 'تم تأكيد الشروط. في انتظار المصافحة الختامية.',
    handshake: 'تمت المصافحة. القرار النهائي مع المحلل.'
  },
  hi: {
    hello    : 'नमस्ते — प्रस्ताव सुरक्षित समीक्षा के लिए तैयार है।',
    reply    : 'शर्तें स्वीकृत। सुरक्षित समझौते की प्रतीक्षा।',
    handshake: 'हस्तमिलाप पूर्ण। अंतिम निर्णय विश्लेषक के पास।'
  },
  pl: {
    hello    : 'Cześć — oferta gotowa do bezpiecznego przeglądu.',
    reply    : 'Warunki potwierdzone. Czekam na finalne zamknięcie.',
    handshake: 'Uścisk dłoni zakończony. Decyzja u analityka.'
  },
  fr: {
    hello    : 'Bonjour — l\u2019offre est prête pour la révision sécurisée.',
    reply    : 'Conditions confirmées. En attente de la clôture.',
    handshake: 'Poignée de main terminée. Décision finale chez l\u2019analyste.'
  },
  zh: {
    hello    : '您好 — 报价已准备好供安全审核。',
    reply    : '条款已确认。等待安全成交握手。',
    handshake: '握手完成。最终决定现由分析师做出。'
  }
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmtUsd = (v) => '$' + Number(v).toFixed(2);

function pillarStatusClass(type) {
  return (
    'mt-2.5 text-[10px] font-mono text-center min-h-[16px] ' +
    (type === 'success' ? 'text-emerald-600' :
     type === 'error'   ? 'text-rose-600' :
     type === 'loading' ? 'text-blue-600' :
                          'text-slate-400')
  );
}

function sysStatusClasses(type) {
  const colorMap = {
    active : 'bg-emerald-50 text-emerald-700 border-emerald-200',
    alert  : 'bg-rose-50 text-rose-700 border-rose-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    busy   : 'bg-blue-50 text-blue-700 border-blue-200',
  };
  return 'inline-flex items-center gap-1.5 px-3 py-1.5 border text-[10px] font-bold rounded-full font-mono uppercase ' + (colorMap[type] || colorMap.active);
}

function sysDotClass(type) {
  return 'status-dot ' + (type === 'active' ? 'bg-emerald-500' : type === 'alert' ? 'bg-rose-500' : type === 'warning' ? 'bg-amber-500' : 'bg-blue-500');
}

function agentBadgeClass(status) {
  return (
    'rounded-full px-2 py-0.5 text-[10px] font-semibold border ' +
    (status === 'verified' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
     status === 'rejected' ? 'bg-rose-100 text-rose-700 border-rose-200' :
                             'bg-slate-100 text-slate-600 border-slate-200')
  );
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  // ── Locale state ──────────────────────────────────────────────────────────
  const [region, setRegion] = useState('global');
  const [language, setLanguage] = useState('en');
  const [cpLanguage, setCpLanguage] = useState('en');
  const [localTime, setLocalTime] = useState('—');

  // ── Pillar I: Meeting Room ────────────────────────────────────────────────
  const [roomCompany, setRoomCompany] = useState('');
  const [roomStatus, setRoomStatus] = useState({ msg: '', type: 'info' });

  // ── Pillar II: Supply Chain ───────────────────────────────────────────────
  const [scOrderId, setScOrderId] = useState('');
  const [scCarrierId, setScCarrierId] = useState('');
  const [scOrigin, setScOrigin] = useState('');
  const [scDestination, setScDestination] = useState('');
  const [scStatus, setScStatus] = useState({ msg: '', type: 'info' });

  // ── Pillar III: Compliance ────────────────────────────────────────────────
  const [complianceText, setComplianceText] = useState('');
  const [complianceRoomId, setComplianceRoomId] = useState('');
  const [scanStatus, setScanStatus] = useState({ msg: '', type: 'info' });

  // ── Deal Activation ───────────────────────────────────────────────────────
  const [dealId, setDealId] = useState('');
  const [buyerId, setBuyerId] = useState('');
  const [dealAmount, setDealAmount] = useState('1000.00');
  const [lcReference, setLcReference] = useState('');

  // ── Deal state (mirrors original dealState object) ────────────────────────
  const [dealState, setDealState] = useState({
    entry_fee_status : 'pending',
    handshake_status : 'pending',
    compliance_status: 'pending',
    escrow_status    : 'locked',
    funds_locked     : true,
    ai_agent_status  : { agent1: 'pending', agent2: 'pending', agent3: 'pending' }
  });
  const [commission, setCommission] = useState('$0.00');

  // ── System status ─────────────────────────────────────────────────────────
  const [sysStatus, setSysStatus] = useState({ label: 'Active', type: 'active' });

  // ── Logs ──────────────────────────────────────────────────────────────────
  const [actLog, setActLog] = useState([]);
  const [convLog, setConvLog] = useState([]);

  // ── Refs for auto-scroll ──────────────────────────────────────────────────
  const actLogRef  = useRef(null);
  const convLogRef = useRef(null);

  // ── Derived values ────────────────────────────────────────────────────────
  const dealAmountDisplay = dealAmount ? fmtUsd(Number(dealAmount)) : '—';

  let lifecycleStage = 'Awaiting inputs';
  if (dealState.escrow_status === 'released') {
    lifecycleStage = 'Escrow released · withdrawal complete';
  } else if (dealState.handshake_status === 'confirmed' && dealState.escrow_status === 'locked') {
    lifecycleStage = 'Handshake confirmed · escrow locked';
  } else if (dealState.entry_fee_status === 'paid' && dealState.handshake_status !== 'confirmed') {
    lifecycleStage = 'Entry paid · awaiting handshake';
  }

  // ── Clock effect ──────────────────────────────────────────────────────────
  useEffect(() => {
    const locale = LOCALE_MAP[language] || 'en-US';
    const tick = () => {
      setLocalTime(
        new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date())
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [language]);

  // ── html lang attr ────────────────────────────────────────────────────────
  useEffect(() => {
    document.documentElement.lang = language || 'en';
  }, [language]);

  // ── Auto-scroll logs ──────────────────────────────────────────────────────
  useEffect(() => {
    if (actLogRef.current) actLogRef.current.scrollTop = actLogRef.current.scrollHeight;
  }, [actLog]);

  useEffect(() => {
    if (convLogRef.current) convLogRef.current.scrollTop = convLogRef.current.scrollHeight;
  }, [convLog]);

  // ── Initialise ────────────────────────────────────────────────────────────
  useEffect(() => {
    appendLog('Greens ACC platform initialized. All systems active.', 'success');
    appendLog('Secure trade policy in effect: OFAC, AML, KYC monitoring online.', 'warning');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function appendLog(message, level = 'info') {
    const locale = LOCALE_MAP[language] || 'en-US';
    const time = new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date());
    setActLog(prev => [...prev, { time, message, level }]);
  }

  function appendConversation(speaker, message) {
    setConvLog(prev => [...prev, { speaker, message }]);
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  async function handleEntryFee() {
    if (!dealId || !buyerId) {
      appendLog('Entry fee: deal ID and buyer ID are required.', 'warning');
      return;
    }
    appendLog('Processing $20.00 access activation fee...', 'info');
    try {
      const resp = await fetch(`${FUNCTION_HOST}/processEntryFee`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ deal_id: dealId, payer_id: buyerId, amount: ENTRY_FEE_AMOUNT, lc_reference_number: lcReference })
      });
      const data = await resp.json();
      if (!resp.ok) {
        appendLog('Entry fee failed: ' + (data.error || resp.statusText), 'alert');
        return;
      }
      setDealState(prev => ({
        ...prev,
        entry_fee_status : data.deal?.entry_fee_status  || 'paid',
        compliance_status: data.deal?.compliance_status || prev.compliance_status
      }));
      setSysStatus({ label: 'Entry Fee Paid', type: 'active' });
      appendLog('$20.00 access fee recorded. Deal activation unlocked.', 'success');
    } catch (err) {
      appendLog('Entry fee error: ' + err.message, 'alert');
    }
  }

  async function handleHandshake() {
    const amount = Number(dealAmount);
    if (!dealId || !buyerId || !(amount > 0)) {
      appendLog('Handshake: deal ID, buyer ID, and a positive amount are required.', 'warning');
      return;
    }
    if (dealState.entry_fee_status !== 'paid') {
      appendLog('Handshake blocked: entry fee must be paid first.', 'warning');
      return;
    }
    appendLog('Creating L/C session and locking 2% brokerage commission...', 'info');
    try {
      const resp = await fetch(`${FUNCTION_HOST}/createHandshakeSession`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ deal_id: dealId, payer_id: buyerId, amount, lc_reference_number: lcReference })
      });
      const data = await resp.json();
      if (!resp.ok) {
        appendLog('Handshake failed: ' + (data.error || resp.statusText), 'alert');
        return;
      }
      setDealState(prev => ({
        ...prev,
        handshake_status : data.deal?.handshake_status  || 'confirmed',
        escrow_status    : data.deal?.escrow_status     || 'locked',
        compliance_status: data.deal?.compliance_status || 'verified',
        ai_agent_status  : data.deal?.ai_agent_status   || { agent1: 'verified', agent2: 'verified', agent3: 'verified' }
      }));
      setCommission(fmtUsd(data.commission_amount ?? 0));
      setSysStatus({ label: 'L/C Locked · Escrow Active', type: 'active' });
      appendLog('Letter of credit created. 2% brokerage commission locked in escrow.', 'success');
      setTimeout(() => {
        const params = new URLSearchParams({
          deal_id: dealId, buyer_name: buyerId, seller_name: 'Counterparty',
          region: region || 'global',
          lc_ref: lcReference || 'LCR-TBD',
          amount: String(amount)
        });
        window.location.href = '/announce.html?' + params.toString();
      }, 1800);
    } catch (err) {
      appendLog('Handshake error: ' + err.message, 'alert');
    }
  }

  async function handleWithdrawal() {
    if (!dealId) {
      appendLog('Withdrawal: deal ID is required.', 'warning');
      return;
    }
    appendLog('Initiating safe withdrawal — verifying agent status and compliance...', 'info');
    try {
      const resp = await fetch(`${FUNCTION_HOST}/processWithdrawal`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ deal_id: dealId })
      });
      const data = await resp.json();
      if (!resp.ok) {
        appendLog('Withdrawal rejected: ' + (data.error || resp.statusText), 'alert');
        return;
      }
      setDealState(prev => ({
        ...prev,
        escrow_status: data.deal?.escrow_status ?? 'released',
        funds_locked : data.deal?.funds_locked  ?? false
      }));
      setSysStatus({ label: 'Withdrawal Complete', type: 'active' });
      const payout = data.payout_amount != null ? fmtUsd(data.payout_amount) : '—';
      appendLog('Escrow released. Net payout: ' + payout + '. LC: ' + (data.lc_reference_number || 'N/A'), 'success');
    } catch (err) {
      appendLog('Withdrawal error: ' + err.message, 'alert');
    }
  }

  async function handleCreateRoom() {
    if (!roomCompany.trim()) {
      setRoomStatus({ msg: 'Enter your company name.', type: 'error' });
      return;
    }
    setRoomStatus({ msg: 'Creating encrypted room...', type: 'loading' });
    try {
      const resp = await fetch(`${FUNCTION_HOST}/generateInstantRoom`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ creator_company: roomCompany.trim() })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setRoomStatus({ msg: 'Error: ' + (data.error || resp.statusText), type: 'error' });
        appendLog('Meeting room creation failed: ' + (data.error || resp.statusText), 'alert');
        return;
      }
      setRoomStatus({ msg: 'Room created — redirecting...', type: 'success' });
      appendLog('Secure meeting room created. Token: ' + (data.room_token || '—'), 'success');
      if (data.share_link) {
        setTimeout(() => { window.location.href = data.share_link; }, 1200);
      }
    } catch (err) {
      setRoomStatus({ msg: 'Network error.', type: 'error' });
      appendLog('Meeting room error: ' + err.message, 'alert');
    }
  }

  async function handleInitShipment() {
    if (!scOrderId.trim() || !scOrigin.trim() || !scDestination.trim()) {
      setScStatus({ msg: 'Order ID, origin, and destination required.', type: 'error' });
      return;
    }
    setScStatus({ msg: 'Initializing shipment record...', type: 'loading' });
    try {
      const resp = await fetch(`${FUNCTION_HOST}/supplyChainCoordinator`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ action: 'init_shipment', order_id: scOrderId.trim(), carrier_id: scCarrierId.trim(), origin: scOrigin.trim(), destination: scDestination.trim() })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setScStatus({ msg: 'Error: ' + (data.error || resp.statusText), type: 'error' });
        appendLog('Shipment init failed: ' + (data.error || resp.statusText), 'alert');
        return;
      }
      const tracking = data.tracking_record;
      setScStatus({ msg: 'Manifest created · ' + (tracking?.id?.substring(0, 8) || '—'), type: 'success' });
      appendLog('Shipment initialized. Order: ' + scOrderId + ' | Route: ' + scOrigin + ' → ' + scDestination, 'success');
    } catch (err) {
      setScStatus({ msg: 'Network error.', type: 'error' });
      appendLog('Supply chain error: ' + err.message, 'alert');
    }
  }

  async function handleComplianceScan() {
    if (!complianceText.trim()) {
      setScanStatus({ msg: 'Enter contract text or trade note.', type: 'error' });
      return;
    }
    const effectiveRoomId = complianceRoomId.trim() || '00000000-0000-0000-0000-000000000000';
    setScanStatus({ msg: 'Scanning for OFAC, AML, KYC violations...', type: 'loading' });
    try {
      const resp = await fetch(`${FUNCTION_HOST}/aiComplianceLawyer`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ room_id: effectiveRoomId, conversation_text: complianceText.trim() })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setScanStatus({ msg: 'Error: ' + (data.error || resp.statusText), type: 'error' });
        appendLog('Compliance scan failed: ' + (data.error || resp.statusText), 'alert');
        return;
      }
      if (data.kill_switch_triggered) {
        setScanStatus({ msg: '⚠ Critical violation detected — kill switch triggered.', type: 'error' });
        setSysStatus({ label: 'Kill Switch Triggered', type: 'alert' });
        appendLog('CRITICAL: Compliance kill switch triggered. ' + (data.kill_switch_reason || ''), 'alert');
        (Array.isArray(data.violations) ? data.violations : []).forEach(v =>
          appendLog('Violation: ' + v.type + ' — ' + v.description, 'alert')
        );
      } else {
        const count = Array.isArray(data.violations) ? data.violations.length : 0;
        setScanStatus({ msg: count === 0 ? 'Compliant — no violations found.' : count + ' issue(s) flagged.', type: count === 0 ? 'success' : 'loading' });
        appendLog('Compliance scan complete. Violations: ' + count + '. Legal frameworks applied: ' + (data.legal_frameworks_applied?.length || 0), count === 0 ? 'success' : 'warning');
        if (Array.isArray(data.violations)) {
          data.violations.forEach(v => appendLog('Flag: ' + v.type + ' [' + v.severity + '] — ' + v.description, 'warning'));
        }
      }
      setDealState(prev => ({
        ...prev,
        compliance_status: data.kill_switch_triggered ? 'failed' : (data.violations?.length ? 'pending' : 'verified')
      }));
    } catch (err) {
      setScanStatus({ msg: 'Network error.', type: 'error' });
      appendLog('Compliance scan error: ' + err.message, 'alert');
    }
  }

  async function handleAnalyzeTrade() {
    const context = [
      'Deal ID: ' + dealId,
      'Amount: ' + fmtUsd(Number(dealAmount)),
      'Region: ' + region,
      'LC Reference: ' + lcReference,
      'Entry fee: ' + dealState.entry_fee_status,
      'Handshake: ' + dealState.handshake_status,
      'Compliance: ' + dealState.compliance_status
    ].join('. ');
    appendLog('Sending current deal context to AI analysis engine...', 'info');
    setSysStatus({ label: 'Analyzing', type: 'busy' });
    try {
      const resp = await fetch(`${FUNCTION_HOST}/aiAgentAnalyze`, {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({ text: context, room: dealId || 'homepage' })
      });
      const data = await resp.json();
      if (!resp.ok) {
        appendLog('AI analysis error: ' + (data.error || resp.statusText), 'alert');
        setSysStatus({ label: 'Active', type: 'active' });
        return;
      }
      setSysStatus({ label: 'Analysis Ready', type: 'active' });
      const insights = Array.isArray(data.insights) ? data.insights : [];
      appendLog('AI analysis complete. ' + insights.length + ' insight(s) returned.', 'success');
      insights.forEach(i => appendLog('Insight: ' + i, 'warning'));
      if (insights.length === 0) appendLog('No additional insights at this time.', 'info');
    } catch (err) {
      appendLog('AI analysis error: ' + err.message, 'alert');
      setSysStatus({ label: 'Active', type: 'active' });
    }
  }

  function handleStartConversation() {
    setConvLog([]);
    const userLang  = NEGOTIATION_PHRASES[language]   || NEGOTIATION_PHRASES.en;
    const ctrLang   = NEGOTIATION_PHRASES[cpLanguage] || NEGOTIATION_PHRASES.en;
    appendConversation('You',          userLang.hello);
    setTimeout(() => appendConversation('Counterparty', ctrLang.hello),    500);
    setTimeout(() => appendConversation('You',          userLang.reply),   1000);
    setTimeout(() => appendConversation('Counterparty', ctrLang.reply),    1500);
    appendLog('Multilingual negotiation channel opened.', 'success');
    setSysStatus({ label: 'Negotiation Active', type: 'active' });
  }

  function handleVaultPayScroll() {
    document.getElementById('lp-deal-id-input')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    appendLog('Directed to deal activation. Fill in Deal ID and Buyer ID to begin.', 'info');
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="bg-slate-50 text-slate-800 font-sans min-h-screen antialiased">

      {/* ═══ TOP MARKET TICKER ═══ */}
      <div className="bg-slate-900 text-slate-400 text-xs py-1.5 px-4 overflow-hidden whitespace-nowrap border-b border-slate-800 font-mono select-none">
        <div className="animate-marquee space-x-10">
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>GREENS ACC INDEX (AGRI/USD) $14.20 <span className="text-emerald-400">+1.4%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>FREIGHT INDEX (GLOBAL) $3,450 <span className="text-emerald-400">+0.8%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>USD / EGP 47.85 <span className="text-emerald-400">+2.1%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-slate-500"></span>USD / AED 3.67 <span className="text-slate-400">0.0%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-rose-400"></span>USD / TRY 32.45 <span className="text-rose-400">-0.5%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>USD / MNT 3,420 <span className="text-emerald-400">+0.2%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>USD / INR 83.20 <span className="text-emerald-400">+0.3%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>USD / PLN 3.98 <span className="text-emerald-400">+0.1%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-slate-500"></span>USD / CNY 7.24 <span className="text-slate-400">0.0%</span></span>
          {/* duplicate band for seamless loop */}
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>GREENS ACC INDEX (AGRI/USD) $14.20 <span className="text-emerald-400">+1.4%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>FREIGHT INDEX (GLOBAL) $3,450 <span className="text-emerald-400">+0.8%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>USD / EGP 47.85 <span className="text-emerald-400">+2.1%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-slate-500"></span>USD / AED 3.67 <span className="text-slate-400">0.0%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-rose-400"></span>USD / TRY 32.45 <span className="text-rose-400">-0.5%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>USD / MNT 3,420 <span className="text-emerald-400">+0.2%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>USD / INR 83.20 <span className="text-emerald-400">+0.3%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-emerald-400"></span>USD / PLN 3.98 <span className="text-emerald-400">+0.1%</span></span>
          <span className="inline-flex items-center gap-2"><span className="status-dot bg-slate-500"></span>USD / CNY 7.24 <span className="text-slate-400">0.0%</span></span>
        </div>
      </div>

      {/* ═══ NAVIGATION ═══ */}
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex flex-col sm:flex-row justify-between items-center gap-4">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-600 rounded-xl flex items-center justify-center shadow-sm flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" className="w-5 h-5">
                <path d="M19.5 21a3 3 0 003-3v-4.5a3 3 0 00-3-3h-1.5V9a3 3 0 00-3-3h-3V4.5a3 3 0 00-3-3H4.5a3 3 0 00-3 3V9a3 3 0 003 3H6v1.5a3 3 0 003 3h3V18a3 3 0 003 3h4.5zM6 10.5H4.5a1.5 1.5 0 01-1.5-1.5V4.5a1.5 1.5 0 011.5-1.5H9a1.5 1.5 0 011.5 1.5V6H9a3 3 0 00-3 3v1.5z" />
              </svg>
            </div>
            <div>
              <p className="text-lg font-black tracking-tight text-slate-900 leading-none">Greens ACC</p>
              <p className="text-[10px] text-emerald-600 font-bold tracking-widest uppercase font-mono leading-none mt-0.5">Secure Access &amp; Compliance Command</p>
            </div>
          </div>

          {/* Platform nav links */}
          <div className="hidden sm:flex items-center gap-4">
            <a href="marketplace.html" className="text-xs font-semibold text-slate-600 hover:text-emerald-600 transition-colors">Marketplace</a>
            <a href="deal-room.html" className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 transition-colors">Deal Room ↗</a>
            <a href="#/login" className="text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-lg transition-colors">Member Portal →</a>
          </div>

          {/* Locale controls */}
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Region</label>
              <select
                value={region}
                onChange={e => { setRegion(e.target.value); appendLog('Operating region set to ' + (e.target.options[e.target.selectedIndex]?.text || e.target.value) + '.', 'info'); }}
                className="lp-select bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-1.5 text-slate-700 cursor-pointer"
              >
                <option value="global">🌍 Global</option>
                <option value="us">🇺🇸 United States</option>
                <option value="ae">🇦🇪 UAE</option>
                <option value="eg">🇪🇬 Egypt</option>
                <option value="in">🇮🇳 India</option>
                <option value="pl">🇵🇱 Poland</option>
                <option value="fr">🇫🇷 France</option>
                <option value="cn">🇨🇳 China</option>
                <option value="mn">🇲🇳 Mongolia</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Interface Language</label>
              <select
                value={language}
                onChange={e => { setLanguage(e.target.value); appendLog('Interface language updated.', 'success'); }}
                className="lp-select bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-1.5 text-slate-700 cursor-pointer"
              >
                <option value="en">🇬🇧 English</option>
                <option value="ar">🇦🇪 العربية</option>
                <option value="hi">🇮🇳 हिन्दी</option>
                <option value="pl">🇵🇱 Polski</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="zh">🇨🇳 中文</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Counterparty Language</label>
              <select
                value={cpLanguage}
                onChange={e => setCpLanguage(e.target.value)}
                className="lp-select bg-white border border-slate-200 rounded-lg text-xs font-semibold px-3 py-1.5 text-slate-700 cursor-pointer"
              >
                <option value="en">🇬🇧 English</option>
                <option value="ar">🇦🇪 العربية</option>
                <option value="hi">🇮🇳 हिन्दी</option>
                <option value="pl">🇵🇱 Polski</option>
                <option value="fr">🇫🇷 Français</option>
                <option value="zh">🇨🇳 中文</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Local Time</label>
              <span className="text-xs font-mono text-slate-600 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg">{localTime}</span>
            </div>
          </div>

        </div>
      </nav>

      {/* ═══ MAIN CONTENT ═══ */}
      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Platform Header */}
        <header className="bg-white border border-slate-200 rounded-2xl px-7 py-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="status-dot bg-emerald-500"></span>
              <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest font-mono">All Systems Active</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Global B2B Command Center</h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">Authorized corporate access. AI-driven compliance monitoring. Secure escrow lifecycle. Multilingual global trade orchestration.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold border border-emerald-200">
              <span className="status-dot bg-emerald-500"></span>Supabase Connected
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 font-mono">
              AI Fee: 2% Brokerage
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold border border-slate-200 font-mono">
              Entry: $20.00 flat
            </span>
          </div>
        </header>

        {/* ─── THREE CORE PILLARS ─── */}
        <section>
          <div className="mb-4 flex items-center gap-3">
            <hr className="flex-1 stroke-separator" />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Core Platform Pillars</span>
            <hr className="flex-1 stroke-separator" />
          </div>
          <div className="grid gap-5 lg:grid-cols-3">

            {/* Pillar 1: Global B2B Meeting Room */}
            <div className="pillar-card bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" style={{ borderLeftColor: '#059669' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#059669" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                  </svg>
                </div>
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full font-mono">Pillar I</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-2">Global B2B Meeting Room</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">Encrypted, secure video and document rooms for international B2B trade sessions. WebRTC end-to-end. Kill-switch on compliance breach.</p>
              <hr className="stroke-separator mb-4" />
              <div className="space-y-2 mb-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Your Company</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Trading Ltd."
                    value={roomCompany}
                    onChange={e => setRoomCompany(e.target.value)}
                    className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800"
                  />
                </div>
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition"
              >
                Launch Secure Room
              </button>
              <p className={pillarStatusClass(roomStatus.type)}>{roomStatus.msg}</p>
            </div>

            {/* Pillar 2: Supply Chain Engine */}
            <div className="pillar-card bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" style={{ borderLeftColor: '#0891b2' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 bg-cyan-50 border border-cyan-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#0891b2" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 00-3.213-9.193 2.056 2.056 0 00-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 00-10.026 0 1.106 1.106 0 00-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                  </svg>
                </div>
                <span className="text-[9px] font-bold text-cyan-600 uppercase tracking-widest bg-cyan-50 border border-cyan-100 px-2 py-1 rounded-full font-mono">Pillar II</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-2">Supply Chain Engine</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">End-to-end shipment tracking for international commodities. Carrier assignment, milestone progression, and real-time logistics audit trail.</p>
              <hr className="stroke-separator mb-4" />
              <div className="space-y-2 mb-5">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Order ID</label>
                    <input type="text" placeholder="ORD-0001" value={scOrderId} onChange={e => setScOrderId(e.target.value)} className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Carrier</label>
                    <input type="text" placeholder="Optional" value={scCarrierId} onChange={e => setScCarrierId(e.target.value)} className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Origin</label>
                    <input type="text" placeholder="e.g. Cairo, EG" value={scOrigin} onChange={e => setScOrigin(e.target.value)} className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Destination</label>
                    <input type="text" placeholder="e.g. Dubai, AE" value={scDestination} onChange={e => setScDestination(e.target.value)} className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" />
                  </div>
                </div>
              </div>
              <button onClick={handleInitShipment} className="w-full px-4 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition">
                Initialize Shipment
              </button>
              <p className={pillarStatusClass(scStatus.type)}>{scStatus.msg}</p>
            </div>

            {/* Pillar 3: AI Legal Compliance Monitor */}
            <div className="pillar-card bg-white border border-slate-200 rounded-2xl p-6 shadow-sm" style={{ borderLeftColor: '#7c3aed' }}>
              <div className="flex items-start justify-between mb-4">
                <div className="h-10 w-10 bg-violet-50 border border-violet-200 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="#7c3aed" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0c-1.472 0-2.882.265-4.185.75M12 20.25c1.472 0 2.882.265 4.185.75M18.75 4.97A48.416 48.416 0 0012 4.5c-2.291 0-4.545.16-6.75.47m13.5 0c1.01.143 2.01.317 3 .52m-3-.52l2.62 10.726c.122.499-.106 1.028-.589 1.202a5.988 5.988 0 01-2.031.352 5.988 5.988 0 01-2.031-.352c-.483-.174-.711-.703-.59-1.202L18.75 4.97zm-16.5 0c-.99.143-1.99.317-2.999.52m2.999-.52L5.13 15.696c-.122.499.106 1.028.589 1.202a5.989 5.989 0 002.031.352 5.989 5.989 0 002.031-.352c.483-.174.711-.703.59-1.202L5.25 4.97z" />
                  </svg>
                </div>
                <span className="text-[9px] font-bold text-violet-600 uppercase tracking-widest bg-violet-50 border border-violet-100 px-2 py-1 rounded-full font-mono">Pillar III</span>
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-2">AI Legal Compliance Monitor</h2>
              <p className="text-xs text-slate-500 leading-relaxed mb-5">OFAC, AML, KYC, and CISG-aligned contract scanning. Detects sanction violations and illegal commodities. Includes automated kill-switch and audit logging.</p>
              <hr className="stroke-separator mb-4" />
              <div className="space-y-2 mb-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Contract Text or Trade Note</label>
                  <textarea
                    rows={3}
                    placeholder="Paste contract clause, trade note, or conversation excerpt for AI compliance review..."
                    value={complianceText}
                    onChange={e => setComplianceText(e.target.value)}
                    className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 resize-none"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Room / Contract ID (optional)</label>
                  <input type="text" placeholder="Room or Contract UUID" value={complianceRoomId} onChange={e => setComplianceRoomId(e.target.value)} className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800" />
                </div>
              </div>
              <button onClick={handleComplianceScan} className="w-full px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold uppercase tracking-widest rounded-xl transition">
                Run AI Compliance Scan
              </button>
              <p className={pillarStatusClass(scanStatus.type)}>{scanStatus.msg}</p>
            </div>

          </div>
        </section>

        {/* ─── DEAL ACTIVATION & ESCROW LIFECYCLE ─── */}
        <section className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-7 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">Verification Gate</p>
              <h2 className="text-lg font-black text-slate-900">Deal Activation &amp; Escrow Lifecycle</h2>
              <p className="text-xs text-slate-500 mt-0.5">Flat $20.00 access activation · 2% L/C brokerage commission · AI-verified safe withdrawal</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-full border border-slate-200">
              <span className="status-dot bg-slate-400"></span>
              <span>{lifecycleStage}</span>
            </div>
          </div>

          <div className="p-7 grid gap-6 lg:grid-cols-2">

            {/* Left: Deal inputs */}
            <div className="space-y-4">
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-emerald-700 uppercase tracking-widest font-mono">Entry Access Fee</p>
                    <p className="text-xl font-black text-slate-900 mt-0.5">$20.00 USD</p>
                    <p className="text-[10px] text-emerald-800 mt-0.5">One-time flat activation · separate from deal amount · non-refundable</p>
                  </div>
                  <span className="text-[9px] font-bold bg-white border border-emerald-200 text-emerald-700 px-2 py-1 rounded-full font-mono uppercase">Required first</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Deal ID *</label>
                  <input id="lp-deal-id-input" type="text" placeholder="UUID" value={dealId} onChange={e => setDealId(e.target.value)} className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono" />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Buyer ID *</label>
                  <input type="text" placeholder="UUID" value={buyerId} onChange={e => setBuyerId(e.target.value)} className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">Deal Amount (USD) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={dealAmount}
                    onChange={e => setDealAmount(e.target.value)}
                    className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">L/C Reference</label>
                  <input type="text" placeholder="LCR-0001" value={lcReference} onChange={e => setLcReference(e.target.value)} className="lp-input w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                <button onClick={handleEntryFee} className="px-3 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition">Pay $20 Access</button>
                <button onClick={handleHandshake} className="px-3 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition">Lock L/C + 2%</button>
                <button onClick={handleWithdrawal} className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10px] font-bold uppercase tracking-widest rounded-xl border border-slate-200 transition">Safe Withdrawal</button>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">Withdrawal requires: entry fee paid · handshake confirmed · all 3 AI agents verified · compliance cleared.</p>
            </div>

            {/* Right: Status grid */}
            <div className="flex flex-col gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Entry Fee</p>
                  <p className="text-base font-black text-slate-900">{dealState.entry_fee_status}</p>
                  <p className="text-[10px] text-slate-400 mt-1">$20.00 flat access</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Handshake</p>
                  <p className="text-base font-black text-slate-900">{dealState.handshake_status}</p>
                  <p className="text-[10px] text-slate-400 mt-1">L/C session</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Compliance</p>
                  <p className="text-base font-black text-slate-900">{dealState.compliance_status}</p>
                  <p className="text-[10px] text-slate-400 mt-1">KYC / AML / OFAC</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Escrow</p>
                  <p className="text-base font-black text-slate-900">{dealState.escrow_status}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Fund custody</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">AI Agents</p>
                  <div className="flex flex-col gap-1">
                    {['agent1', 'agent2', 'agent3'].map((key, i) => (
                      <span key={key} className={agentBadgeClass(dealState.ai_agent_status[key])}>
                        {i + 1} {dealState.ai_agent_status[key]}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Commission</p>
                  <p className="text-base font-black text-slate-900">{commission}</p>
                  <p className="text-[10px] text-slate-400 mt-1">2% brokerage</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-1.5">Deal Amount</p>
                  <p className="text-base font-black text-slate-900">{dealAmountDisplay}</p>
                  <p className="text-[10px] text-slate-400 mt-1">From input</p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">Secure Trade Policy</p>
                <ul className="space-y-1.5 text-[10px] text-slate-500">
                  <li className="flex items-start gap-2"><span className="status-dot bg-emerald-500 mt-0.5 flex-shrink-0"></span>All deals require KYC, AML, and compliance verification before payment.</li>
                  <li className="flex items-start gap-2"><span className="status-dot bg-emerald-500 mt-0.5 flex-shrink-0"></span>No sanctioned entities, illegal goods, or illicit financing permitted.</li>
                  <li className="flex items-start gap-2"><span className="status-dot bg-emerald-500 mt-0.5 flex-shrink-0"></span>AI monitors conversations, behavior, and handshake risk continuously.</li>
                  <li className="flex items-start gap-2"><span className="status-dot bg-emerald-500 mt-0.5 flex-shrink-0"></span>Suspicious activity is blocked, reported, and escalated for analyst review.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ─── NEGOTIATION SUPPORT + AI ACTIVITY LOG ─── */}
        <section className="grid gap-6 lg:grid-cols-2">

          {/* Secure Negotiation */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-0.5">Multilingual Negotiation Support</p>
              <h3 className="text-base font-bold text-slate-900">Secure Negotiation Channel</h3>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500">AI-assisted multilingual negotiation. Each party communicates in their preferred language. Logs kept for compliance review.</p>
              <div ref={convLogRef} className="min-h-[180px] max-h-[240px] overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
                {convLog.length === 0
                  ? <p className="text-xs text-slate-400 italic">Negotiation exchange will appear here when started.</p>
                  : convLog.map((entry, i) => (
                    <p key={i} className="text-sm leading-relaxed">
                      <strong className="text-slate-700">{entry.speaker}:</strong> {entry.message}
                    </p>
                  ))
                }
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={handleStartConversation} className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition">Start Negotiation</button>
                <button onClick={handleAnalyzeTrade} className="px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-[10px] font-bold uppercase tracking-widest rounded-xl transition">AI Trade Analysis</button>
              </div>
            </div>
          </div>

          {/* Activity Log */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono mb-0.5">AI Monitoring</p>
                <h3 className="text-base font-bold text-slate-900">System Activity Log</h3>
              </div>
              <span className={sysStatusClasses(sysStatus.type)}>
                <span className={sysDotClass(sysStatus.type)}></span>
                {sysStatus.label}
              </span>
            </div>
            <div className="p-6">
              <div ref={actLogRef} className="min-h-[220px] max-h-[280px] overflow-y-auto rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-2 text-xs">
                {actLog.length === 0
                  ? <p className="text-slate-400 italic">System activity will be logged here.</p>
                  : actLog.map((entry, i) => (
                    <p key={i} className={'leading-relaxed log-entry-' + entry.level}>
                      <span className="font-mono text-slate-400 mr-2">{entry.time}</span>
                      {entry.message}
                    </p>
                  ))
                }
              </div>
            </div>
          </div>
        </section>

        {/* ─── CORPORATE VERIFICATION GATE ─── */}
        <section className="bg-white border border-amber-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-7 py-5 border-b border-amber-100 bg-amber-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 bg-amber-100 border border-amber-300 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="#d97706" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <div>
                <p className="text-[9px] font-bold text-amber-700 uppercase tracking-widest font-mono">Corporate Access Required</p>
                <h3 className="text-base font-bold text-slate-900">Protected Corporate Information Vault</h3>
              </div>
            </div>
            <span className="text-[9px] font-bold bg-amber-100 border border-amber-300 text-amber-800 px-3 py-1.5 rounded-full font-mono uppercase">24-Hour KYB Review</span>
          </div>
          <div className="p-7 grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">To unlock global trade logistics data, AI-negotiated bids, and direct bi-directional client conversations, register your corporate entity and submit documentation for a banking-grade compliance audit.</p>
              <div className="space-y-2">
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="status-dot bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <span><strong>$20.00 USD</strong> access activation fee · one-time · non-refundable</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="status-dot bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <span>Official trade registry &amp; company name submission</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="status-dot bg-amber-400 mt-1 flex-shrink-0"></span>
                  <span><strong>24-hour mandatory period</strong> · background documentation verification</span>
                </div>
                <div className="flex items-start gap-2 text-xs text-slate-600">
                  <span className="status-dot bg-emerald-500 mt-1 flex-shrink-0"></span>
                  <span>AI-monitored compliance scan before corporate account activation</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-between gap-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-800 mb-2">What you unlock</p>
                <p className="flex items-center gap-2"><span className="status-dot bg-cyan-500 flex-shrink-0"></span>Live global B2B meeting rooms with document sharing</p>
                <p className="flex items-center gap-2"><span className="status-dot bg-violet-500 flex-shrink-0"></span>Direct AI-assisted multilingual negotiation streams</p>
                <p className="flex items-center gap-2"><span className="status-dot bg-emerald-500 flex-shrink-0"></span>Full supply chain visibility and carrier assignment</p>
                <p className="flex items-center gap-2"><span className="status-dot bg-amber-500 flex-shrink-0"></span>Real-time AI legal compliance monitor on every trade</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-xl border border-slate-200 uppercase tracking-widest transition">Register Company</button>
                <button onClick={handleVaultPayScroll} className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold rounded-xl uppercase tracking-widest transition">Pay $20 &amp; Begin</button>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ═══ FOOTER ═══ */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-6 py-5 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-400 font-mono">Greens ACC · Secure Access &amp; Compliance Command · All trade activity monitored.</p>
          <div className="flex items-center gap-6">
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tools</p>
              <div className="flex items-center gap-3">
                <a href="deal-room.html" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">Deal Room</a>
                <a href="marketplace.html" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">Marketplace</a>
                <a href="fulfillment.html" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">Fulfillment</a>
                <a href="tokens.html" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">API Tokens</a>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Account</p>
              <div className="flex items-center gap-3">
                <a href="#/login" className="text-xs text-slate-400 hover:text-emerald-600 transition-colors">Member Portal</a>
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400">CISG · INCOTERMS 2020 · OFAC / AML / KYC compliant infrastructure</p>
        </div>
      </footer>

    </div>
  );
}
