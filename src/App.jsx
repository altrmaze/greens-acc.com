import MarketClocks   from './components/MarketClocks';
import MarketFeeds    from './components/MarketFeeds';
import DealsGrid      from './components/DealsGrid';
import { DashboardGuard }   from './components/DashboardGuard';
import { CodeSpaceConsole } from './components/CodeSpaceConsole';
import { DevGate }          from './components/DevGate';

/**
 * Root application component — Greens ACC
 *
 * The entire application is wrapped in DevGate.  When the
 * VITE_DEV_GATE_TOKEN environment variable is set the user must enter a
 * matching token before any content mounts (useful for staging / preview
 * environments).  When the variable is absent the gate is a no-op and
 * the app renders normally.
 *
 * Each protected panel inside is also wrapped in a DashboardGuard that
 * resolves the authenticated user's role from Supabase before mounting.
 */
export default function App() {
  return (
    <DevGate>
      {/* ── Public Trading HUD ─────────────────────────────────── */}
      <MarketClocks />
      <MarketFeeds />
      <DealsGrid />

      {/* ── Role-Isolated Dashboards ───────────────────────────── */}

      {/* Super Admin — root configuration panel */}
      <DashboardGuard requiredRole="admin" allowAdmin={false}>
        <AdminPanel />
      </DashboardGuard>

      {/* Account Manager — oversight analytics & approvals */}
      <DashboardGuard requiredRole="account_manager">
        <AccountManagerPanel />
      </DashboardGuard>

      {/* Financial Manager — macro finance & FX */}
      <DashboardGuard requiredRole="financial_manager">
        <FinancialManagerPanel />
      </DashboardGuard>

      {/* Accounting Staff — data-entry only, no global summaries */}
      <DashboardGuard requiredRole="accounting_staff">
        <AccountingStaffPanel />
      </DashboardGuard>

      {/* Software Engineer — embedded Codespaces console */}
      <DashboardGuard requiredRole="software_engineer">
        <CodeSpaceConsole />
      </DashboardGuard>

      {/* Analyzer — read-only projections */}
      <DashboardGuard requiredRole="analyzer">
        <AnalyzerPanel />
      </DashboardGuard>
    </DevGate>
  );
}

/* ── Panel stubs ──────────────────────────────────────────────────── */

function AdminPanel() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <PanelHeader icon="🔑" title="Super Admin" subtitle="Root configuration — unrestricted overrides" />
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {['Platform Toggle Controls','User Management','Audit Logs','System Overrides','RBAC Config','Billing Root'].map((m) => (
          <ModuleCard key={m} label={m} />
        ))}
      </div>
    </section>
  );
}

function AccountManagerPanel() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <PanelHeader icon="📊" title="Account Manager" subtitle="Executive analytics, manifest approvals & accounting audit logs" />
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {['Corporate Balance Sheet','Ledger Creation','Manifest Approvals','Accounting Audit Logs','Trade Contract Auth','Client Analytics'].map((m) => (
          <ModuleCard key={m} label={m} />
        ))}
      </div>
    </section>
  );
}

function FinancialManagerPanel() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <PanelHeader icon="💹" title="Financial Manager" subtitle="Macro reporting, cross-border tax config & currency risk" />
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {['Macro Financial Summary','Cross-Border Tax Config','Currency Fluctuation Dashboard','Operational Cost Reports','FX Risk Metrics','Budget Projections'].map((m) => (
          <ModuleCard key={m} label={m} />
        ))}
      </div>
    </section>
  );
}

function AccountingStaffPanel() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <PanelHeader icon="📋" title="Accounting" subtitle="Data entry · Invoice processing · Individual ledger inputs" />
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-xs text-amber-800 font-medium">
        This workspace is restricted to data-entry and invoice processing.
        Global financial summaries, approval buttons, and contract signatures are
        not available at this clearance level.
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {['New Invoice Entry','Individual Billing Log','Manual Ledger Input','My Submitted Records'].map((m) => (
          <ModuleCard key={m} label={m} />
        ))}
      </div>
    </section>
  );
}

function AnalyzerPanel() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <PanelHeader icon="🔬" title="Analyzing Team" subtitle="Read-only market projections & predictive model histories" />
      <div className="grid sm:grid-cols-3 gap-4 mt-6">
        {['Market Projection Tables','Predictive Model History','System View','Trade Analytics','Risk Dashboard','Report Archive'].map((m) => (
          <ModuleCard key={m} label={m} />
        ))}
      </div>
    </section>
  );
}

/* ── Shared UI primitives ─────────────────────────────────────────── */

function PanelHeader({ icon, title, subtitle }) {
  return (
    <div>
      <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
        <span>{icon}</span> {title}
      </h2>
      <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
    </div>
  );
}

function ModuleCard({ label }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold
      text-slate-700 hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer">
      {label}
    </div>
  );
}
