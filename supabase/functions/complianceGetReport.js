// Greens ACC — AI Legal Compliance Monitor
// Fetches a compliance run report with all associated check results.

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { run_id, room_id, deal_id, limit } = body || {};

  if (!run_id && !room_id && !deal_id) {
    return new Response(JSON.stringify({ error: 'run_id, room_id, or deal_id is required' }), { status: 400 });
  }

  const authHeader = 'Bearer ' + serviceRoleKey;
  const pageLimit = Math.min(Number(limit) || 20, 100);

  // Build query for compliance runs
  let runsQuery = supabaseUrl + '/rest/v1/compliance_runs?order=created_at.desc&limit=' + pageLimit;
  if (run_id) runsQuery += '&id=eq.' + run_id;
  else if (room_id) runsQuery += '&room_id=eq.' + room_id;
  else if (deal_id) runsQuery += '&deal_id=eq.' + deal_id;

  const runsResp = await fetch(runsQuery, {
    headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader }
  });
  const runs = await runsResp.json();
  if (!runsResp.ok) {
    return new Response(JSON.stringify({ error: 'Failed to fetch runs', details: runs }), { status: runsResp.status });
  }

  // For each run, fetch associated checks
  const runsWithChecks = await Promise.all(
    (Array.isArray(runs) ? runs : []).map(async run => {
      const checksResp = await fetch(
        supabaseUrl + '/rest/v1/compliance_checks?run_id=eq.' + run.id + '&order=created_at.asc',
        { headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader } }
      );
      const checks = checksResp.ok ? await checksResp.json() : [];
      return Object.assign({}, run, { checks: Array.isArray(checks) ? checks : [] });
    })
  );

  return new Response(JSON.stringify({
    total: runsWithChecks.length,
    runs: runsWithChecks
  }), { status: 200 });
}
