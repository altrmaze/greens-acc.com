import { simulateSuccessfulTransaction, writeAccountingLog } from './paymentService.js';

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

  if (!dealId || !payerId) {
    return new Response(JSON.stringify({ error: 'deal_id and payer_id are required' }), { status: 400 });
  }

  if (Number.isNaN(amount) || amount !== 20.0) {
    return new Response(JSON.stringify({ error: 'The entry fee must be exactly 20.00 USD' }), { status: 400 });
  }

  const payment = await simulateSuccessfulTransaction({
    deal_id: dealId,
    payer_id: payerId,
    amount,
    channel: 'entry_fee'
  });
  if (!payment.success) {
    return new Response(JSON.stringify({ error: payment.error || 'Demo transaction failed' }), { status: 502 });
  }

  const endpoint = `${supabaseUrl}/rest/v1/green_acc_deals?id=eq.${encodeURIComponent(dealId)}`;
  const payload = {
    buyer_id: payerId,
    entry_fee_amount: 20.00,
    entry_fee_status: 'paid',
    compliance_status: 'pending',
    last_updated: new Date().toISOString()
  };

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
    return new Response(JSON.stringify({ error: 'Failed to update entry fee status', details: data }), { status: response.status });
  }

  await writeAccountingLog({
    supabaseUrl,
    serviceRoleKey,
    payment,
    details: {
      source: 'processEntryFee',
      entry_fee_amount: 20.0,
      recorded_at: payment.processed_at
    }
  });

  return new Response(JSON.stringify({
    message: 'Entry fee processed successfully in Demo/Sandbox mode',
    sandbox: true,
    payment,
    deal: data?.[0] ?? null
  }), { status: 200 });
}
