import { Navigate, Routes, Route } from 'react-router-dom';
import AdminRoute       from './components/AdminRoute';
import DeveloperRoute   from './components/DeveloperRoute';
import ErrorBoundary    from './components/ErrorBoundary';
import UnderConstruction from './pages/UnderConstruction';
import Login            from './pages/Login';
import Unauthorized     from './pages/Unauthorized';
import AdminControlRoom from './pages/admin/AdminControlRoom';
import DashboardSection from './pages/admin/sections/DashboardSection';
import UsersSection     from './pages/admin/sections/UsersSection';
import DevelopersSection from './pages/admin/sections/DevelopersSection';
import SettingsSection  from './pages/admin/sections/SettingsSection';
import AuditLogsSection from './pages/admin/sections/AuditLogsSection';
import SystemHealthSection from './pages/admin/sections/SystemHealthSection';
import DevDashboard     from './pages/DevDashboard';

export default function App() {
  return (
    <ErrorBoundary>
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
          <Route index                     element={<ErrorBoundary><DashboardSection /></ErrorBoundary>}     />
          <Route path="users"              element={<ErrorBoundary><UsersSection /></ErrorBoundary>}         />
          <Route path="developers"         element={<ErrorBoundary><DevelopersSection /></ErrorBoundary>}    />
          <Route path="settings"           element={<ErrorBoundary><SettingsSection /></ErrorBoundary>}      />
          <Route path="audit-logs"         element={<ErrorBoundary><AuditLogsSection /></ErrorBoundary>}     />
          <Route path="system-health"      element={<ErrorBoundary><SystemHealthSection /></ErrorBoundary>}  />
        </Route>

        {/* ── Fallback: unknown paths → Under Construction ─────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

