export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const dealId = body?.deal_id;
  const payerId = body?.payer_id;
  const amount = Number(body?.amount ?? 0);
  const baseUrl = body?.base_url || 'https://example.com';
  const successUrl = body?.success_url || `${baseUrl}/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = body?.cancel_url || `${baseUrl}/cancel`;

  if (!dealId || !payerId) {
    return new Response(JSON.stringify({ error: 'deal_id and payer_id are required' }), { status: 400 });
  }

  const stripePayload = {
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: 'GreenACC Entry Fee' },
        unit_amount: 2000
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      deal_id: dealId,
      payer_id: payerId,
      entry_fee: '20.00'
    }
  };

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(stripePayloadToForm(stripePayload))
  });

  const stripeData = await stripeResponse.json();
  if (!stripeResponse.ok) {
    return new Response(JSON.stringify({ error: 'Stripe checkout creation failed', details: stripeData }), { status: 502 });
  }

  const patchEndpoint = `${supabaseUrl}/rest/v1/green_acc_deals?id=eq.${encodeURIComponent(dealId)}`;
  const patchResp = await fetch(patchEndpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify({
      buyer_id: payerId,
      entry_fee_amount: 20.00,
      entry_fee_status: 'paid',
      last_updated: new Date().toISOString()
    })
  });
  if (!patchResp.ok) {
    const patchErr = await patchResp.json().catch(() => ({}));
    return new Response(JSON.stringify({ error: 'Stripe session created but failed to update deal record', details: patchErr }), { status: 502 });
  }

  return new Response(JSON.stringify({ message: 'Stripe checkout session created', session_url: stripeData.url }), { status: 200 });
}

function stripePayloadToForm(payload, prefix = '') {
  const result = {};
  Object.entries(payload).forEach(([key, value]) => {
    const paramKey = prefix ? `${prefix}[${key}]` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, stripePayloadToForm(value, paramKey));
    } else if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (typeof item === 'object') {
          Object.assign(result, stripePayloadToForm(item, `${paramKey}[${index}]`));
        } else {
          result[`${paramKey}[${index}]`] = item.toString();
        }
      });
    } else if (value !== undefined && value !== null) {
      result[paramKey] = value.toString();
    }
  });
  return result;
}
