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
  const amount = Number(body?.amount ?? 20);
  const baseUrl = body?.base_url || 'https://example.com';
  const successUrl = body?.success_url || `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}&mode=demo`;
  const cancelUrl = body?.cancel_url || `${baseUrl}/cancel`;

  if (!dealId || !payerId) {
    return new Response(JSON.stringify({ error: 'deal_id and payer_id are required' }), { status: 400 });
  }

  const payment = await simulateSuccessfulTransaction({
    deal_id: dealId,
    payer_id: payerId,
    amount: amount > 0 ? amount : 20,
    channel: 'checkout'
  });
  if (!payment.success) {
    return new Response(JSON.stringify({ error: payment.error || 'Mock checkout failed' }), { status: 502 });
  }

  const patchEndpoint = `${supabaseUrl}/rest/v1/green_acc_deals?id=eq.${encodeURIComponent(dealId)}`;
  const patchResponse = await fetch(patchEndpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: serviceRoleKey,
      Authorization: 'Bearer ' + serviceRoleKey,
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      buyer_id: payerId,
      entry_fee_amount: 20.00,
      entry_fee_status: 'paid',
      last_updated: new Date().toISOString()
    })
  });
  const patchData = await patchResponse.json().catch(() => []);
  if (!patchResponse.ok) {
    return new Response(JSON.stringify({ error: 'Failed to update entry fee status', details: patchData }), { status: patchResponse.status });
  }

  await writeAccountingLog({
    supabaseUrl,
    serviceRoleKey,
    payment,
    details: {
      source: 'createStripeCheckout',
      success_url: successUrl,
      cancel_url: cancelUrl
    }
  });

  return new Response(JSON.stringify({
    message: 'Demo/Sandbox checkout session created',
    sandbox: true,
    session_url: successUrl.replace('{CHECKOUT_SESSION_ID}', encodeURIComponent(payment.transaction_id)),
    cancel_url: cancelUrl,
    payment,
    deal: patchData?.[0] ?? null
  }), { status: 200 });
}
