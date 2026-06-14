export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const dealId = body?.deal_id;

  if (!dealId) {
    return new Response(JSON.stringify({ error: 'deal_id is required' }), { status: 400 });
  }

  const getEndpoint = `${supabaseUrl}/rest/v1/green_acc_deals?id=eq.${encodeURIComponent(dealId)}&select=*`;
  const getResponse = await fetch(getEndpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`
    }
  });

  const deals = await getResponse.json();
  if (!getResponse.ok || !Array.isArray(deals) || deals.length === 0) {
    return new Response(JSON.stringify({ error: 'Deal not found or cannot fetch deal details', details: deals }), { status: 404 });
  }

  const deal = deals[0];
  const agentStatus = deal.ai_agent_status || {};
  const requiredAgents = ['agent1', 'agent2', 'agent3'];
  const allAgentsVerified = requiredAgents.every((agent) => agentStatus[agent] === 'verified');

  if (!allAgentsVerified) {
    return new Response(JSON.stringify({ error: 'All 3 AI agents must be verified before withdrawal', ai_agent_status: agentStatus }), { status: 403 });
  }

  if (!['paid', 'verified'].includes(deal.entry_fee_status)) {
    return new Response(JSON.stringify({ error: 'Entry fee must be paid before withdrawal' }), { status: 403 });
  }

  if (deal.handshake_status !== 'confirmed') {
    return new Response(JSON.stringify({ error: 'Handshake must be confirmed before withdrawal' }), { status: 403 });
  }

  if (deal.compliance_status !== 'verified') {
    return new Response(JSON.stringify({ error: 'Compliance must be verified before withdrawal' }), { status: 403 });
  }

  if (!deal.funds_locked) {
    return new Response(JSON.stringify({ error: 'Funds are already unlocked or withdrawal already processed' }), { status: 409 });
  }

  const commissionAmount = Number(deal.handshake_commission_amount ?? 0);
  const payoutAmount = Number(deal.amount_total ?? 0) - commissionAmount;

  const updateEndpoint = `${supabaseUrl}/rest/v1/green_acc_deals?id=eq.${encodeURIComponent(dealId)}`;
  const updatePayload = {
    escrow_status: 'released',
    funds_locked: false,
    safe_withdrawal_ready: true,
    withdrawal_triggered: true,
    last_updated: new Date().toISOString()
  };

  const updateResponse = await fetch(updateEndpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(updatePayload)
  });

  const result = await updateResponse.json();
  if (!updateResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to release escrow and trigger withdrawal', details: result }), { status: updateResponse.status });
  }

  return new Response(JSON.stringify({
    message: 'Withdrawal triggered successfully after AI verification and compliance validation',
    lc_reference_number: deal.lc_reference_number,
    handshake_commission_rate: deal.handshake_commission_rate,
    handshake_commission_amount: commissionAmount,
    payout_amount: payoutAmount,
    deal: result?.[0] ?? null
  }), { status: 200 });
}
