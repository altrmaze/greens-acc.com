import { Navigate, Routes, Route } from 'react-router-dom';
import AdminRoute        from './components/AdminRoute';
import UnderConstruction from './pages/UnderConstruction';
import Login             from './pages/Login';
import ResetPassword     from './pages/ResetPassword';
import Unauthorized      from './pages/Unauthorized';
import Dashboard         from './pages/Dashboard';

export default function App() {
  return (
    <Routes>
      {/* ── Public entry point ───────────────────────────────────── */}
      {/* Unauthenticated → Under Construction; authenticated privileged users → app routes */}
      <Route path="/"             element={<UnderConstruction />} />

      {/* ── Auth ─────────────────────────────────────────────────── */}
      <Route path="/login"        element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* ── Access-denied page ───────────────────────────────────── */}
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* ── Dashboard (admin only) ───────────────────────────────── */}
      <Route
        path="/dashboard"
        element={<AdminRoute><Dashboard /></AdminRoute>}
      />

      {/* ── Fallback: unknown paths → Under Construction ─────────── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
