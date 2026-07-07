import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';

const LEVEL_STYLES = {
  YELLOW: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  PURPLE: 'bg-purple-50 text-purple-700 border-purple-200',
  ORANGE: 'bg-orange-50 text-orange-700 border-orange-200',
  RED: 'bg-red-50 text-red-700 border-red-200',
};

function severityClass(level) {
  return LEVEL_STYLES[level] ?? 'bg-slate-50 text-slate-700 border-slate-200';
}

function normalizeEvent(event) {
  if (!event) {
    return event;
  }
  return {
    ...event,
    threat_level: (event.threat_level || 'YELLOW').toUpperCase(),
  };
}

function upsertEvent(list, incoming) {
  const next = [normalizeEvent(incoming), ...list.filter((event) => event.id !== incoming.id)];
  return next.slice(0, 25);
}

export function SecurityTelemetryPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadInitial() {
      const { data, error: fetchError } = await supabase
        .from('security_telemetry')
        .select('id, event_id, source_ip, threat_level, kill_switch_active, bubble_isolated, action_details, created_at')
        .order('created_at', { ascending: false })
        .limit(25);

      if (!mounted) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setEvents((data ?? []).map(normalizeEvent));
      }
      setLoading(false);
    }

    loadInitial();

    const channel = supabase
      .channel('security-telemetry-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'security_telemetry' },
        (payload) => {
          setEvents((prev) => upsertEvent(prev, payload.new));
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'security_telemetry' },
        (payload) => {
          setEvents((prev) => upsertEvent(prev, payload.new));
        },
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          setError('Realtime telemetry stream is unavailable');
        }
      });

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const latest = events[0];
  const levelCounts = useMemo(() => {
    return events.reduce((acc, event) => {
      const level = event.threat_level || 'UNKNOWN';
      acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});
  }, [events]);

  return (
    <section className="max-w-5xl mx-auto px-6 py-10">
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-slate-900">General Bubbles Cybersecurity Telemetry</h3>
            <p className="text-xs text-slate-500 mt-1">Live Supabase stream · severity levels: Yellow, Purple, Orange, Red</p>
          </div>
          {latest?.threat_level && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${severityClass(latest.threat_level)}`}>
              Current: {latest.threat_level}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4">
          {['YELLOW', 'PURPLE', 'ORANGE', 'RED'].map((level) => (
            <div key={level} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${severityClass(level)}`}>
              {level}: {levelCounts[level] ?? 0}
            </div>
          ))}
        </div>

        {loading && (
          <p className="text-xs text-slate-400 mt-4 font-mono">Synchronizing telemetry stream...</p>
        )}
        {error && (
          <p className="text-xs text-red-500 mt-4 font-mono">{error}</p>
        )}

        {!loading && !error && (
          <div className="mt-4 max-h-80 overflow-auto border border-slate-100 rounded-lg">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">Event</th>
                  <th className="text-left px-3 py-2">Threat</th>
                  <th className="text-left px-3 py-2">Source IP</th>
                  <th className="text-left px-3 py-2">Isolation</th>
                  <th className="text-left px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono text-slate-700">{event.event_id}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${severityClass(event.threat_level)}`}>
                        {event.threat_level}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{event.source_ip || 'n/a'}</td>
                    <td className="px-3 py-2 text-slate-600">
                      {event.kill_switch_active ? 'KILL SWITCH' : event.bubble_isolated ? 'BUBBLE ISOLATED' : 'Normal'}
                    </td>
                    <td className="px-3 py-2 text-slate-500">{event.action_details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
