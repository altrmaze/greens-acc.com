import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { AdminProvider, useAdmin } from '../../context/AdminContext';
import ErrorBoundary from '../../components/ErrorBoundary';
import DashboardSection from './sections/DashboardSection';
import UsersSection from './sections/UsersSection';
import DevelopersSection from './sections/DevelopersSection';
import SettingsSection from './sections/SettingsSection';
import AuditLogsSection from './sections/AuditLogsSection';

// TEMPORARY OWNER PREVIEW — must match the constant in AdminRoute.jsx.
// Remove both constants once the profiles row is confirmed in Supabase.
const OWNER_PREVIEW_EMAIL = 'altrmaze00@gmail.com';

const NAV_ITEMS = [
  { key: 'overview',   icon: '📊', label: 'Dashboard', component: DashboardSection },
  { key: 'users',      icon: '👥', label: 'Users', component: UsersSection },
  { key: 'developers', icon: '⚙️', label: 'Developers', component: DevelopersSection },
  { key: 'settings',   icon: '🔧', label: 'Settings', component: SettingsSection },
  { key: 'audit-logs', icon: '📋', label: 'Audit Logs', component: AuditLogsSection },
];

function SidebarLink({ icon, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
        active
          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
          : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
      }`}
    >
      <span className="text-base leading-none">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function AdminNotification() {
  const { notification, clearNotification } = useAdmin();
  useEffect(() => {
    if (!notification) return;
    const t = setTimeout(clearNotification, 4000);
    return () => clearTimeout(t);
  }, [notification, clearNotification]);

  if (!notification) return null;

  const colorMap = {
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    error:   'bg-red-500/10 border-red-500/30 text-red-300',
    info:    'bg-blue-500/10 border-blue-500/30 text-blue-300',
  };
  const cls = colorMap[notification.type] ?? colorMap.info;

  return (
    <div
      role="alert"
      className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl text-sm font-semibold max-w-sm transition-all ${cls}`}
    >
      <span className="flex-1">{notification.message}</span>
      <button
        onClick={clearNotification}
        className="text-current opacity-60 hover:opacity-100 transition-opacity text-base leading-none"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}

function AdminShell() {
  const { user, signOut } = useAuth();
  const navigate          = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionKey = searchParams.get('section') ?? 'overview';
  const activeItem = NAV_ITEMS.find(({ key }) => key === sectionKey) ?? NAV_ITEMS[0];
  const ActiveSection = activeItem.component;

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  const closeSidebar = () => setSidebarOpen(false);
  const selectSection = (key) => {
    const nextParams = new URLSearchParams(searchParams);
    if (key === 'overview') {
      nextParams.delete('section');
    } else {
      nextParams.set('section', key);
    }
    setSearchParams(nextParams, { replace: true });
    closeSidebar();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col">
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <header className="bg-slate-900 border-b border-emerald-500/20 shadow-lg sticky top-0 z-50 flex items-center px-4 h-14 gap-3">
        {/* Hamburger (mobile) */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="md:hidden p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors"
          aria-label="Toggle menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {sidebarOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            }
          </svg>
        </button>

        {/* Brand */}
        <span className="text-emerald-400 font-extrabold tracking-wide text-sm flex items-center gap-2 flex-shrink-0">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          GREENS ACC
        </span>

        <span className="text-slate-600 text-xs hidden sm:block ms-2">
          / Admin Control Room / {activeItem.label}
        </span>

        <div className="ms-auto flex items-center gap-3">
          {user && (
            <span className="text-xs text-slate-500 hidden sm:block truncate max-w-[200px]">
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

      {/* TEMPORARY OWNER PREVIEW banner — visible only for the owner bypass account */}
      {user?.email === OWNER_PREVIEW_EMAIL && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 py-2 flex items-center gap-2 text-amber-300 text-xs font-semibold">
          <span>⚠️</span>
          <span>Temporary Owner Preview — role-based access is bypassed for this session. Remove <code className="font-mono bg-amber-500/10 px-1 rounded">OWNER_PREVIEW_EMAIL</code> from AdminRoute.jsx and AdminControlRoom.jsx once the admin profile row is confirmed in Supabase.</span>
        </div>
      )}

      <div className="flex flex-1 relative">
        {/* ── Mobile sidebar overlay ──────────────────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={closeSidebar}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar ─────────────────────────────────────────────────── */}
        <aside
          className={`
            fixed md:sticky top-14 left-0 h-[calc(100vh-3.5rem)] z-40
            w-64 bg-slate-900 border-r border-slate-800
            flex flex-col gap-1 p-4 overflow-y-auto
            transition-transform duration-200
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          `}
        >
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-widest px-4 mb-2">
            Navigation
          </p>
          {NAV_ITEMS.map(({ key, icon, label }) => (
            <SidebarLink
              key={key}
              icon={icon}
              label={label}
              active={activeItem.key === key}
              onClick={() => selectSection(key)}
            />
          ))}

          {/* Bottom spacer + role badge */}
          <div className="mt-auto pt-4 border-t border-slate-800">
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Admin
              </span>
              <span className="text-xs text-slate-600 truncate">{user?.email ?? ''}</span>
            </div>
          </div>
        </aside>

        {/* ── Main content (wrapped in ErrorBoundary) ───────────────────── */}
        <main className="flex-1 min-w-0 p-6 md:p-8">
          <ErrorBoundary>
            <ActiveSection />
          </ErrorBoundary>
        </main>
      </div>

      {/* ── Toast notification ───────────────────────────────────────────── */}
      <AdminNotification />
    </div>
  );
}

export default function AdminControlRoom() {
  return (
    <AdminProvider>
      <AdminShell />
    </AdminProvider>
  );
}
