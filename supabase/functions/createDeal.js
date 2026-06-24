export async function POST(request) {
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500 }
    );
  }

  const body = await request.json();
  const {
    buyer_id,
    seller_id,
    region,
    currency,
    amount_total,
    lc_reference_number
  } = body || {};

  if (!buyer_id) {
    return new Response(
      JSON.stringify({ error: 'buyer_id is required' }),
      { status: 400 }
    );
  }

  const payload = {
    buyer_id,
    seller_id:             seller_id            || null,
    region:                region               || 'US',
    currency:              currency             || 'USD',
    amount_total:          Number(amount_total  ?? 0),
    lc_reference_number:   lc_reference_number  || null,
    entry_fee_status:      'pending',
    handshake_status:      'pending',
    escrow_status:         'locked',
    funds_locked:          true,
    compliance_status:     'pending',
    safe_withdrawal_ready: false,
    withdrawal_triggered:  false,
    ai_agent_status:       { agent1: 'pending', agent2: 'pending', agent3: 'pending' },
    last_updated:          new Date().toISOString()
  };

  const endpoint = `${supabaseUrl}/rest/v1/green_acc_deals`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept:          'application/json',
      apikey:          serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer:          'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    return new Response(
      JSON.stringify({ error: 'Failed to create deal', details: data }),
      { status: response.status }
    );
  }

  const deal = Array.isArray(data) ? data[0] : data;
  return new Response(
    JSON.stringify({ message: 'Deal created successfully', deal }),
    { status: 201 }
  );
}
