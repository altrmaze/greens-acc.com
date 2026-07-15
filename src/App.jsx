import { Routes, Route } from 'react-router-dom';
import { DevGate }           from './components/DevGate';
import LandingPage           from './pages/LandingPage';
import CommandCenter         from './pages/CommandCenter';
import NegotiationRooms      from './pages/NegotiationRooms';
import AgentAnalytics        from './pages/AgentAnalytics';
import AdminRoute            from './components/AdminRoute';
import DeveloperRoute        from './components/DeveloperRoute';
import Login                 from './pages/Login';
import AdminControlRoom      from './pages/admin/AdminControlRoom';
import DashboardSection      from './pages/admin/sections/DashboardSection';
import UsersSection          from './pages/admin/sections/UsersSection';
import DevelopersSection     from './pages/admin/sections/DevelopersSection';
import SettingsSection       from './pages/admin/sections/SettingsSection';
import AuditLogsSection      from './pages/admin/sections/AuditLogsSection';
import DevDashboard          from './pages/DevDashboard';

export default function App() {
  return (
    <Routes>
      {/* ── Auth ─────────────────────────────────────────────────── */}
      <Route path="/login" element={<Login />} />

      {/* ── Public landing page ──────────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />

      {/* ── Public dev-gated pages ───────────────────────────────── */}
      <Route path="/command-center" element={<DevGate><CommandCenter /></DevGate>} />
      <Route path="/rooms"          element={<DevGate><NegotiationRooms /></DevGate>} />
      <Route path="/analytics"      element={<DevGate><AgentAnalytics /></DevGate>} />

      {/* ── Developer dashboard (developer + admin roles) ────────── */}
      <Route path="/dev-dashboard" element={<DeveloperRoute><DevDashboard /></DeveloperRoute>} />

      {/* ── Admin Control Room (admin role only) ─────────────────── */}
      <Route
        path="/dashboard"
        element={<AdminRoute><AdminControlRoom /></AdminRoute>}
      >
        <Route index                element={<DashboardSection />}  />
        <Route path="users"         element={<UsersSection />}      />
        <Route path="developers"    element={<DevelopersSection />} />
        <Route path="settings"      element={<SettingsSection />}   />
        <Route path="audit-logs"    element={<AuditLogsSection />}  />
      </Route>

      {/* ── Fallback ─────────────────────────────────────────────── */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

