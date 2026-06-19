// Greens ACC — Supply Chain Engine
// Creates a new shipment record and seeds its standard milestone checkpoints.

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const {
    deal_id, tracking_number, origin_country, destination_country,
    carrier, commodity_description, hs_code, gross_weight_kg, volume_cbm,
    estimated_arrival, incoterms, metadata
  } = body || {};

  if (!tracking_number || !origin_country || !destination_country) {
    return new Response(
      JSON.stringify({ error: 'tracking_number, origin_country, and destination_country are required' }),
      { status: 400 }
    );
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: 'Bearer ' + serviceRoleKey,
    Prefer: 'return=representation'
  };

  const shipmentPayload = {
    deal_id: deal_id || null, tracking_number, origin_country, destination_country,
    carrier: carrier || null, commodity_description: commodity_description || null,
    hs_code: hs_code || null, gross_weight_kg: gross_weight_kg || null,
    volume_cbm: volume_cbm || null, status: 'pending',
    estimated_arrival: estimated_arrival || null, incoterms: incoterms || null,
    metadata: metadata || {}, created_at: new Date().toISOString(), updated_at: new Date().toISOString()
  };

  const shipmentResp = await fetch(supabaseUrl + '/rest/v1/supply_shipments', {
    method: 'POST', headers: authHeaders, body: JSON.stringify(shipmentPayload)
  });
  const shipmentData = await shipmentResp.json();
  if (!shipmentResp.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create shipment', details: shipmentData }), { status: shipmentResp.status });
  }
  const shipment = Array.isArray(shipmentData) ? shipmentData[0] : shipmentData;

  // Seed standard milestone checkpoints
  const milestoneTypes = [
    'origin_pickup', 'export_clearance', 'origin_port_departure',
    'in_transit_waypoint', 'destination_port_arrival', 'import_clearance', 'final_delivery'
  ];
  const milestonePayloads = milestoneTypes.map(type => ({
    shipment_id: shipment.id, milestone_type: type, milestone_status: 'pending',
    location: null, notes: null, completed_at: null, created_at: new Date().toISOString()
  }));

  await fetch(supabaseUrl + '/rest/v1/supply_milestones', {
    method: 'POST', headers: authHeaders, body: JSON.stringify(milestonePayloads)
  });

  // Write creation event to audit log
  await fetch(supabaseUrl + '/rest/v1/supply_shipment_events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: 'Bearer ' + serviceRoleKey },
    body: JSON.stringify({
      shipment_id: shipment.id, event_type: 'shipment_created',
      previous_status: null, new_status: 'pending',
      actor: body && body.created_by ? body.created_by : 'system',
      description: 'Shipment ' + tracking_number + ' created: ' + origin_country + ' to ' + destination_country,
      metadata: { hs_code, carrier, incoterms }, created_at: new Date().toISOString()
    })
  });

  return new Response(JSON.stringify({
    message: 'shipment created', shipment,
    milestones_seeded: milestoneTypes.length,
    tracking_number
  }), { status: 200 });
}
