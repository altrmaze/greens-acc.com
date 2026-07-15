import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Dashboard — unified view for authenticated admin and developer users.
 *
 * Displays:
 *   • Greens ACC logo (top bar + sidebar)
 *   • Sidebar with Dashboard Home entry
 *   • Test Card showing current user and role
 *   • Logout button
 */
export default function Dashboard() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">

      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-emerald-500/20 shadow-lg sticky top-0 z-50 flex items-center px-6 h-14 gap-3">
        <span className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm tracking-wide flex-shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          GREENS ACC
        </span>
        <span className="text-slate-600 text-xs ms-2 hidden sm:block">/ Dashboard</span>

        <div className="ms-auto flex items-center gap-3">
          {user && (
            <span className="text-xs text-slate-500 hidden sm:block truncate max-w-[220px]">
              {user.email}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="text-xs font-semibold text-slate-400 hover:text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 transition-all"
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="flex flex-1">

        {/* ── Sidebar ──────────────────────────────────────────────── */}
        <aside className="w-56 bg-slate-900 border-r border-slate-800 flex flex-col p-4 gap-1 shrink-0">
          {/* Logo mark */}
          <div className="flex items-center gap-2 px-3 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-extrabold text-xs tracking-widest uppercase">
              Greens ACC
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-3 mb-1">
            Navigation
          </p>

          {/* Dashboard Home — active state (single page, always highlighted) */}
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="text-base leading-none">📊</span>
            <span>Dashboard Home</span>
          </div>

          {/* Bottom: role badge + email + logout */}
          <div className="mt-auto pt-4 border-t border-slate-800 space-y-2">
            <div className="px-3">
              <span className="text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full capitalize">
                {role ?? 'user'}
              </span>
            </div>
            <p className="text-xs text-slate-600 px-3 truncate">{user?.email ?? ''}</p>
            <button
              onClick={handleSignOut}
              className="w-full text-left text-xs font-semibold text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-red-500/10 border border-slate-700 hover:border-red-500/30 transition-all"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* ── Main content ─────────────────────────────────────────── */}
        <main className="flex-1 min-w-0 p-8">
          <h1 className="text-2xl font-extrabold text-slate-100 mb-1">Dashboard Home</h1>
          <p className="text-slate-500 text-sm mb-8">
            You are signed in to Greens ACC.
          </p>

          {/* Test Card */}
          <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-6 max-w-sm shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
                Test Card
              </h2>
            </div>

            <div className="space-y-0 divide-y divide-slate-800">
              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  User
                </span>
                <span className="text-xs font-mono text-slate-300 truncate max-w-[170px]">
                  {user?.email ?? '—'}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Role
                </span>
                <span className="text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full capitalize">
                  {role ?? '—'}
                </span>
              </div>

              <div className="flex items-center justify-between py-3">
                <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                  Status
                </span>
                <span className="text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  Authenticated ✓
                </span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
