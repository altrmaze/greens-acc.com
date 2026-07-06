// stripeConnectOnboard.js — Stripe Connect hosted onboarding for platform payouts.
// Generates a Stripe-hosted account link — raw bank credentials NEVER transit this server.

export async function POST(request) {
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const stripeKey      = process.env.STRIPE_SECRET_KEY;

  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Stripe is not configured' }), { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { action } = body || {};

  if (!action) {
    return new Response(
      JSON.stringify({ error: 'action required: create_account | create_onboard_link | get_account_status' }),
      { status: 400 }
    );
  }

  // ── CREATE_ACCOUNT ────────────────────────────────────────────────────────
  // Creates a Stripe Express Connected Account for the seller/operator.
  // Stripe handles all banking credential collection — this server never sees them.
  if (action === 'create_account') {
    const { user_id, email, country } = body;
    if (!user_id) {
      return new Response(JSON.stringify({ error: 'user_id is required' }), { status: 400 });
    }

    const stripeResp = await fetch('https://api.stripe.com/v1/accounts', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + stripeKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        type: 'express',
        country: country || 'US',
        ...(email ? { email } : {}),
        'capabilities[transfers][requested]': 'true',
        'capabilities[card_payments][requested]': 'true',
        'metadata[greens_acc_user_id]': user_id,
      }).toString(),
    });

    const account = await stripeResp.json();
    if (!stripeResp.ok) {
      return new Response(JSON.stringify({ error: 'Stripe account creation failed', details: account }), { status: stripeResp.status });
    }

    return new Response(JSON.stringify({ success: true, stripe_account_id: account.id }), { status: 201 });
  }

  // ── CREATE_ONBOARD_LINK ───────────────────────────────────────────────────
  // Generates a one-time Stripe-hosted onboarding URL.
  // The user completes bank account setup directly on Stripe — zero raw credentials on our servers.
  if (action === 'create_onboard_link') {
    const { stripe_account_id, return_url, refresh_url } = body;
    if (!stripe_account_id) {
      return new Response(JSON.stringify({ error: 'stripe_account_id is required' }), { status: 400 });
    }

    const linkResp = await fetch('https://api.stripe.com/v1/account_links', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + stripeKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        account: stripe_account_id,
        refresh_url: refresh_url || 'https://greens-acc.com/dashboard?connect=refresh',
        return_url:  return_url  || 'https://greens-acc.com/dashboard?connect=complete',
        type: 'account_onboarding',
      }).toString(),
    });

    const link = await linkResp.json();
    if (!linkResp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create onboarding link', details: link }), { status: linkResp.status });
    }

    return new Response(JSON.stringify({
      onboarding_url: link.url,
      expires_at: link.expires_at,
      note: 'Redirect the user to onboarding_url. Stripe collects and verifies all banking details directly.',
    }), { status: 200 });
  }

  // ── GET_ACCOUNT_STATUS ────────────────────────────────────────────────────
  if (action === 'get_account_status') {
    const { stripe_account_id } = body;
    if (!stripe_account_id) {
      return new Response(JSON.stringify({ error: 'stripe_account_id is required' }), { status: 400 });
    }

    const acctResp = await fetch(`https://api.stripe.com/v1/accounts/${encodeURIComponent(stripe_account_id)}`, {
      headers: { Authorization: 'Bearer ' + stripeKey },
    });
    const account = await acctResp.json();
    if (!acctResp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch account', details: account }), { status: acctResp.status });
    }

    return new Response(JSON.stringify({
      stripe_account_id: account.id,
      charges_enabled:   account.charges_enabled,
      payouts_enabled:   account.payouts_enabled,
      details_submitted: account.details_submitted,
      onboarding_complete: account.details_submitted && account.charges_enabled && account.payouts_enabled,
    }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
}

export async function GET(_request) {
  return new Response(JSON.stringify({ standby: true, service: 'stripeConnectOnboard' }), { status: 200 });
}
