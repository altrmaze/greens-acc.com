// dealClearanceRoom.js — Secure Deal Clearance Room engine
// Handles: clearance init, document submission, NCNDA signing, appointment booking.

const RESTRICTED_KEYWORDS = ['fuel', 'diesel', 'petrol', 'crude oil', 'petroleum', 'gasoline'];

const DOC_REQUIREMENTS = {
  agri: [
    { type: 'LOI_ICPO', label: 'LOI / ICPO', required: true },
    { type: 'SGS', label: 'SGS Inspection Certificate', required: true },
    { type: 'COO', label: 'Certificate of Origin', required: true },
    { type: 'HEALTH', label: 'Health Certificate', required: true },
    { type: 'PHYTO', label: 'Phytosanitary / Agriculture Certificate', required: true },
  ],
  metals: [
    { type: 'LOI_ICPO', label: 'LOI / ICPO', required: true },
    { type: 'ASSAY', label: 'Assay / Mineral Analysis Certificate', required: true },
    { type: 'SGS', label: 'SGS Inspection Certificate', required: true },
    { type: 'COO', label: 'Certificate of Origin', required: true },
  ],
  food: [
    { type: 'LOI_ICPO', label: 'LOI / ICPO', required: true },
    { type: 'SGS', label: 'SGS Inspection Certificate', required: true },
    { type: 'COO', label: 'Certificate of Origin', required: true },
    { type: 'HEALTH', label: 'Health Certificate', required: true },
    { type: 'HALAL', label: 'Halal / Food Safety Certification', required: false },
  ],
  timber: [
    { type: 'LOI_ICPO', label: 'LOI / ICPO', required: true },
    { type: 'PHYTO', label: 'Phytosanitary Certificate', required: true },
    { type: 'COO', label: 'Certificate of Origin', required: true },
    { type: 'CITES', label: 'CITES Permit (if applicable)', required: false },
  ],
  general: [
    { type: 'LOI_ICPO', label: 'LOI / ICPO', required: true },
    { type: 'COO', label: 'Certificate of Origin', required: true },
    { type: 'SGS', label: 'SGS Inspection Certificate', required: false },
  ],
};

function detectCommodityCategory(commodityType) {
  const c = (commodityType || '').toLowerCase();
  if (/gum|cotton|wheat|grain|rice|sesame|cashew|coffee|cacao|tobacco|rubber|sisal|agri/.test(c)) return 'agri';
  if (/copper|gold|silver|zinc|iron|steel|alumin|mineral|ore|metal/.test(c)) return 'metals';
  if (/chicken|beef|pork|fish|seafood|dairy|frozen|meat|food/.test(c)) return 'food';
  if (/timber|hardwood|softwood|lumber|wood/.test(c)) return 'timber';
  return 'general';
}

