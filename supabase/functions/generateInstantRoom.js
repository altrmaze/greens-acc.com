export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { creator_company, participant_email } = body || {};

  if (!creator_company) {
    return new Response(JSON.stringify({ error: 'creator_company required' }), { status: 400 });
  }

  // Generate cryptographically secure room token (hex-encoded random bytes)
  const generateToken = () => {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  // Generate encryption key for E2E (AES-256 key material: 32 random bytes → 64 hex chars)
  const generateEncryptionKey = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const roomToken = generateToken();
  const encryptionKey = generateEncryptionKey();
  const roomName = `${creator_company}-${roomToken.substring(0, 8)}`;

  // Insert instant room
  const roomPayload = {
    room_token: roomToken,
    room_name: roomName,
    creator_company,
    encryption_key: encryptionKey,
    session_fee_status: 'pending',
    is_active: true,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };

  const roomResp = await fetch(`${supabaseUrl}/rest/v1/instant_rooms`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(roomPayload)
  });

  const roomData = await roomResp.json();
  if (!roomResp.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create room', details: roomData }), { status: roomResp.status });
  }

  const room = Array.isArray(roomData) ? roomData[0] : roomData;

  // Create room session tracking
  const sessionPayload = {
    room_id: room.id,
    session_status: 'active',
    compliance_flags: {},
    kill_switch_triggered: false,
    handshake_allowed: true,
    payment_allowed: true,
    created_at: new Date().toISOString()
  };

  const sessionResp = await fetch(`${supabaseUrl}/rest/v1/room_sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(sessionPayload)
  });

  const session = await sessionResp.json();

  // Generate shareable link
  const shareLink = `${request.headers.get('origin') || 'https://greensacc.com'}/meeting.html?room_token=${roomToken}&encryption_key=${encryptionKey}&fee_required=true`;

  return new Response(JSON.stringify({ 
    message: 'instant room created',
    room: room,
    session: Array.isArray(session) ? session[0] : session,
    share_link: shareLink,
    room_token: roomToken,
    encryption_key: encryptionKey
  }), { status: 200 });
}
