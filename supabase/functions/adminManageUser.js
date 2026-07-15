/**
 * adminManageUser — User Management admin edge function
 *
 * Performs privileged user-management actions that require the
 * Supabase service-role key (bypassing RLS):
 *
 *   invite_user     — invite a new user by email and create their profile
 *   reset_password  — send a password-reset email to an existing user
 *   delete_user     — hard-delete a user from auth.users (cascades to profiles)
 *
 * Every action is verified against the caller's JWT:
 *   1. Extract the ****** from the Authorization header.
 *   2. Exchange it with Supabase Auth to resolve the caller's user ID.
 *   3. Look up the caller's role in the profiles table via the service key.
 *   4. Reject any non-admin caller with HTTP 403.
 *   5. Perform the requested action.
 *   6. Write an entry to user_audit_logs.
 */

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/**
 * Verify the caller is an authenticated admin user.
 * Returns { actorId } on success or { error, status } on failure.
 */
async function verifyAdmin(request, supabaseUrl, serviceRoleKey) {
  const authHeader = request.headers ? request.headers.get('Authorization') : null;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'Missing or malformed Authorization header', status: 401 };
  }

  const jwt = authHeader.slice(7);

  const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `******
    },
  });

  if (!userResp.ok) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  let userData;
  try {
    userData = await userResp.json();
  } catch {
    return { error: 'Failed to parse auth response', status: 500 };
  }

  const actorId = userData?.id;
  if (!actorId) {
    return { error: 'Could not determine caller identity', status: 401 };
  }

  const profileResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(actorId)}&select=role&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `******
      },
    }
  );

  if (!profileResp.ok) {
    return { error: 'Could not verify caller role', status: 500 };
  }

  let profiles;
  try {
    profiles = await profileResp.json();
  } catch {
    return { error: 'Failed to parse profile response', status: 500 };
  }

  if (!Array.isArray(profiles) || profiles[0]?.role !== 'admin') {
    return { error: 'Admin role required', status: 403 };
  }

  return { actorId };
}

/**
 * Write an entry to the user_audit_logs table using the service key.
 * Failures are logged but never surface to the caller.
 */
async function writeAuditLog(supabaseUrl, serviceRoleKey, actorId, targetId, action, oldValues, newValues) {
  try {
    await fetch(`${supabaseUrl}/rest/v1/user_audit_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `******
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        actor_id: actorId,
        target_id: targetId || null,
        action,
        old_values: oldValues || null,
        new_values: newValues || null,
      }),
    });
  } catch (e) {
    console.error('audit log write failed:', e?.message);
  }
}

/**
 * invite_user — invite a new user by email.
 * Creates the auth.users record via the Admin API, then creates the profile row.
 */
async function handleInviteUser(body, supabaseUrl, serviceRoleKey, actorId) {
  const { email, display_name, role, username } = body;

  if (!email) {
    return jsonResponse({ error: 'email is required' }, 400);
  }

  const allowedRoles = ['admin', 'developer', 'staff', 'user'];
  const assignedRole = allowedRoles.includes(role) ? role : 'user';

  const inviteResp = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `******
    },
    body: JSON.stringify({
      email,
      email_confirm: false,
      user_metadata: { display_name: display_name || null },
      options: { emailRedirectTo: `${supabaseUrl.replace('//', '//app.')}` },
    }),
  });

  let inviteData;
  try {
    inviteData = await inviteResp.json();
  } catch {
    return jsonResponse({ error: 'Failed to parse invite response' }, 500);
  }

  if (!inviteResp.ok) {
    return jsonResponse({ error: inviteData?.message || inviteData?.error || 'Failed to invite user', details: inviteData }, inviteResp.status);
  }

  const newUserId = inviteData?.id;
  if (!newUserId) {
    return jsonResponse({ error: 'No user ID returned from invite' }, 500);
  }

  const safeUsername = (username || email.split('@')[0]).replace(/[^a-zA-Z0-9_\-\.]/g, '_').slice(0, 50);
  const priorityMap = { admin: 1, developer: 2, staff: 3, user: 4 };

  const profileResp = await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `******
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      id: newUserId,
      username: safeUsername,
      email,
      display_name: display_name || null,
      role: assignedRole,
      status: 'invited',
      priority_level: priorityMap[assignedRole] ?? 4,
      invited_by: actorId,
    }),
  });

  let profileData;
  try {
    profileData = await profileResp.json();
  } catch {
    profileData = null;
  }

  if (!profileResp.ok) {
    return jsonResponse({
      error: 'User created in Auth but profile creation failed',
      details: profileData,
      user_id: newUserId,
    }, 500);
  }

  await writeAuditLog(supabaseUrl, serviceRoleKey, actorId, newUserId, 'invite_user', null, {
    email,
    role: assignedRole,
    display_name: display_name || null,
  });

  return jsonResponse({
    message: 'User invited successfully. An invitation email will be sent.',
    user_id: newUserId,
    email,
    role: assignedRole,
  });
}

