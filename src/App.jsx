import { Navigate, Routes, Route } from 'react-router-dom';
import AdminRoute       from './components/AdminRoute';
import DeveloperRoute   from './components/DeveloperRoute';
import UnderConstruction from './pages/UnderConstruction';
import Login            from './pages/Login';
import Unauthorized     from './pages/Unauthorized';
import AdminControlRoom from './pages/admin/AdminControlRoom';
import DashboardSection from './pages/admin/sections/DashboardSection';
import UsersSection     from './pages/admin/sections/UsersSection';
import DevelopersSection from './pages/admin/sections/DevelopersSection';
import SettingsSection  from './pages/admin/sections/SettingsSection';
import AuditLogsSection from './pages/admin/sections/AuditLogsSection';
import DevDashboard     from './pages/DevDashboard';

export default function App() {
  return (
    <Routes>
      {/* ── Public entry point ───────────────────────────────────── */}
      {/* Unauthenticated → Under Construction; logged-in → redirect */}
      <Route path="/" element={<UnderConstruction />} />

      {/* ── Auth ─────────────────────────────────────────────────── */}
      <Route path="/login" element={<Login />} />

      {/* ── Access-denied page ───────────────────────────────────── */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ── Developer dashboard (developer + admin roles) ────────── */}
      <Route
        path="/dev-dashboard"
        element={<DeveloperRoute><DevDashboard /></DeveloperRoute>}
      />

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

      {/* ── Fallback: unknown paths → Under Construction ─────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

