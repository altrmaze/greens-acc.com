// meetingRoom.js — Edge function for live B2B negotiation room.
// Handles: meeting doc uploads (validation + Supabase Storage), private AI contract-analysis memos.
// AI memos analyse deal document text and contract clauses only.
// Counter-party behaviour is NOT monitored. No engagement scoring. No covert tracking.

const ALLOWED_MIME_TYPES = [
  'image/png','image/jpeg','image/webp','image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/msword','application/vnd.ms-excel',
];

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB

const RESTRICTED_KEYWORDS = ['fuel','diesel','petrol','crude oil','petroleum','gasoline'];

export async function POST(request) {
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), { status: 500 });
  }

  const dbHeaders = {
    apikey: serviceRoleKey,
    Authorization: 'Bearer ' + serviceRoleKey,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };

  async function dbPost(path, body) {
    const r = await fetch(supabaseUrl + '/rest/v1/' + path, {
      method: 'POST', headers: dbHeaders, body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data: d };
  }

  async function dbGet(path) {
    const r = await fetch(supabaseUrl + '/rest/v1/' + path, {
      method: 'GET', headers: dbHeaders,
    });
    const d = await r.json().catch(() => []);
    return { ok: r.ok, status: r.status, data: d };
  }

  async function dbPatch(path, body) {
    const r = await fetch(supabaseUrl + '/rest/v1/' + path, {
      method: 'PATCH', headers: { ...dbHeaders, Prefer: 'return=representation' },
      body: JSON.stringify(body),
    });
    const d = await r.json().catch(() => ({}));
    return { ok: r.ok, status: r.status, data: d };
  }

  const body = await request.json().catch(() => ({}));
  const { action } = body || {};

  // ── REGISTER_UPLOAD ───────────────────────────────────────────────────────
  // Registers file metadata after the client uploads to Supabase Storage directly.
  // Enforces MIME type allowlist and file size cap before recording.
  if (action === 'register_upload') {
    const { deal_id, uploader_id, file_name, file_path, mime_type, file_size_bytes } = body;

    if (!deal_id || !uploader_id || !file_name || !file_path || !mime_type) {
      return new Response(JSON.stringify({ error: 'deal_id, uploader_id, file_name, file_path, mime_type required' }), { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(mime_type)) {
      return new Response(JSON.stringify({
        error: 'File type not permitted',
        allowed: ALLOWED_MIME_TYPES,
        received: mime_type,
      }), { status: 415 });
    }

    if (file_size_bytes && file_size_bytes > MAX_FILE_BYTES) {
      return new Response(JSON.stringify({ error: 'File exceeds 20 MB maximum' }), { status: 413 });
    }

    const { ok, data } = await dbPost('meeting_room_documents', {
      deal_id, uploader_id, file_name, file_path, mime_type,
      file_size_bytes: file_size_bytes || null,
      scan_status: 'PENDING',
    });

    if (!ok) {
      return new Response(JSON.stringify({ error: 'Failed to register document', details: data }), { status: 502 });
    }

    const doc = Array.isArray(data) ? data[0] : data;
    return new Response(JSON.stringify({ success: true, document: doc }), { status: 201 });
  }

  // ── GET_DOCUMENTS ─────────────────────────────────────────────────────────
  if (action === 'get_documents') {
    const { deal_id } = body;
    if (!deal_id) {
      return new Response(JSON.stringify({ error: 'deal_id required' }), { status: 400 });
    }

    const { ok, data } = await dbGet(
      'meeting_room_documents?deal_id=eq.' + encodeURIComponent(deal_id) + '&order=created_at.desc'
    );

    return new Response(JSON.stringify({ documents: ok ? data : [] }), { status: 200 });
  }

  // ── GET_MEMOS ─────────────────────────────────────────────────────────────
  // Returns private AI Secretary memos for the receiver.
  // Memos are contract-text analysis only (clause flags, compliance alerts).
  if (action === 'get_memos') {
    const { deal_id, receiver_id } = body;
    if (!deal_id || !receiver_id) {
      return new Response(JSON.stringify({ error: 'deal_id and receiver_id required' }), { status: 400 });
    }

    const { ok, data } = await dbGet(
      'meeting_memos?deal_id=eq.' + encodeURIComponent(deal_id) +
      '&receiver_id=eq.' + encodeURIComponent(receiver_id) +
      '&order=created_at.desc&limit=50'
    );

    return new Response(JSON.stringify({ memos: ok ? data : [] }), { status: 200 });
  }

  // ── MARK_MEMOS_READ ───────────────────────────────────────────────────────
  if (action === 'mark_memos_read') {
    const { deal_id, receiver_id } = body;
    if (!deal_id || !receiver_id) {
      return new Response(JSON.stringify({ error: 'deal_id and receiver_id required' }), { status: 400 });
    }

    await dbPatch(
      'meeting_memos?deal_id=eq.' + encodeURIComponent(deal_id) +
      '&receiver_id=eq.' + encodeURIComponent(receiver_id) +
      '&is_read=eq.false',
      { is_read: true }
    );

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  }

  // ── ANALYZE_CONTRACT ──────────────────────────────────────────────────────
  // Runs AI analysis on the deal contract text and posts contract-flag memos to the receiver.
  // Analyses document content only. No counter-party behavior is monitored or scored.
  if (action === 'analyze_contract') {
    const { deal_id, receiver_id, contract_text, commodity_type } = body;

    if (!deal_id || !receiver_id || !contract_text) {
      return new Response(JSON.stringify({ error: 'deal_id, receiver_id, and contract_text required' }), { status: 400 });
    }

    const commodity = (commodity_type || '').toLowerCase();
    if (RESTRICTED_KEYWORDS.some(kw => commodity.includes(kw))) {
      return new Response(JSON.stringify({ error: 'RESTRICTED_COMMODITY', message: 'Fuel and petroleum commodities are not permitted on this platform.' }), { status: 403 });
    }

    const openAiKey = process.env.OPENAI_API_KEY;
    let flags = [];

    if (openAiKey) {
      try {
        const aiResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + openAiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            temperature: 0.2,
            messages: [
              {
                role: 'system',
                content: `You are a B2B trade contract compliance analyst. Review the following contract text and identify specific clauses that may carry legal risk, unusual penalty terms, ambiguous force majeure conditions, or non-standard payment terms. Return a JSON array of objects with fields: "clause" (short reference), "severity" ("INFO"|"WARNING"|"CRITICAL"), "memo" (concise 1-sentence plain-English flag). Focus on the document text only. Do not comment on the parties' behaviour or psychological state.`,
              },
              { role: 'user', content: contract_text.slice(0, 6000) },
            ],
            response_format: { type: 'json_object' },
          }),
        });
        const aiData = await aiResp.json();
        const content = aiData?.choices?.[0]?.message?.content;
        const parsed = JSON.parse(content || '{}');
        flags = Array.isArray(parsed.flags) ? parsed.flags : (Array.isArray(parsed) ? parsed : []);
      } catch (_) {
        // AI unavailable — fall through to default flags
      }
    }

    // Fallback static analysis if AI is unavailable
    if (!flags.length) {
      flags = [
        { clause: 'General Review', severity: 'INFO', memo: 'Contract submitted for AI analysis. Review penalty clauses, payment terms, and force majeure provisions before signing.' },
      ];
    }

    // Insert memo records for each flag
    const memoInserts = flags.map(f => ({
      deal_id,
      receiver_id,
      memo_type: 'CONTRACT_FLAG',
      content_message: f.memo || f.content_message || 'Review this clause.',
      source_clause: f.clause || null,
      severity: ['INFO','WARNING','CRITICAL'].includes(f.severity) ? f.severity : 'INFO',
    }));

    const insertResults = await Promise.all(memoInserts.map(m => dbPost('meeting_memos', m)));
    const inserted = insertResults.filter(r => r.ok).length;

    return new Response(JSON.stringify({
      success: true,
      memos_created: inserted,
      flags_analysed: flags.length,
    }), { status: 200 });
  }

  return new Response(
    JSON.stringify({ error: 'Unknown action. Supported: register_upload | get_documents | get_memos | mark_memos_read | analyze_contract' }),
    { status: 400 }
  );
}

export async function GET(_request) {
  return new Response(JSON.stringify({ standby: true, service: 'meetingRoom' }), { status: 200 });
}