/**
 * reset_password — send a password-reset email to an existing user.
 */
async function handleResetPassword(body, supabaseUrl, serviceRoleKey, actorId) {
  const { user_id, email } = body;

  if (!user_id && !email) {
    return jsonResponse({ error: 'user_id or email is required' }, 400);
  }

  let targetEmail = email;
  let targetId = user_id;

  if (!targetEmail && targetId) {
    const userResp = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(targetId)}`,
      {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `******
        },
      }
    );
    let userData;
    try {
      userData = await userResp.json();
    } catch {
      userData = null;
    }
    if (!userResp.ok || !userData?.email) {
      return jsonResponse({ error: 'User not found' }, 404);
    }
    targetEmail = userData.email;
  }

  const resetResp = await fetch(`${supabaseUrl}/auth/v1/recover`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `******
    },
    body: JSON.stringify({ email: targetEmail }),
  });

  if (!resetResp.ok) {
    let errData;
    try { errData = await resetResp.json(); } catch { errData = null; }
    return jsonResponse({ error: 'Failed to send password reset email', details: errData }, resetResp.status);
  }

  await writeAuditLog(supabaseUrl, serviceRoleKey, actorId, targetId || null, 'reset_password', null, { email: targetEmail });

  return jsonResponse({ message: 'Password reset email sent.', email: targetEmail });
}

/**
 * delete_user — hard-delete a user from auth.users (cascades to profiles).
 * Admin cannot delete themselves.
 */
async function handleDeleteUser(body, supabaseUrl, serviceRoleKey, actorId) {
  const { user_id } = body;

  if (!user_id) {
    return jsonResponse({ error: 'user_id is required' }, 400);
  }

  if (user_id === actorId) {
    return jsonResponse({ error: 'Admins cannot delete their own account' }, 403);
  }

  const profileResp = await fetch(
    `${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user_id)}&select=role,email,display_name&limit=1`,
    {
      headers: {
        apikey: serviceRoleKey,
        Authorization: `******
      },
    }
  );

  let profileData;
  try {
    profileData = await profileResp.json();
  } catch {
    profileData = [];
  }

  const targetProfile = Array.isArray(profileData) ? profileData[0] : null;

  if (targetProfile?.role === 'admin') {
    return jsonResponse({ error: 'Admin accounts cannot be deleted through this interface' }, 403);
  }

  const deleteResp = await fetch(
    `${supabaseUrl}/auth/v1/admin/users/${encodeURIComponent(user_id)}`,
    {
      method: 'DELETE',
      headers: {
        apikey: serviceRoleKey,
        Authorization: `******
      },
    }
  );

  if (!deleteResp.ok) {
    let errData;
    try { errData = await deleteResp.json(); } catch { errData = null; }
    return jsonResponse({ error: 'Failed to delete user', details: errData }, deleteResp.status);
  }

  await writeAuditLog(supabaseUrl, serviceRoleKey, actorId, user_id, 'delete_user', {
    email: targetProfile?.email || null,
    role: targetProfile?.role || null,
    display_name: targetProfile?.display_name || null,
  }, null);

  return jsonResponse({ message: 'User deleted successfully.', user_id });
}

export async function POST(request) {
  const supabaseUrl     = process.env.SUPABASE_URL;
  const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }, 500);
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, content-type' },
    });
  }

  const auth = await verifyAdmin(request, supabaseUrl, serviceRoleKey);
  if (auth.error) {
    return jsonResponse({ error: auth.error }, auth.status);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  const { action } = body || {};

  switch (action) {
    case 'invite_user':
      return handleInviteUser(body, supabaseUrl, serviceRoleKey, auth.actorId);
    case 'reset_password':
      return handleResetPassword(body, supabaseUrl, serviceRoleKey, auth.actorId);
    case 'delete_user':
      return handleDeleteUser(body, supabaseUrl, serviceRoleKey, auth.actorId);
    default:
      return jsonResponse(
        { error: 'Invalid action. Use: invite_user | reset_password | delete_user' },
        400
      );
  }
}
