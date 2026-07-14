import { useState } from 'react';

const DEMO_DEALS = [
  { ref: 'TL-2025-001', commodity: 'Organic Wheat — 2,400 MT',    origin: 'Ukraine → Egypt',       value: '$1.92M', incoterm: 'CIF Alexandria',  status: 'Active' },
  { ref: 'TL-2025-002', commodity: 'Green Coffee Beans — 480 MT', origin: 'Ethiopia → Germany',    value: '$864K',  incoterm: 'FOB Djibouti',   status: 'Negotiating' },
  { ref: 'TL-2025-003', commodity: 'Cotton Bale — 900 MT',        origin: 'Uzbekistan → Bangladesh', value: '$1.17M', incoterm: 'CFR Chittagong', status: 'Active' },
  { ref: 'TL-2025-004', commodity: 'Copper Cathode — 600 MT',     origin: 'Zambia → China',        value: '$5.4M',  incoterm: 'CIF Shanghai',   status: 'Under Review' },
  { ref: 'TL-2025-005', commodity: 'Frozen Chicken — 1,200 MT',   origin: 'Brazil → Saudi Arabia', value: '$2.16M', incoterm: 'CIF Jeddah',     status: 'Active' },
  { ref: 'TL-2025-006', commodity: 'Hardwood Timber — 320 CBM',   origin: 'Malaysia → UAE',        value: '$448K',  incoterm: 'FOB Port Klang', status: 'Negotiating' },
];

function LockIcon() {
  return (
    <svg className="w-5 h-5 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}

function PaywallModal({ onClose, onActivate }) {
  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <LockIcon />
          </div>
          <div>
            <p className="font-bold text-slate-900 text-sm">Access Restricted</p>
            <p className="text-xs text-slate-500">Corporate verified account required</p>
          </div>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed mb-6">
          To review the specifications of this international trade ledger, please register a corporate
          verified account and fulfill the one-time{' '}
          <strong>$20 compliance and activation onboarding fee</strong>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold
              text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Close
          </button>
          <button
            onClick={onActivate}
            className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold
              hover:bg-emerald-700 transition-colors"
          >
            Activate Account — $20
          </button>
        </div>
      </div>
    </div>
  );
}

function DealCard({ deal, onLockClick }) {
  return (
    <div
      className="relative rounded-xl border border-slate-200 bg-white p-5 cursor-pointer group overflow-hidden"
      onClick={onLockClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onLockClick()}
      aria-label="Locked trade ledger — click to unlock"
    >
      {/* Blurred content */}
      <div className="filter blur-sm group-hover:blur-md transition-all duration-200 select-none pointer-events-none">
        <p className="text-[10px] font-mono text-slate-400 mb-2">{deal.ref}</p>
        <p className="text-sm font-bold text-slate-900 mb-1">{deal.commodity}</p>
        <p className="text-xs text-slate-500 mb-3">📍 {deal.origin}</p>
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-emerald-700">{deal.value}</span>
          <span className="inline-block rounded bg-slate-100 border border-slate-200 text-slate-600
            text-[10px] font-bold px-2 py-0.5 uppercase tracking-wide">
            {deal.incoterm}
          </span>
        </div>
      </div>

      {/* Lock overlay — visible on hover */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2
        bg-white/75 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center">
          <LockIcon />
        </div>
        <span className="text-xs font-bold text-slate-700">Click to unlock</span>
      </div>
    </div>
  );
}

export default function DealsGrid() {
  const [modalOpen, setModalOpen] = useState(false);

  const handleActivate = () => {
    setModalOpen(false);
    // Route to payment gateway — scrolls to the existing entry-fee section
    document.getElementById('btn-pay-entry')?.click();
  };

  return (
    <section className="bg-slate-50 py-10 border-t border-slate-200">
      <div className="max-w-5xl mx-auto px-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">International Trade Ledger</h2>
            <p className="text-sm text-slate-500">Active wholesale deals, manifests &amp; container allocations</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold
            uppercase tracking-wide bg-amber-50 border border-amber-200 text-amber-700">
            🔒 Restricted Access
          </span>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {DEMO_DEALS.map((deal) => (
            <DealCard key={deal.ref} deal={deal} onLockClick={() => setModalOpen(true)} />
          ))}
        </div>
      </div>

      {modalOpen && (
        <PaywallModal
          onClose={() => setModalOpen(false)}
          onActivate={handleActivate}
        />
      )}
    </section>
  );
}
