import AppNav from '../components/AppNav';
import MarketClocks from '../components/MarketClocks';
import MarketFeeds from '../components/MarketFeeds';
import DealsGrid from '../components/DealsGrid';
import { DashboardGuard } from '../components/DashboardGuard';
import { CodeSpaceConsole } from '../components/CodeSpaceConsole';

/**
 * Page 1 — Command Center
 *
 * Premium enterprise dashboard presenting real-time global market telemetry,
 * live trading clocks, deal flow, and role-gated admin / account-manager panels.
 */
export default function CommandCenter() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <AppNav />

      {/* ── Hero Banner ─────────────────────────────────────────────── */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-emerald-400 tracking-tight">
            🌐 Global Command Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Greens ACC · B2B Global Trading Platform · Real-time telemetry
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end gap-1">
          <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
            SYSTEM NOMINAL
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {new Date().toUTCString()}
          </span>
        </div>
      </header>

      {/* ── Live Trading Clocks ──────────────────────────────────────── */}
      <MarketClocks />

      {/* ── Market Feeds ────────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-4">
        <MarketFeeds />
      </section>

      {/* ── Active Deals Grid ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 py-4">
        <DealsGrid />
      </section>

      {/* ── Role-Gated Panels ───────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-6 pb-16 space-y-8">
        {/* Super Admin */}
        <DashboardGuard requiredRole="admin" allowAdmin={false}>
          <AdminPanel />
        </DashboardGuard>

        {/* Account Manager */}
        <DashboardGuard requiredRole="account_manager">
          <AccountManagerPanel />
        </DashboardGuard>

        {/* Software Engineer */}
        <DashboardGuard requiredRole="software_engineer">
          <CodeSpaceConsole />
        </DashboardGuard>
      </section>
    </div>
  );
}

/* ── Role panels ────────────────────────────────────────────────── */

function AdminPanel() {
  return (
    <section className="bg-slate-900 rounded-2xl border border-slate-800 px-6 py-8">
      <PanelHeader icon="🔑" title="Super Admin" subtitle="Root configuration — unrestricted overrides" />
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {['Platform Toggle Controls', 'User Management', 'Audit Logs', 'System Overrides', 'RBAC Config', 'Billing Root'].map((m) => (
          <ModuleCard key={m} label={m} />
        ))}
      </div>
    </section>
  );
}

function AccountManagerPanel() {
  return (
    <section className="bg-slate-900 rounded-2xl border border-slate-800 px-6 py-8">
      <PanelHeader icon="📊" title="Account Manager" subtitle="Executive analytics, manifest approvals & accounting audit logs" />
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {['Corporate Balance Sheet', 'Ledger Creation', 'Manifest Approvals', 'Accounting Audit Logs', 'Trade Contract Auth', 'Client Analytics'].map((m) => (
          <ModuleCard key={m} label={m} />
        ))}
      </div>
    </section>
  );
}

/* ── Shared UI primitives ───────────────────────────────────────── */

function PanelHeader({ icon, title, subtitle }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      <p className="text-sm text-slate-400 mt-1">{subtitle}</p>
    </div>
  );
}

function ModuleCard({ label }) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-4 text-sm font-semibold
      text-slate-300 hover:border-emerald-500/50 hover:bg-slate-700 transition-all cursor-pointer">
      {label}
    </div>
  );
}
