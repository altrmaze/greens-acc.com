// Greens ACC — Supply Chain Engine
// Marks a specific milestone as completed and emits an audit event.

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { shipment_id, milestone_type, milestone_status, location, notes, actor } = body || {};

  if (!shipment_id || !milestone_type) {
    return new Response(JSON.stringify({ error: 'shipment_id and milestone_type are required' }), { status: 400 });
  }

  const validStatuses = ['pending','in_progress','completed','failed','skipped'];
  const resolvedStatus = validStatuses.includes(milestone_status) ? milestone_status : 'completed';
  const authHeader = 'Bearer ' + serviceRoleKey;

  // Patch the matching milestone
  const patchPayload = {
    milestone_status: resolvedStatus,
    location: location || null,
    notes: notes || null,
    completed_at: resolvedStatus === 'completed' ? new Date().toISOString() : null
  };

  const patchResp = await fetch(
    supabaseUrl + '/rest/v1/supply_milestones?shipment_id=eq.' + shipment_id + '&milestone_type=eq.' + milestone_type,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader, Prefer: 'return=representation' },
      body: JSON.stringify(patchPayload)
    }
  );
  const patchData = await patchResp.json();
  if (!patchResp.ok) {
    return new Response(JSON.stringify({ error: 'Failed to update milestone', details: patchData }), { status: patchResp.status });
  }

  // Write audit event
  await fetch(supabaseUrl + '/rest/v1/supply_shipment_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader },
    body: JSON.stringify({
      shipment_id, event_type: 'milestone_update',
      previous_status: null, new_status: resolvedStatus,
      actor: actor || 'system',
      description: 'Milestone ' + milestone_type + ' marked as ' + resolvedStatus,
      metadata: { location, notes }, created_at: new Date().toISOString()
    })
  });

  return new Response(JSON.stringify({
    message: 'milestone updated',
    shipment_id, milestone_type, milestone_status: resolvedStatus
  }), { status: 200 });
}
