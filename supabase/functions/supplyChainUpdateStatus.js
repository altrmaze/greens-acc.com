// Greens ACC — Supply Chain Engine
// Updates shipment status and writes an immutable audit event.

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { shipment_id, new_status, actor, description, metadata } = body || {};

  const validStatuses = ['pending','in_transit','customs_hold','cleared','delivered','exception','cancelled'];
  if (!shipment_id || !new_status) {
    return new Response(JSON.stringify({ error: 'shipment_id and new_status are required' }), { status: 400 });
  }
  if (!validStatuses.includes(new_status)) {
    return new Response(JSON.stringify({ error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') }), { status: 400 });
  }

  const authHeader = 'Bearer ' + serviceRoleKey;

  // Fetch current shipment to capture previous_status
  const currentResp = await fetch(supabaseUrl + '/rest/v1/supply_shipments?id=eq.' + shipment_id + '&select=id,status', {
    headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader }
  });
  const currentData = await currentResp.json();
  const current = Array.isArray(currentData) ? currentData[0] : null;
  if (!current) {
    return new Response(JSON.stringify({ error: 'Shipment not found' }), { status: 404 });
  }
  const previousStatus = current.status;

  // Patch shipment status
  const updatePayload = { status: new_status, updated_at: new Date().toISOString() };
  if (new_status === 'delivered') updatePayload.actual_arrival = new Date().toISOString();

  const updateResp = await fetch(supabaseUrl + '/rest/v1/supply_shipments?id=eq.' + shipment_id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader, Prefer: 'return=representation' },
    body: JSON.stringify(updatePayload)
  });
  const updateData = await updateResp.json();
  if (!updateResp.ok) {
    return new Response(JSON.stringify({ error: 'Failed to update shipment', details: updateData }), { status: updateResp.status });
  }

  // Write immutable audit event
  await fetch(supabaseUrl + '/rest/v1/supply_shipment_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader },
    body: JSON.stringify({
      shipment_id, event_type: 'status_change',
      previous_status: previousStatus, new_status,
      actor: actor || 'system',
      description: description || ('Status changed from ' + previousStatus + ' to ' + new_status),
      metadata: metadata || {}, created_at: new Date().toISOString()
    })
  });

  return new Response(JSON.stringify({
    message: 'shipment status updated',
    shipment_id, previous_status: previousStatus, new_status
  }), { status: 200 });
}
