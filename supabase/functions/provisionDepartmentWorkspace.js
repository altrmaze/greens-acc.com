const DEPARTMENT_ROLE_ALLOWLIST = new Set(['dept_lead', 'staff']);
const FORBIDDEN_SYSTEM_ROLE = 'manager';

function randomToken(byteLength = 16) {
  const bytes = new Uint8Array(byteLength);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < byteLength; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes).map((value) => value.toString(16).padStart(2, '0')).join('');
}

function buildDefaultWorkspaceMetadata({ departmentId, departmentSlug }) {
  return {
    department_id: departmentId,
    notification_streams: [],
    logging: [],
    queue_names: {
      telemetry: `dept.${departmentSlug}.telemetry`,
      notifications: `dept.${departmentSlug}.notifications`,
      processing: `dept.${departmentSlug}.processing`,
    },
    sandbox: {
      cross_department_bridge_enabled: false,
      isolation_mode: 'strict',
    },
  };
}

async function parseJsonSafe(response) {
  return response.json().catch(() => ({}));
}

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const departmentName = (body?.department_name || '').trim();
  const departmentSlug = (body?.department_slug || '').trim().toLowerCase();
  const requestedDepartmentRole = (body?.department_role || 'dept_lead').trim().toLowerCase();
  const requestedSystemRole = (body?.role || 'user').trim().toLowerCase();

  if (!departmentName || !departmentSlug) {
    return new Response(JSON.stringify({ error: 'department_name and department_slug are required' }), { status: 400 });
  }

  if (!DEPARTMENT_ROLE_ALLOWLIST.has(requestedDepartmentRole)) {
    return new Response(JSON.stringify({ error: 'department_role must be dept_lead or staff' }), { status: 400 });
  }

  if (requestedSystemRole === FORBIDDEN_SYSTEM_ROLE || requestedDepartmentRole === FORBIDDEN_SYSTEM_ROLE) {
    return new Response(JSON.stringify({ error: 'manager role is reserved and cannot be assigned to department users' }), { status: 403 });
  }

  const headers = {
    'Content-Type': 'application/json',
    apikey: serviceRoleKey,
    Authorization: 'Bearer ' + serviceRoleKey,
  };

  const departmentLookup = await fetch(
    `${supabaseUrl}/rest/v1/departments?slug=eq.${encodeURIComponent(departmentSlug)}&select=id,name,slug&limit=1`,
    { method: 'GET', headers },
  );

  const existingDepartments = await parseJsonSafe(departmentLookup);
  if (!departmentLookup.ok) {
    return new Response(JSON.stringify({ error: 'Failed to resolve department', details: existingDepartments }), { status: departmentLookup.status });
  }

  let department = Array.isArray(existingDepartments) && existingDepartments.length > 0 ? existingDepartments[0] : null;
  if (!department) {
    const insertDepartment = await fetch(`${supabaseUrl}/rest/v1/departments`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'return=representation' },
      body: JSON.stringify({
        name: departmentName,
        slug: departmentSlug,
      }),
    });
    const insertedDepartment = await parseJsonSafe(insertDepartment);
    if (!insertDepartment.ok) {
      return new Response(JSON.stringify({ error: 'Failed to create department', details: insertedDepartment }), { status: insertDepartment.status });
    }
    department = Array.isArray(insertedDepartment) ? insertedDepartment[0] : insertedDepartment;
  }

  const metadata = {
    ...buildDefaultWorkspaceMetadata({ departmentId: department.id, departmentSlug }),
    ...(body?.workspace_metadata && typeof body.workspace_metadata === 'object' ? body.workspace_metadata : {}),
  };

  const workspaceInsert = await fetch(`${supabaseUrl}/rest/v1/workspaces`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      department_id: department.id,
      workspace_metadata: metadata,
    }),
  });
  const workspaceData = await parseJsonSafe(workspaceInsert);
  if (!workspaceInsert.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create workspace', details: workspaceData }), { status: workspaceInsert.status });
  }
  const workspace = Array.isArray(workspaceData) ? workspaceData[0] : workspaceData;

  const generatedUsername = `${departmentSlug}-${randomToken(6)}`;
  const temporaryPassword = randomToken(24);
  const generatedEmail = `${generatedUsername}@dept.greens-acc.local`;

  const createUser = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email: generatedEmail,
      password: temporaryPassword,
      email_confirm: true,
      user_metadata: {
        username: generatedUsername,
        department_id: department.id,
        department_role: requestedDepartmentRole,
      },
      app_metadata: {
        role: requestedSystemRole,
      },
    }),
  });
  const userData = await parseJsonSafe(createUser);
  if (!createUser.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create workspace auth user', details: userData }), { status: createUser.status });
  }

  const profileInsert = await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'return=representation,resolution=merge-duplicates',
    },
    body: JSON.stringify({
      id: userData?.id,
      username: generatedUsername,
      full_name: body?.full_name || departmentName,
      role: requestedSystemRole,
      department_id: department.id,
      department_role: requestedDepartmentRole,
    }),
  });
  const profileData = await parseJsonSafe(profileInsert);
  if (!profileInsert.ok) {
    return new Response(JSON.stringify({ error: 'Failed to bind profile to workspace', details: profileData }), { status: profileInsert.status });
  }

  return new Response(JSON.stringify({
    success: true,
    department,
    workspace,
    credentials: {
      username: generatedUsername,
      temporary_password: temporaryPassword,
      email: generatedEmail,
    },
    profile: Array.isArray(profileData) ? profileData[0] : profileData,
  }), { status: 201 });
}

export async function GET() {
  return new Response(JSON.stringify({ standby: true, service: 'provisionDepartmentWorkspace' }), { status: 200 });
}
