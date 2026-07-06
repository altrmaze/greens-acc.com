export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!supabaseUrl || !serviceRoleKey || !stripeKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or STRIPE_SECRET_KEY' }), { status: 500 });
  }

  const payloadText = await request.text();
  if (!payloadText) {
    return new Response(JSON.stringify({ error: 'Empty webhook payload' }), { status: 400 });
  }

  try {
    if (webhookSecret) {
      const signatureHeader = request.headers.get('stripe-signature') || '';
      const verified = await verifyStripeSignature(payloadText, signatureHeader, webhookSecret);
      if (!verified) {
        return new Response(JSON.stringify({ error: 'Invalid Stripe signature' }), { status: 400 });
      }
    }

    const event = JSON.parse(payloadText);
    const object = event?.data?.object || {};

    if (event.type === 'checkout.session.completed' || event.type === 'checkout.session.async_payment_succeeded') {
      const metadata = object.metadata || {};
      const result = await handleActivationPayment({
        supabaseUrl,
        serviceRoleKey,
        metadata,
        payerId: metadata.payer_id || '',
        paymentIntentId: typeof object.payment_intent === 'string' ? object.payment_intent : object.payment_intent?.id,
        paymentStatus: object.payment_status || '',
      });
      return new Response(JSON.stringify(result), { status: 200 });
    }

    if (event.type === 'payment_intent.succeeded') {
      const metadata = object.metadata || {};
      const result = await handleActivationPayment({
        supabaseUrl,
        serviceRoleKey,
        metadata,
        payerId: metadata.payer_id || '',
        paymentIntentId: object.id,
        paymentStatus: object.status === 'succeeded' ? 'paid' : object.status,
      });
      return new Response(JSON.stringify(result), { status: 200 });
    }

    return new Response(JSON.stringify({ received: true, message: 'Event ignored' }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}

async function handleActivationPayment({ supabaseUrl, serviceRoleKey, metadata, payerId, paymentIntentId, paymentStatus }) {
  const dealId = String(metadata?.deal_id || '').trim();
  const transactionType = String(metadata?.transaction_type || 'deal_activation').trim();

  if (!dealId || transactionType !== 'deal_activation') {
    return { received: true, message: 'Non-activation payment ignored' };
  }

  if (paymentStatus !== 'paid') {
    return { received: true, message: 'Payment not completed yet' };
  }

  const patchEndpoint = `${supabaseUrl}/rest/v1/green_acc_deals?id=eq.${encodeURIComponent(dealId)}`;
  const patchPayload = {
    entry_fee_amount: 20.00,
    entry_fee_status: 'paid',
    status: 'pending_review',
    payment_intent_id: paymentIntentId || null,
    last_updated: new Date().toISOString()
  };

  if (payerId) {
    patchPayload.buyer_id = payerId;
  }

  const patchResp = await fetch(patchEndpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: serviceRoleKey,
      Authorization: 'Bearer ' + serviceRoleKey,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(patchPayload)
  });

  const patchData = await patchResp.json().catch(() => ({}));
  if (!patchResp.ok) {
    throw new Error(patchData?.message || patchData?.error || 'Failed to update deal after Stripe payment');
  }

  return {
    received: true,
    message: 'Deal payment recorded',
    deal_id: dealId,
    payment_intent_id: paymentIntentId || null,
  };
}

async function verifyStripeSignature(payload, signatureHeader, secret) {
  if (!signatureHeader) {
    return false;
  }

  const parts = signatureHeader.split(',').map((part) => part.trim());
  const timestamp = parts.find((part) => part.startsWith('t='))?.slice(2);
  const expectedSignatures = parts
    .filter((part) => part.startsWith('v1='))
    .map((part) => part.slice(3))
    .filter(Boolean);

  if (!timestamp || !expectedSignatures.length) {
    return false;
  }

  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = await hmacSha256Hex(secret, signedPayload);
  return expectedSignatures.some((signature) => secureEqual(signature, computedSignature));
}

async function hmacSha256Hex(secret, value) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function secureEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}
