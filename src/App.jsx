import { Routes, Route } from 'react-router-dom';
import { DevGate }           from './components/DevGate';
import LandingPage           from './pages/LandingPage';
import Dashboard             from './pages/Dashboard';
import CommandCenter         from './pages/CommandCenter';
import NegotiationRooms      from './pages/NegotiationRooms';
import AgentAnalytics        from './pages/AgentAnalytics';
import GreenBubblesSecurity  from './pages/GreenBubblesSecurity';
import ProtectedRoute        from './components/ProtectedRoute';
import Login                 from './pages/Login';
import GreenContainer        from './pages/GreenContainer';
import Documents             from './pages/Documents';
import Automations           from './pages/Automations';
import Voice                 from './pages/Voice';
import Travel                from './pages/Travel';
import Forms                 from './pages/Forms';
import Bills                 from './pages/Bills';
import Household             from './pages/Household';
import Permissions           from './pages/Permissions';
import Activity              from './pages/Activity';
import Settings              from './pages/Settings';
import AegisMonitor          from './pages/AegisMonitor';
import AdminDashboard        from './pages/admin/AdminDashboard';

export default function App() {
  return (
    <Routes>
      {/* ── Auth ─────────────────────────────────────────────────── */}
      <Route path="/login" element={<Login />} />

      {/* ── Public landing page ──────────────────────────────────── */}
      <Route path="/" element={<LandingPage />} />

      {/* ── Existing public pages ────────────────────────────────── */}
      <Route path="/command-center" element={<DevGate><CommandCenter /></DevGate>} />
      <Route path="/rooms"          element={<DevGate><NegotiationRooms /></DevGate>} />
      <Route path="/analytics"      element={<DevGate><AgentAnalytics /></DevGate>} />

      {/* ── Customer protected pages ─────────────────────────────── */}
      <Route path="/dashboard"   element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/security"    element={<ProtectedRoute><GreenBubblesSecurity /></ProtectedRoute>} />
      <Route path="/container"   element={<ProtectedRoute><GreenContainer /></ProtectedRoute>} />
      <Route path="/documents"   element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/automations" element={<ProtectedRoute><Automations /></ProtectedRoute>} />
      <Route path="/voice"       element={<ProtectedRoute><Voice /></ProtectedRoute>} />
      <Route path="/travel"      element={<ProtectedRoute><Travel /></ProtectedRoute>} />
      <Route path="/forms"       element={<ProtectedRoute><Forms /></ProtectedRoute>} />
      <Route path="/bills"       element={<ProtectedRoute><Bills /></ProtectedRoute>} />
      <Route path="/household"   element={<ProtectedRoute><Household /></ProtectedRoute>} />
      <Route path="/permissions" element={<ProtectedRoute><Permissions /></ProtectedRoute>} />
      <Route path="/activity"    element={<ProtectedRoute><Activity /></ProtectedRoute>} />
      <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/aegis"       element={<ProtectedRoute><AegisMonitor /></ProtectedRoute>} />

      {/* ── Admin sub-route dashboards ───────────────────────────── */}
      <Route path="/dashboard/admin"             element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/engineer"          element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/accounting"        element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/account-manager"   element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/financial-manager" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
      <Route path="/dashboard/analyzer"          element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

      {/* ── Fallback ─────────────────────────────────────────────── */}
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}