function generateAvailableSlots() {
  const slots = [];
  const now = new Date();
  const tradingHours = [7, 9, 11, 13, 15];
  for (let day = 1; day <= 7; day++) {
    const date = new Date(now);
    date.setUTCDate(now.getUTCDate() + day);
    if (date.getUTCDay() === 0 || date.getUTCDay() === 6) continue;
    for (const hour of tradingHours) {
      const slot = new Date(date);
      slot.setUTCHours(hour, 0, 0, 0);
      slots.push(slot.toISOString());
    }
  }
  return slots;
}

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { action } = body || {};

  if (!action) {
    return new Response(
      JSON.stringify({ error: 'action required: get_clearance | submit_document | sign_ncnda | book_appointment | get_slots' }),
      { status: 400 }
    );
  }

  const reqHeaders = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: `******
    Prefer: 'return=representation',
  };

  // ── GET_CLEARANCE ─────────────────────────────────────────────────────────
  if (action === 'get_clearance') {
    const { deal_id, user_id, commodity_type } = body;
    if (!deal_id || !user_id) {
      return new Response(JSON.stringify({ error: 'deal_id and user_id are required' }), { status: 400 });
    }
    const commodity = (commodity_type || '').toLowerCase();
    if (RESTRICTED_KEYWORDS.some(kw => commodity.includes(kw))) {
      return new Response(JSON.stringify({
        error: 'This platform does not facilitate fuel, diesel, or petroleum commodity transactions.',
        policy_code: 'RESTRICTED_COMMODITY',
      }), { status: 403 });
    }

    const existingResp = await fetch(
      `${supabaseUrl}/rest/v1/deal_clearances?deal_id=eq.${encodeURIComponent(deal_id)}&user_id=eq.${encodeURIComponent(user_id)}&select=*`,
      { headers: reqHeaders }
    );
    const rows = await existingResp.json();
    let clearance = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!clearance) {
      const createResp = await fetch(`${supabaseUrl}/rest/v1/deal_clearances`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          deal_id,
          user_id,
          commodity_type: commodity_type || 'general',
          status: 'PENDING_DOCUMENTS',
          ncnda_signed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      });
      const created = await createResp.json();
      if (!createResp.ok) {
        return new Response(JSON.stringify({ error: 'Failed to initialise clearance', details: created }), { status: createResp.status });
      }
      clearance = Array.isArray(created) ? created[0] : created;
    }

    const docsResp = await fetch(
      `${supabaseUrl}/rest/v1/deal_documents?clearance_id=eq.${encodeURIComponent(clearance.id)}&select=*`,
      { headers: reqHeaders }
    );
    const docs = await docsResp.json();

    const category = detectCommodityCategory(clearance.commodity_type || '');
    const requirements = DOC_REQUIREMENTS[category] || DOC_REQUIREMENTS.general;

    return new Response(JSON.stringify({
      clearance,
      uploaded_documents: Array.isArray(docs) ? docs : [],
      required_documents: requirements,
      category,
    }), { status: 200 });
  }

  // ── SUBMIT_DOCUMENT ───────────────────────────────────────────────────────
  if (action === 'submit_document') {
    const { clearance_id, document_type, file_name, file_size_bytes } = body;
    if (!clearance_id || !document_type || !file_name) {
      return new Response(JSON.stringify({ error: 'clearance_id, document_type, and file_name are required' }), { status: 400 });
    }

    const docResp = await fetch(`${supabaseUrl}/rest/v1/deal_documents`, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        clearance_id,
        document_type,
        file_name,
        file_size_bytes: file_size_bytes || null,
        status: 'PENDING_REVIEW',
        uploaded_at: new Date().toISOString(),
      }),
    });
    const docData = await docResp.json();
    if (!docResp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to register document', details: docData }), { status: docResp.status });
    }

    await fetch(
      `${supabaseUrl}/rest/v1/deal_clearances?id=eq.${encodeURIComponent(clearance_id)}`,
      {
        method: 'PATCH',
        headers: reqHeaders,
        body: JSON.stringify({ status: 'PENDING_REVIEW', updated_at: new Date().toISOString() }),
      }
    );

    const doc = Array.isArray(docData) ? docData[0] : docData;
    return new Response(JSON.stringify({ success: true, document: doc }), { status: 201 });
  }

  // ── SIGN_NCNDA ────────────────────────────────────────────────────────────
  if (action === 'sign_ncnda') {
    const { clearance_id } = body;
    if (!clearance_id) {
      return new Response(JSON.stringify({ error: 'clearance_id is required' }), { status: 400 });
    }

    const patchResp = await fetch(
      `${supabaseUrl}/rest/v1/deal_clearances?id=eq.${encodeURIComponent(clearance_id)}`,
      {
        method: 'PATCH',
        headers: reqHeaders,
        body: JSON.stringify({
          ncnda_signed: true,
          ncnda_signed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }),
      }
    );
    if (!patchResp.ok) {
      const err = await patchResp.json().catch(() => ({}));
      return new Response(JSON.stringify({ error: 'Failed to record NCNDA signature', details: err }), { status: patchResp.status });
    }

    return new Response(JSON.stringify({ success: true, ncnda_signed_at: new Date().toISOString() }), { status: 200 });
  }

  // ── GET_SLOTS ─────────────────────────────────────────────────────────────
  if (action === 'get_slots') {
    const { deal_id } = body;
    const allSlots = generateAvailableSlots();
    let bookedSlots = [];
    if (deal_id) {
      const bookedResp = await fetch(
        `${supabaseUrl}/rest/v1/deal_appointments?deal_id=eq.${encodeURIComponent(deal_id)}&status=in.(pending,confirmed)&select=scheduled_at`,
        { headers: reqHeaders }
      );
      const booked = await bookedResp.json();
      bookedSlots = Array.isArray(booked) ? booked.map(b => b.scheduled_at) : [];
    }
    const available = allSlots.filter(s => !bookedSlots.includes(s));
    return new Response(JSON.stringify({ slots: available }), { status: 200 });
  }

  // ── BOOK_APPOINTMENT ──────────────────────────────────────────────────────
  if (action === 'book_appointment') {
    const { deal_id, user_id, scheduled_at, timezone, notes } = body;
    if (!deal_id || !user_id || !scheduled_at) {
      return new Response(JSON.stringify({ error: 'deal_id, user_id, and scheduled_at are required' }), { status: 400 });
    }

    const conflictResp = await fetch(
      `${supabaseUrl}/rest/v1/deal_appointments?deal_id=eq.${encodeURIComponent(deal_id)}&scheduled_at=eq.${encodeURIComponent(scheduled_at)}&status=in.(pending,confirmed)&select=id`,
      { headers: reqHeaders }
    );
    const conflicts = await conflictResp.json();
    if (Array.isArray(conflicts) && conflicts.length > 0) {
      return new Response(JSON.stringify({ error: 'This time slot is no longer available.' }), { status: 409 });
    }

    const apptResp = await fetch(`${supabaseUrl}/rest/v1/deal_appointments`, {
      method: 'POST',
      headers: reqHeaders,
      body: JSON.stringify({
        deal_id,
        user_id,
        scheduled_at,
        duration_minutes: 60,
        timezone: timezone || 'UTC',
        status: 'pending',
        notes: notes || null,
        created_at: new Date().toISOString(),
      }),
    });
    const apptData = await apptResp.json();
    if (!apptResp.ok) {
      return new Response(JSON.stringify({ error: 'Failed to book appointment', details: apptData }), { status: apptResp.status });
    }

    const appt = Array.isArray(apptData) ? apptData[0] : apptData;
    return new Response(JSON.stringify({ success: true, appointment: appt }), { status: 201 });
  }

  return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400 });
}

export async function GET(_request) {
  return new Response(JSON.stringify({ standby: true, service: 'dealClearanceRoom' }), { status: 200 });
}
