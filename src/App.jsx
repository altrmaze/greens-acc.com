import { Navigate, Routes, Route } from 'react-router-dom';
import AdminRoute        from './components/AdminRoute';
import DeveloperRoute    from './components/DeveloperRoute';
import UnderConstruction from './pages/UnderConstruction';
import Login             from './pages/Login';
import Unauthorized      from './pages/Unauthorized';
import AdminControlRoom  from './pages/admin/AdminControlRoom';
import DashboardSection  from './pages/admin/sections/DashboardSection';
import UsersSection      from './pages/admin/sections/UsersSection';
import DevelopersSection from './pages/admin/sections/DevelopersSection';
import SettingsSection   from './pages/admin/sections/SettingsSection';
import AuditLogsSection  from './pages/admin/sections/AuditLogsSection';
import DevDashboard      from './pages/DevDashboard';
// ── Authenticated application pages (developer + admin roles) ────────────
import CommandCenter     from './pages/CommandCenter';
import NegotiationRooms  from './pages/NegotiationRooms';
import AgentAnalytics    from './pages/AgentAnalytics';
import GreenBubblesSecurity from './pages/GreenBubblesSecurity';
import AegisMonitor      from './pages/AegisMonitor';
import GreenContainer    from './pages/GreenContainer';
import Documents         from './pages/Documents';
import Automations       from './pages/Automations';
import Voice             from './pages/Voice';
import Travel            from './pages/Travel';
import Forms             from './pages/Forms';
import Bills             from './pages/Bills';
import Household         from './pages/Household';
import Permissions       from './pages/Permissions';
import Activity          from './pages/Activity';
import Settings          from './pages/Settings';

function Dev({ children }) {
  return <DeveloperRoute>{children}</DeveloperRoute>;
}

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
      <Route path="/dev-dashboard"     element={<Dev><DevDashboard /></Dev>} />

      {/* ── B2B platform pages (developer + admin roles) ─────────── */}
      <Route path="/command-center"    element={<Dev><CommandCenter /></Dev>} />
      <Route path="/rooms"             element={<Dev><NegotiationRooms /></Dev>} />
      <Route path="/analytics"         element={<Dev><AgentAnalytics /></Dev>} />
      <Route path="/security"          element={<Dev><GreenBubblesSecurity /></Dev>} />
      <Route path="/monitor"           element={<Dev><AegisMonitor /></Dev>} />

      {/* ── User profile & tool pages (developer + admin roles) ──── */}
      <Route path="/container"         element={<Dev><GreenContainer /></Dev>} />
      <Route path="/documents"         element={<Dev><Documents /></Dev>} />
      <Route path="/automations"       element={<Dev><Automations /></Dev>} />
      <Route path="/voice"             element={<Dev><Voice /></Dev>} />
      <Route path="/travel"            element={<Dev><Travel /></Dev>} />
      <Route path="/forms"             element={<Dev><Forms /></Dev>} />
      <Route path="/bills"             element={<Dev><Bills /></Dev>} />
      <Route path="/household"         element={<Dev><Household /></Dev>} />
      <Route path="/permissions"       element={<Dev><Permissions /></Dev>} />
      <Route path="/activity"          element={<Dev><Activity /></Dev>} />
      <Route path="/settings"          element={<Dev><Settings /></Dev>} />

      {/* ── Admin Control Room (admin role only) ─────────────────── */}
      <Route
        path="/dashboard"
        element={<AdminRoute><AdminControlRoom /></AdminRoute>}
      >
        <Route index             element={<DashboardSection />}  />
        <Route path="users"      element={<UsersSection />}      />
        <Route path="developers" element={<DevelopersSection />} />
        <Route path="settings"   element={<SettingsSection />}   />
        <Route path="audit-logs" element={<AuditLogsSection />}  />
      </Route>

      {/* ── Fallback: unknown paths → Under Construction ─────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

