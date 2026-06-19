// Greens ACC — Global B2B Meeting Room
// Manages negotiation state transitions and room presence for a meeting room.

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { action, room_id, participant_id, participant_name, company, role,
    negotiation_phase, proposed_terms, counter_terms, agreed_terms, event_type, payload } = body || {};

  if (!action || !room_id) {
    return new Response(JSON.stringify({ error: 'action and room_id are required' }), { status: 400 });
  }

  const validActions = ['join', 'leave', 'heartbeat', 'set_phase', 'propose_terms', 'accept_terms', 'log_event'];
  if (!validActions.includes(action)) {
    return new Response(JSON.stringify({ error: 'Invalid action. Must be one of: ' + validActions.join(', ') }), { status: 400 });
  }

  const authHeader = 'Bearer ' + serviceRoleKey;
  const now = new Date().toISOString();
  let result = {};

  if (action === 'join' && participant_id) {
    // Upsert presence record
    const presencePayload = {
      room_id, participant_id,
      participant_name: participant_name || participant_id,
      company: company || null,
      role: role || 'observer',
      joined_at: now, last_seen_at: now, is_online: true
    };
    const presenceResp = await fetch(supabaseUrl + '/rest/v1/meeting_presence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader,
        Prefer: 'resolution=merge-duplicates,return=representation' },
      body: JSON.stringify(presencePayload)
    });
    result.presence = await presenceResp.json();
    // Log join event
    await fetch(supabaseUrl + '/rest/v1/room_events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader },
      body: JSON.stringify({ room_id, event_type: 'join', actor_id: participant_id,
        actor_name: participant_name || participant_id, payload: { company, role }, created_at: now })
    });
  }

  if (action === 'leave' && participant_id) {
    await fetch(supabaseUrl + '/rest/v1/meeting_presence?room_id=eq.' + room_id + '&participant_id=eq.' + participant_id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader },
      body: JSON.stringify({ is_online: false, last_seen_at: now })
    });
    await fetch(supabaseUrl + '/rest/v1/room_events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader },
      body: JSON.stringify({ room_id, event_type: 'leave', actor_id: participant_id,
        actor_name: participant_name || participant_id, payload: {}, created_at: now })
    });
    result.status = 'left';
  }

  if (action === 'heartbeat' && participant_id) {
    await fetch(supabaseUrl + '/rest/v1/meeting_presence?room_id=eq.' + room_id + '&participant_id=eq.' + participant_id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader },
      body: JSON.stringify({ last_seen_at: now, is_online: true })
    });
    result.status = 'alive';
  }

  if (action === 'set_phase' || action === 'propose_terms' || action === 'accept_terms') {
    const validPhases = ['discovery','proposal','counter_proposal','final_terms','agreed','failed'];
    const phase = validPhases.includes(negotiation_phase) ? negotiation_phase :
      (action === 'propose_terms' ? 'proposal' : action === 'accept_terms' ? 'agreed' : 'discovery');
    const negPayload = {
      room_id, negotiation_phase: phase,
      proposed_terms: proposed_terms || null,
      counter_terms: counter_terms || null,
      agreed_terms: agreed_terms || null,
      last_actor: participant_id || null,
      phase_changed_at: now, created_at: now
    };
    const negResp = await fetch(supabaseUrl + '/rest/v1/meeting_negotiations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader, Prefer: 'return=representation' },
      body: JSON.stringify(negPayload)
    });
    result.negotiation = await negResp.json();
    await fetch(supabaseUrl + '/rest/v1/room_events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader },
      body: JSON.stringify({ room_id, event_type: action, actor_id: participant_id || null,
        actor_name: participant_name || null, payload: { phase, proposed_terms, counter_terms, agreed_terms }, created_at: now })
    });
  }

  if (action === 'log_event' && event_type) {
    const evtResp = await fetch(supabaseUrl + '/rest/v1/room_events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader, Prefer: 'return=representation' },
      body: JSON.stringify({ room_id, event_type, actor_id: participant_id || null,
        actor_name: participant_name || null, payload: payload || {}, created_at: now })
    });
    result.event = await evtResp.json();
  }

  return new Response(JSON.stringify(Object.assign({ message: 'ok', action, room_id }, result)), { status: 200 });
}
