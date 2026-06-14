export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const dealId = body?.deal_id;
  const payerId = body?.payer_id;
  const amount = Number(body?.amount ?? 0);
  const lcReferenceNumber = body?.lc_reference_number || null;

  if (!dealId || !payerId || amount <= 0) {
    return new Response(JSON.stringify({ error: 'deal_id, payer_id, and positive amount are required' }), { status: 400 });
  }

  const handshakeCommissionRate = 0.02;
  const commissionAmount = Number((amount * handshakeCommissionRate).toFixed(2));
  const payload = {
    buyer_id: payerId,
    amount_total: amount,
    lc_reference_number: lcReferenceNumber,
    handshake_status: 'confirmed',
    handshake_commission_rate: handshakeCommissionRate,
    entry_fee_status: 'paid',
    escrow_status: 'locked',
    funds_locked: true,
    compliance_status: 'verified',
    safe_withdrawal_ready: false,
    withdrawal_triggered: false,
    ai_agent_status: {
      agent1: 'verified',
      agent2: 'verified',
      agent3: 'verified'
    },
    last_updated: new Date().toISOString()
  };

  const endpoint = `${supabaseUrl}/rest/v1/green_acc_deals?id=eq.${encodeURIComponent(dealId)}`;
  const response = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();
  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create handshake session', details: data }), { status: response.status });
  }

  return new Response(JSON.stringify({
    message: 'Handshake confirmed and letter of credit locked',
    commission_amount: commissionAmount,
    session_url: null,
    deal: data?.[0] ?? null
  }), { status: 200 });
}
