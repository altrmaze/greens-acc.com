import { writeAccountingLog } from './paymentService.js';

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey = process.env.STRIPE_SECRET_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const event = await request.json();

  try {
    if (event.type === 'checkout.session.completed' || (event.data && event.data.object && event.data.object.payment_status === 'paid')) {
      const session = event.data.object;
      const sessionId = session.id;
      const metadata = session.metadata || {};
      const dealId = metadata.deal_id;
      const payerId = metadata.payer_id;

      let isPaid = false;
      const sandboxMode = !stripeKey || metadata.mode === 'sandbox' || event?.sandbox === true;
      if (sandboxMode) {
        isPaid = true;
      } else {
        const stripeResp = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
          method: 'GET',
          headers: { Authorization: 'Bearer ' + stripeKey }
        });
        const stripeData = await stripeResp.json();
        isPaid = stripeResp.ok && stripeData.payment_status === 'paid';
      }

      if (isPaid) {
        const patchEndpoint = `${supabaseUrl}/rest/v1/green_acc_deals?id=eq.${encodeURIComponent(dealId)}`;
        const patchPayload = {
          buyer_id: payerId,
          entry_fee_amount: 20.00,
          entry_fee_status: 'paid',
          last_updated: new Date().toISOString()
        };

        await fetch(patchEndpoint, {
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

        await writeAccountingLog({
          supabaseUrl,
          serviceRoleKey,
          payment: {
            deal_id: dealId,
            payer_id: payerId,
            gateway: sandboxMode ? 'demo-payment-service' : 'stripe',
            mode: sandboxMode ? 'sandbox' : 'live',
            channel: 'webhook',
            transaction_id: sessionId || `txn_${Date.now()}`,
            amount: 20,
            currency: 'USD',
            status: 'succeeded'
          },
          details: {
            source: 'stripeWebhook',
            event_type: event.type || 'checkout.session.completed'
          }
        });

        return new Response(JSON.stringify({ received: true, sandbox: sandboxMode, message: 'Entry fee marked paid' }), { status: 200 });
      }

      return new Response(JSON.stringify({ received: false, message: 'Stripe session not paid' }), { status: 200 });
    }

    return new Response(JSON.stringify({ received: true, message: 'Event ignored' }), { status: 200 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
