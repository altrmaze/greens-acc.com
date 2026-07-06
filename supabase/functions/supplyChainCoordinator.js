export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const action = body?.action;

  if (!action) {
    return new Response(JSON.stringify({ error: 'action is required: init_shipment | advance_milestone' }), { status: 400 });
  }

  // ── MODULE 3a: INITIALIZE SHIPMENT ───────────────────────────────────────
  if (action === 'init_shipment') {
    const { order_id, carrier_id, origin, destination } = body;

    if (!order_id || !origin || !destination) {
      return new Response(JSON.stringify({ error: 'order_id, origin, and destination are required' }), { status: 400 });
    }

    const payload = {
      order_id,
      carrier_identity: carrier_id || 'unassigned',
      origin_point: origin,
      destination_point: destination,
      current_milestone: 'manifest_created',
      transit_status: 'in_preparation',
      logs: [{ timestamp: new Date().toISOString(), update: 'Logistics infrastructure generated. Manifest initialized.' }],
      created_at: new Date().toISOString()
    };

    const resp = await fetch(`${supabaseUrl}/rest/v1/supply_chain_tracking`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `******`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Shipment initialization failed', details: data }), { status: resp.status });
    }

    const tracking = Array.isArray(data) ? data[0] : data;
    return new Response(JSON.stringify({ success: true, tracking_record: tracking }), { status: 201 });
  }

  // ── MODULE 3b: ADVANCE LOGISTICS MILESTONE ───────────────────────────────
  if (action === 'advance_milestone') {
    const { tracking_id, milestone, summary } = body;

    if (!tracking_id || !milestone) {
      return new Response(JSON.stringify({ error: 'tracking_id and milestone are required' }), { status: 400 });
    }

    const logEntry = { timestamp: new Date().toISOString(), update: summary || `Advanced to milestone: ${milestone}` };

    // Fetch existing logs first, then append
    const getResp = await fetch(
      `${supabaseUrl}/rest/v1/supply_chain_tracking?id=eq.${encodeURIComponent(tracking_id)}&select=logs`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `******`,
        }
      }
    );

    const existing = await getResp.json();
    const existingLogs = Array.isArray(existing) && existing[0]?.logs ? existing[0].logs : [];
    const updatedLogs = [...existingLogs, logEntry];

    const patchResp = await fetch(
      `${supabaseUrl}/rest/v1/supply_chain_tracking?id=eq.${encodeURIComponent(tracking_id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `******`,
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          current_milestone: milestone,
          transit_status: 'in_transit',
          logs: updatedLogs,
          updated_at: new Date().toISOString()
        })
      }
    );

    const data = await patchResp.json();
    if (!patchResp.ok) {
      return new Response(JSON.stringify({ error: 'Milestone update failed', details: data }), { status: patchResp.status });
    }

    const record = Array.isArray(data) ? data[0] : data;
    return new Response(JSON.stringify({ success: true, record }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
}

export async function GET(_request) {
  return new Response(JSON.stringify({ standby: true, message: "hi Ayman" }), { status: 200 });
}
