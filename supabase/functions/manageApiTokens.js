/**
 * manageApiTokens — API Token Management edge function
 *
 * Actions (passed as JSON body field `action`):
 *   create   — generate a new API token for a user
 *   list     — list tokens for a user (prefix + metadata only, never the raw token)
 *   revoke   — revoke a token by id
 *   validate — validate a raw token and return its metadata (used by other functions)
 *
 * Token format: gacc_<40 hex chars>
 * Only the SHA-256 hash of the token is stored. The plaintext is returned once
 * on creation and never persisted.
 */

function generateRandomHex(byteCount) {
  const bytes = new Uint8Array(byteCount);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteCount; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function sha256Hex(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function handleCreate(body, supabaseUrl, serviceRoleKey) {
  const { user_id, name, scopes, expires_in_days } = body;

  if (!user_id || !name) {
    return jsonResponse({ error: 'user_id and name are required' }, 400);
  }

  const rawToken = 'gacc_' + generateRandomHex(20);
  const tokenPrefix = rawToken.substring(0, 12);
  const tokenHash = await sha256Hex(rawToken);

  const expiresAt = expires_in_days
    ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
    : null;

  const payload = {
    user_id,
    name,
    token_prefix: tokenPrefix,
    token_hash: tokenHash,
    scopes: Array.isArray(scopes) ? scopes : [],
    is_active: true,
    expires_at: expiresAt,
    created_at: new Date().toISOString()
  };

  const resp = await fetch(`${supabaseUrl}/rest/v1/api_tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(payload)
  });

  const data = await resp.json();
  if (!resp.ok) {
    return jsonResponse({ error: 'Failed to create token', details: data }, resp.status);
  }

  const record = Array.isArray(data) ? data[0] : data;

  // Return the plaintext token ONCE — it is never stored
  return jsonResponse({
    message: 'API token created. Store it securely — it will not be shown again.',
    token: rawToken,
    id: record.id,
    name: record.name,
    token_prefix: tokenPrefix,
    scopes: record.scopes,
    expires_at: record.expires_at,
    created_at: record.created_at
  });
}

async function handleList(body, supabaseUrl, serviceRoleKey) {
  const { user_id } = body;

  if (!user_id) {
    return jsonResponse({ error: 'user_id is required' }, 400);
  }

  const resp = await fetch(
    `${supabaseUrl}/rest/v1/api_tokens?user_id=eq.${encodeURIComponent(user_id)}&select=id,name,token_prefix,scopes,is_active,last_used_at,expires_at,revoked_at,created_at&order=created_at.desc`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  const data = await resp.json();
  if (!resp.ok) {
    return jsonResponse({ error: 'Failed to list tokens', details: data }, resp.status);
  }

  return jsonResponse({ tokens: data });
}

async function handleRevoke(body, supabaseUrl, serviceRoleKey) {
  const { id, user_id } = body;

  if (!id || !user_id) {
    return jsonResponse({ error: 'id and user_id are required' }, 400);
  }

  const revokedAt = new Date().toISOString();

  const resp = await fetch(
    `${supabaseUrl}/rest/v1/api_tokens?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(user_id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ is_active: false, revoked_at: revokedAt })
    }
  );

  const data = await resp.json();
  if (!resp.ok) {
    return jsonResponse({ error: 'Failed to revoke token', details: data }, resp.status);
  }

  const updated = Array.isArray(data) ? data[0] : data;
  if (!updated) {
    return jsonResponse({ error: 'Token not found or not owned by user' }, 404);
  }

  return jsonResponse({ message: 'Token revoked', id, revoked_at: revokedAt });
}

async function handleValidate(body, supabaseUrl, serviceRoleKey) {
  const { token } = body;

  if (!token) {
    return jsonResponse({ error: 'token is required' }, 400);
  }

  const tokenHash = await sha256Hex(token);

  const resp = await fetch(
    `${supabaseUrl}/rest/v1/api_tokens?token_hash=eq.${encodeURIComponent(tokenHash)}&select=id,user_id,name,token_prefix,scopes,is_active,expires_at,revoked_at`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    }
  );

  const data = await resp.json();
  if (!resp.ok) {
    return jsonResponse({ error: 'Validation lookup failed', details: data }, resp.status);
  }

  const record = Array.isArray(data) ? data[0] : null;

  if (!record) {
    return jsonResponse({ valid: false, error: 'Token not found' }, 401);
  }

  if (!record.is_active) {
    return jsonResponse({ valid: false, error: 'Token has been revoked' }, 401);
  }

  if (record.expires_at && new Date(record.expires_at) < new Date()) {
    return jsonResponse({ valid: false, error: 'Token has expired' }, 401);
  }

  // Update last_used_at (best-effort — don't fail validation if this errors)
  fetch(
    `${supabaseUrl}/rest/v1/api_tokens?id=eq.${encodeURIComponent(record.id)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      },
      body: JSON.stringify({ last_used_at: new Date().toISOString() })
    }
  ).catch(() => {});

  return jsonResponse({
    valid: true,
    id: record.id,
    user_id: record.user_id,
    name: record.name,
    token_prefix: record.token_prefix,
    scopes: record.scopes
  });
}

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { action } = body || {};

  switch (action) {
    case 'create':
      return handleCreate(body, supabaseUrl, serviceRoleKey);
    case 'list':
      return handleList(body, supabaseUrl, serviceRoleKey);
    case 'revoke':
      return handleRevoke(body, supabaseUrl, serviceRoleKey);
    case 'validate':
      return handleValidate(body, supabaseUrl, serviceRoleKey);
    default:
      return jsonResponse(
        { error: 'Invalid action. Use: create | list | revoke | validate' },
        400
      );
  }
}
