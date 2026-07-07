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

function resolveWorkspaceQueue(workspaceMetadata, departmentId) {
  const queueFromMetadata = workspaceMetadata?.queue_names?.telemetry;
  if (typeof queueFromMetadata === 'string' && queueFromMetadata.trim().length > 0) {
    return queueFromMetadata.trim();
  }
  return `dept.${departmentId}.telemetry`;
}

export function SecurityTelemetryPanel() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [streamContext, setStreamContext] = useState({
    departmentId: null,
    workspaceQueue: null,
  });

  useEffect(() => {
    let mounted = true;
    let liveDepartmentId = null;
    let liveWorkspaceQueue = null;

    async function loadInitial() {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError) {
        throw authError;
      }

      const userId = authData?.user?.id;
      if (!userId) {
        throw new Error('User authentication is required for department telemetry');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('department_id')
        .eq('id', userId)
        .single();

      if (profileError) {
        throw profileError;
      }
      if (!profileData?.department_id) {
        throw new Error('No department workspace assigned to this profile');
      }

      const { data: workspaceData, error: workspaceError } = await supabase
        .from('workspaces')
        .select('workspace_metadata')
        .eq('department_id', profileData.department_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (workspaceError) {
        throw workspaceError;
      }

      liveDepartmentId = profileData.department_id;
      liveWorkspaceQueue = resolveWorkspaceQueue(workspaceData?.workspace_metadata, liveDepartmentId);

      const { data, error: fetchError } = await supabase
        .from('security_telemetry')
        .select('id, department_id, workspace_queue, event_id, source_ip, threat_level, kill_switch_active, bubble_isolated, action_details, created_at')
        .eq('department_id', liveDepartmentId)
        .eq('workspace_queue', liveWorkspaceQueue)
        .order('created_at', { ascending: false })
        .limit(25);

      if (!mounted) {
        return;
      }

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setStreamContext({
          departmentId: liveDepartmentId,
          workspaceQueue: liveWorkspaceQueue,
        });
        setEvents((data ?? []).map(normalizeEvent));
      }
      setLoading(false);
    }

    let channel = null;

    loadInitial()
      .then(() => {
        if (!mounted || !liveDepartmentId || !liveWorkspaceQueue) {
          return;
        }
        channel = supabase
          .channel(`security-telemetry-live-${liveDepartmentId}`)
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'security_telemetry', filter: `department_id=eq.${liveDepartmentId}` },
            (payload) => {
              if (payload?.new?.workspace_queue === liveWorkspaceQueue) {
                setEvents((prev) => upsertEvent(prev, payload.new));
              }
            },
          )
          .on(
            'postgres_changes',
            { event: 'UPDATE', schema: 'public', table: 'security_telemetry', filter: `department_id=eq.${liveDepartmentId}` },
            (payload) => {
              if (payload?.new?.workspace_queue === liveWorkspaceQueue) {
                setEvents((prev) => upsertEvent(prev, payload.new));
              }
            },
          )
          .subscribe((status) => {
            if (status === 'CHANNEL_ERROR') {
              setError('Realtime telemetry stream is unavailable');
            }
          });
      })
      .catch((loadError) => {
        if (!mounted) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : 'Unable to load department telemetry stream');
        setLoading(false);
      });

    return () => {
      mounted = false;
      if (channel) {
        supabase.removeChannel(channel);
      }
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
            <p className="text-xs text-slate-500 mt-1">
              Live Supabase stream · dept={streamContext.departmentId || 'unassigned'} · queue={streamContext.workspaceQueue || 'unset'}
            </p>
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
