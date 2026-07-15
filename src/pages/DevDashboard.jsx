import AppNav from '../components/AppNav';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';

function StatusBadge({ label, value, color = 'emerald' }) {
  const colorMap = {
    emerald: 'bg-emerald-900/30 border-emerald-700/50 text-emerald-300',
    blue:    'bg-blue-900/30 border-blue-700/50 text-blue-300',
    amber:   'bg-amber-900/30 border-amber-700/50 text-amber-300',
  };
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color] ?? colorMap.emerald}`}>
      <p className="text-xs uppercase tracking-wider opacity-60 mb-1">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

/**
 * DevDashboard — limited view for the 'developer' role.
 *
 * Developer access is intentionally narrower than admin:
 *  • read-only system health overview
 *  • no access to financial, deal, or user management data
 */
export default function DevDashboard() {
  const { user, role, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950">
      <AppNav />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-extrabold text-slate-100">
              Developer Console
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Read-only system overview · role:{' '}
              <span className="font-mono text-emerald-400">{role}</span>
            </p>
          </div>
          <button
            onClick={signOut}
            className="text-xs text-slate-400 hover:text-red-400 px-3 py-1.5
              bg-slate-800 rounded-lg border border-slate-700 transition-colors"
          >
            Sign Out
          </button>
        </div>

        {/* Identity card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">
            Authenticated As
          </p>
          <p className="text-sm font-mono text-slate-200 truncate">
            {user?.email ?? '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            UID: <span className="font-mono">{user?.id ?? '—'}</span>
          </p>
        </div>

        {/* System health tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatusBadge label="Access Level"  value="Developer"  color="blue"    />
          <StatusBadge label="Auth Status"   value="Active"     color="emerald" />
          <StatusBadge label="Platform"      value="Greens ACC" color="emerald" />
          <StatusBadge label="Environment"   value="Production" color="amber"   />
        </div>

        {/* Permitted areas */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-bold text-slate-300 mb-3">
            Permitted Areas
          </h2>
          <ul className="space-y-2 text-sm text-slate-400">
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              Developer Console (this page)
            </li>
            <li className="flex items-center gap-2">
              <span className="text-emerald-500">✓</span>
              Read-only system health
            </li>
          </ul>
        </div>

        {/* Restricted notice */}
        <div className="bg-red-950/30 border border-red-800/40 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-red-300 mb-2">
            🔒 Restricted Areas
          </h2>
          <p className="text-xs text-red-400/80">
            Financial data, deal management, user administration, and the admin
            control room are not accessible with the developer role. Contact an
            admin to request elevated access.
          </p>
          <div className="mt-3">
            <Link
              to="/unauthorized"
              className="text-xs text-red-400 underline hover:text-red-300"
            >
              View access policy
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
