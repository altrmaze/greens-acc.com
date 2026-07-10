// dealFulfillment.js — Post-handshake escrow, 2% commission, and logistics tracking engine.
// Integrates with the existing createStripeCheckout / stripeWebhook flow.

const RESTRICTED_COMMODITY_KEYWORDS = ['fuel', 'diesel', 'petrol', 'crude oil', 'petroleum', 'gasoline'];

const LOGISTICS_STEPS = ['ORIGIN_PORT', 'IN_TRANSIT', 'CUSTOMS_CLEARANCE', 'DELIVERED'];

const LOGISTICS_LABELS = {
  ORIGIN_PORT:       { label: 'Port of Origin',       icon: '⚓', desc: 'Cargo manifested and loaded at origin port.' },
  IN_TRANSIT:        { label: 'High Seas Transit',     icon: '🚢', desc: 'Vessel underway on international trade route.' },
  CUSTOMS_CLEARANCE: { label: 'Customs & Inspection',  icon: '🛃', desc: 'Cargo at destination customs authority.' },
  DELIVERED:         { label: 'Consignee Delivery',    icon: '✅', desc: 'Cargo released to consignee.' },
};

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { action } = body || {};

  if (!action) {
    return new Response(
      JSON.stringify({ error: 'action required: get_fulfillment | create_fulfillment | advance_logistics | get_checkout_url' }),
      { status: 400 }
    );
  }

  const reqHeaders = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: 'Bearer ' + serviceRoleKey,
    Prefer: 'return=representation',
  };

  // ── GET_FULFILLMENT ───────────────────────────────────────────────────────
  if (action === 'get_fulfillment') {
    const { deal_id } = body;
    if (!deal_id) {
      return new Response(JSON.stringify({ error: 'deal_id is required' }), { status: 400 });
    }

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/deal_fulfillments?deal_id=eq.${encodeURIComponent(deal_id)}&select=*`,
      { headers: reqHeaders }
    );
    const rows = await resp.json();
    const fulfillment = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!fulfillment) {
      return new Response(JSON.stringify({ error: 'Fulfillment record not found', deal_id }), { status: 404 });
    }

    return new Response(JSON.stringify({
      fulfillment,
      logistics_steps: LOGISTICS_STEPS.map(s => ({
        key: s,
        ...LOGISTICS_LABELS[s],
        active: s === fulfillment.current_logistics_status,
        completed: LOGISTICS_STEPS.indexOf(s) < LOGISTICS_STEPS.indexOf(fulfillment.current_logistics_status),
      })),
      platform_fee_usd: fulfillment.platform_fee_usd,
      commission_rate: '2%',
    }), { status: 200 });
  }

  // ── CREATE_FULFILLMENT ────────────────────────────────────────────────────
  if (action === 'create_fulfillment') {
    const { deal_id, buyer_id, seller_id, gross_value_usd, commodity_type, origin_port, destination_port } = body;
    if (!deal_id || !gross_value_usd) {
      return new Response(JSON.stringify({ error: 'deal_id and gross_value_usd are required' }), { status: 400 });
    }

    // Reject restricted commodities
    const commodity = (commodity_type || '').toLowerCase();
    if (RESTRICTED_COMMODITY_KEYWORDS.some(kw => commodity.includes(kw))) {
      return new Response(JSON.stringify({
        error: 'Greens ACC does not process fuel, diesel, or petroleum commodity fulfillments.',
        policy_code: 'RESTRICTED_COMMODITY',
      }), { status: 403 });
    }

    // Check for existing record (upsert by deal_id)
    const existingResp = await fetch(
      `${supabaseUrl}/rest/v1/deal_fulfillments?deal_id=eq.${encodeURIComponent(deal_id)}&select=id`,
      { headers: reqHeaders }
    );
    const existing = await existingResp.json();
    if (Array.isArray(existing) && existing.length > 0) {
      return new Response(JSON.stringify({ error: 'Fulfillment record already exists for this deal.' }), { status: 409 });
    }

    const now = new Date().toISOString();
    const initialMilestone = {
      step: 'ORIGIN_PORT',
      timestamp: now,
      note: 'Fulfillment record created. Awaiting escrow payment.',
    };

    const payload = {
      deal_id,
      buyer_id: buyer_id || null,
      seller_id: seller_id || null,
      gross_value_usd: Number(gross_value_usd),
      stripe_payment_status: 'PENDING',
      current_logistics_status: 'ORIGIN_PORT',
      commodity_type: commodity_type || 'general',
      origin_port: origin_port || null,
      destination_port: destination_port || null,
      milestone_log: JSON.stringify([initialMilestone]),
      route_coordinates: JSON.stringify([]),
      created_at: now,
      updated_at: now,
    };

    const createResp = await fetch(`${supabaseUrl}/rest/v1/deal_fulfillments`, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify(payload),
    });
    const created = await createResp.json();
    if (!createResp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create fulfillment', details: created }), { status: createResp.status });
    }

    const record = Array.isArray(created) ? created[0] : created;
    return new Response(JSON.stringify({
      success: true,
      fulfillment: record,
      commission_rate: '2%',
      platform_fee_usd: Number((Number(gross_value_usd) * 0.02).toFixed(2)),
    }), { status: 201 });
  }

  // ── GET_CHECKOUT_URL ──────────────────────────────────────────────────────
  // Proxy to the existing createStripeCheckout edge function for the 2% commission.
  if (action === 'get_checkout_url') {
    const { deal_id, buyer_id, gross_value_usd } = body;
    if (!deal_id || !gross_value_usd) {
      return new Response(JSON.stringify({ error: 'deal_id and gross_value_usd are required' }), { status: 400 });
    }

    const platformFee = Number((Number(gross_value_usd) * 0.02).toFixed(2));

    // Delegate to the existing Stripe checkout function
    const stripeResp = await fetch(`${supabaseUrl}/functions/v1/createStripeCheckout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deal_id,
        buyer_id: buyer_id || 'unknown',
        amount: Math.round(platformFee * 100), // cents
        description: `Greens ACC 2% Platform Commission — Deal ${deal_id}`,
        metadata: { deal_id, fee_type: 'platform_commission_2pct', gross_value_usd },
      }),
    });

    const stripeData = await stripeResp.json().catch(() => ({}));
    if (!stripeResp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create Stripe session', details: stripeData }), { status: stripeResp.status });
    }

    return new Response(JSON.stringify({
      checkout_url: stripeData.url || stripeData.checkout_url,
      session_id: stripeData.session_id,
      platform_fee_usd: platformFee,
    }), { status: 200 });
  }

  // ── ADVANCE_LOGISTICS ─────────────────────────────────────────────────────
  // Admin/webhook-triggered step advancement. Validates payment before any step > ORIGIN_PORT.
  if (action === 'advance_logistics') {
    const { deal_id, next_step, note } = body;
    if (!deal_id || !next_step) {
      return new Response(JSON.stringify({ error: 'deal_id and next_step are required' }), { status: 400 });
    }
    if (!LOGISTICS_STEPS.includes(next_step)) {
      return new Response(JSON.stringify({ error: `Invalid next_step. Must be one of: ${LOGISTICS_STEPS.join(', ')}` }), { status: 400 });
    }

    // Fetch current record
    const fetchResp = await fetch(
      `${supabaseUrl}/rest/v1/deal_fulfillments?deal_id=eq.${encodeURIComponent(deal_id)}&select=*`,
      { headers: reqHeaders }
    );
    const rows = await fetchResp.json();
    const record = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
    if (!record) {
      return new Response(JSON.stringify({ error: 'Fulfillment record not found' }), { status: 404 });
    }

    // Require payment before advancing past ORIGIN_PORT
    if (next_step !== 'ORIGIN_PORT' && record.stripe_payment_status !== 'PAID') {
      return new Response(JSON.stringify({
        error: 'Escrow payment must be settled before logistics can advance.',
        current_payment_status: record.stripe_payment_status,
      }), { status: 402 });
    }

    const currentIndex = LOGISTICS_STEPS.indexOf(record.current_logistics_status);
    const nextIndex = LOGISTICS_STEPS.indexOf(next_step);
    if (nextIndex <= currentIndex) {
      return new Response(JSON.stringify({ error: 'Cannot move backwards in logistics pipeline.' }), { status: 400 });
    }

    const now = new Date().toISOString();
    const newMilestone = {
      step: next_step,
      timestamp: now,
      note: note || LOGISTICS_LABELS[next_step].desc,
    };
    const updatedLog = [...(record.milestone_log || []), newMilestone];

    const patchResp = await fetch(
      `${supabaseUrl}/rest/v1/deal_fulfillments?deal_id=eq.${encodeURIComponent(deal_id)}`,
      {
        method: 'PATCH',
        headers: reqHeaders,
        body: JSON.stringify({
          current_logistics_status: next_step,
          milestone_log: updatedLog,
          updated_at: now,
        }),
      }
    );
    if (!patchResp.ok) {
      const err = await patchResp.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: 'Failed to advance logistics', details: err }), { status: patchResp.status });
    }

    return new Response(JSON.stringify({
      success: true,
      deal_id,
      previous_step: record.current_logistics_status,
      current_step: next_step,
      milestone: newMilestone,
    }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
}

export async function GET(_request) {
  return new Response(JSON.stringify({ standby: true, service: 'dealFulfillment' }), { status: 200 });
}
