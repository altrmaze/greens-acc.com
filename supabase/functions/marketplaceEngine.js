export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const action = body?.action;

  if (!action) {
    return new Response(JSON.stringify({ error: 'action is required: list_asset | process_verification' }), { status: 400 });
  }

  const VERIFICATION_FEE = 20.00;
  const RESTRICTED_MATERIALS = ['weapons', 'narcotics', 'hazardous_waste', 'contraband'];

  // ── MODULE 1a: LIST ASSET ────────────────────────────────────────────────
  if (action === 'list_asset') {
    const { title, category, quantity, price_per_unit, seller_id, description } = body;

    if (!title || !category || !seller_id) {
      return new Response(JSON.stringify({ error: 'title, category, and seller_id are required' }), { status: 400 });
    }

    // Screen for restricted materials
    const content = `${title} ${description || ''} ${category}`.toLowerCase();
    const isRestricted = RESTRICTED_MATERIALS.some(kw => content.includes(kw));

    if (isRestricted) {
      // Suspend the seller account
      await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${encodeURIComponent(seller_id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `******
        },
        body: JSON.stringify({
          account_status: 'suspended_compliance',
          security_flags: 'Restricted materials policy violation'
        })
      });

      return new Response(JSON.stringify({
        success: false,
        reason: 'Listing rejected: restricted materials compliance check failed.',
        kill_switch_triggered: true
      }), { status: 403 });
    }

    const payload = {
      title,
      category,
      quantity: quantity ?? null,
      price_per_unit: price_per_unit ?? null,
      seller_id,
      description: description ?? null,
      is_verified: false,
      status: 'pending_verification',
      created_at: new Date().toISOString()
    };

    const resp = await fetch(`${supabaseUrl}/rest/v1/marketplace_listings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `******
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create listing', details: data }), { status: resp.status });
    }

    const listing = Array.isArray(data) ? data[0] : data;
    return new Response(JSON.stringify({ success: true, listing }), { status: 201 });
  }

  // ── MODULE 1b: PROCESS VERIFICATION ─────────────────────────────────────
  if (action === 'process_verification') {
    const { listing_id, amount, is_cleared } = body;

    if (!listing_id) {
      return new Response(JSON.stringify({ error: 'listing_id is required' }), { status: 400 });
    }

    if (Number(amount) !== VERIFICATION_FEE || !is_cleared) {
      return new Response(JSON.stringify({
        success: false,
        error: `Invalid verification deposit. Required: $${VERIFICATION_FEE} cleared payment.`
      }), { status: 400 });
    }

    const resp = await fetch(
      `${supabaseUrl}/rest/v1/marketplace_listings?id=eq.${encodeURIComponent(listing_id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `******
          Prefer: 'return=representation'
        },
        body: JSON.stringify({ is_verified: true, status: 'active_global' })
      }
    );

    const data = await resp.json();
    if (!resp.ok) {
      return new Response(JSON.stringify({ error: 'Verification update failed', details: data }), { status: resp.status });
    }

    const listing = Array.isArray(data) ? data[0] : data;
    return new Response(JSON.stringify({ success: true, listing }), { status: 200 });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
}
