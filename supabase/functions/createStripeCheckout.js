export async function POST(request) {
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Missing STRIPE_SECRET_KEY' }), { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const dealId = String(body?.deal_id || '').trim();
  const payerId = String(body?.payer_id || body?.buyer_id || body?.user_id || '').trim();
  const requestedAmount = Number(body?.amount);
  const metadata = body?.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
    ? body.metadata
    : {};
  const transactionType = String(body?.transaction_type || metadata.transaction_type || 'deal_activation').trim();
  const amount = Number.isFinite(requestedAmount) && requestedAmount > 0 ? Math.round(requestedAmount) : 2000;
  const productName = String(body?.description || (transactionType === 'deal_activation'
    ? 'Greens ACC Deal Activation'
    : 'Greens ACC Payment')).trim();
  const requestOrigin = request.headers.get('origin') || '';
  const baseUrl = String(body?.base_url || requestOrigin || 'https://greens-acc.com').replace(/\/$/, '');
  const successUrl = body?.success_url || `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}&deal_id=${encodeURIComponent(dealId)}`;
  const cancelUrl = body?.cancel_url || `${baseUrl}/cancel.html?deal_id=${encodeURIComponent(dealId)}`;

  if (!dealId) {
    return new Response(JSON.stringify({ error: 'deal_id is required' }), { status: 400 });
  }

  const stripeMetadata = {
    ...Object.fromEntries(
      Object.entries(metadata).map(([key, value]) => [key, String(value)])
    ),
    deal_id: dealId,
    transaction_type: transactionType,
  };

  if (payerId) {
    stripeMetadata.payer_id = payerId;
  }

  const stripePayload = {
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: { name: productName },
        unit_amount: amount
      },
      quantity: 1
    }],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: stripeMetadata,
    payment_intent_data: {
      metadata: stripeMetadata
    }
  };

  const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + stripeKey,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(stripePayloadToForm(stripePayload))
  });

  const stripeData = await stripeResponse.json();
  if (!stripeResponse.ok) {
    return new Response(JSON.stringify({ error: 'Stripe checkout creation failed', details: stripeData }), { status: 502 });
  }

  return new Response(JSON.stringify({
    message: 'Stripe checkout session created',
    session_id: stripeData.id,
    session_url: stripeData.url,
    checkout_url: stripeData.url,
    url: stripeData.url,
  }), { status: 200 });
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
