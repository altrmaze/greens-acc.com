import { Routes, Route } from 'react-router-dom';
import { DevGate }           from './components/DevGate';
import AdminPageRoute        from './AdminPageRoute';
import Dashboard             from './pages/Dashboard';
import CommandCenter         from './pages/CommandCenter';
import NegotiationRooms      from './pages/NegotiationRooms';
import AgentAnalytics        from './pages/AgentAnalytics';
import GreenBubblesSecurity  from './pages/GreenBubblesSecurity';

/**
 * Root application component — Greens ACC
 *
 * Three modular production pages, each isolated by React Router:
 *  /            → CommandCenter   — Global market telemetry & role dashboards
 *  /rooms       → NegotiationRooms — $20 entry gate, waiting areas & green rooms
 *  /analytics   → AgentAnalytics  — Presidential AI consensus & compliance
 *  /dashboard   → Dashboard       — Healing Blends Regime system monitor
 *  /admin       → AdminPageRoute  — Developer access gate
 */
export default function App() {
  return (
    <Routes>
      {/* ── Page 1 — Command Center ──────────────────────────────── */}
      <Route path="/" element={<DevGate><CommandCenter /></DevGate>} />

      {/* ── Page 2 — Global Negotiation Rooms ───────────────────── */}
      <Route path="/rooms" element={<DevGate><NegotiationRooms /></DevGate>} />

      {/* ── Page 3 — Multi-Agent Analytics & Compliance ──────────── */}
      <Route path="/analytics" element={<DevGate><AgentAnalytics /></DevGate>} />

      {/* ── /dashboard — Healing Blends Regime monitor ──────────── */}
      <Route path="/dashboard" element={<DevGate><Dashboard /></DevGate>} />

      {/* ── /admin — developer access gate + role selector ─────── */}
      <Route path="/admin" element={<AdminPageRoute />} />

      {/* ── /security — Green Bubbles Autonomous Defense ─────────── */}
      <Route path="/security" element={<DevGate><GreenBubblesSecurity /></DevGate>} />

      {/* ── Fallback — redirect unknown paths to Command Center ──── */}
      <Route path="*" element={<DevGate><CommandCenter /></DevGate>} />
    </Routes>
  );
}
