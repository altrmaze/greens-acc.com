import { Navigate, Routes, Route } from 'react-router-dom';
import DeveloperRoute    from './components/DeveloperRoute';
import UnderConstruction from './pages/UnderConstruction';
import Login             from './pages/Login';
import ResetPassword     from './pages/ResetPassword';
import Unauthorized      from './pages/Unauthorized';
import Dashboard         from './pages/Dashboard';

export default function App() {
  return (
    <Routes>
      {/* ── Public entry point ───────────────────────────────────── */}
      {/* Unauthenticated → Under Construction; logged-in → /dashboard */}
      <Route path="/"             element={<UnderConstruction />} />

      {/* ── Auth ─────────────────────────────────────────────────── */}
      <Route path="/login"        element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ── Access-denied page ───────────────────────────────────── */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ── Dashboard (admin + developer roles) ──────────────────── */}
      <Route
        path="/dashboard"
        element={<DeveloperRoute><Dashboard /></DeveloperRoute>}
      />

      {/* ── Fallback: unknown paths → Under Construction ─────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
