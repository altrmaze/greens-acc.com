// Greens ACC — AI Legal Compliance Monitor
// Initiates a structured compliance run with individual verification gate checks.

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { room_id, deal_id, shipment_id, scope, triggered_by, content } = body || {};

  if (!room_id && !deal_id && !shipment_id) {
    return new Response(JSON.stringify({ error: 'At least one of room_id, deal_id, or shipment_id is required' }), { status: 400 });
  }

  const validScopes = ['full','sanctions','tariff','commodity','export_control','document'];
  const resolvedScope = validScopes.includes(scope) ? scope : 'full';
  const authHeader = 'Bearer ' + serviceRoleKey;

  // Create compliance run record
  const runPayload = {
    room_id: room_id || null,
    deal_id: deal_id || null,
    shipment_id: shipment_id || null,
    run_status: 'running',
    triggered_by: triggered_by || 'system',
    scope: resolvedScope,
    total_checks: 0, passed_checks: 0, failed_checks: 0,
    started_at: new Date().toISOString(),
    created_at: new Date().toISOString()
  };

  const runResp = await fetch(supabaseUrl + '/rest/v1/compliance_runs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader, Prefer: 'return=representation' },
    body: JSON.stringify(runPayload)
  });
  const runData = await runResp.json();
  if (!runResp.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create compliance run', details: runData }), { status: runResp.status });
  }
  const run = Array.isArray(runData) ? runData[0] : runData;

  // Define verification gates based on scope
  const allCheckTypes = ['sanctions_screen', 'tariff_classification', 'export_license', 'dual_use', 'document_verify'];
  const scopeMap = {
    full: allCheckTypes,
    sanctions: ['sanctions_screen'],
    tariff: ['tariff_classification'],
    commodity: ['dual_use'],
    export_control: ['export_license', 'dual_use'],
    document: ['document_verify']
  };
  const checkTypes = scopeMap[resolvedScope] || allCheckTypes;

  // Run each check (placeholder logic — extend with real AI/API calls)
  const textLower = (content || '').toLowerCase();
  const checks = [];

  for (const checkType of checkTypes) {
    let checkStatus = 'pass';
    let finding = 'No issues detected';
    let legalRef = null;
    let recommendation = null;
    let requiresHuman = false;

    if (checkType === 'sanctions_screen') {
      const restricted = ['iran','syria','north korea','cuba','crimea','irgc','hamas','hezbollah'];
      const hit = restricted.find(r => textLower.includes(r));
      if (hit) {
        checkStatus = 'fail';
        finding = 'Potential sanctions reference: ' + hit;
        legalRef = 'OFAC SDN List / EU Sanctions Regulation 833/2014';
        recommendation = 'Halt transaction and consult compliance officer';
        requiresHuman = true;
      }
    } else if (checkType === 'tariff_classification') {
      if (textLower.includes('circumvent tariff') || textLower.includes('avoid duty')) {
        checkStatus = 'fail';
        finding = 'Tariff evasion language detected';
        legalRef = 'WCO Harmonized System / Customs Valuation Agreement';
        recommendation = 'Escalate to customs compliance team';
        requiresHuman = true;
      }
    } else if (checkType === 'export_license') {
      const controlled = ['encryption key', 'advanced semiconductor', 'military technology'];
      const hit = controlled.find(c => textLower.includes(c));
      if (hit) {
        checkStatus = 'warning';
        finding = 'Potentially export-controlled item: ' + hit;
        legalRef = 'EAR (Export Administration Regulations) / ITAR';
        recommendation = 'Verify export license before proceeding';
      }
    } else if (checkType === 'dual_use') {
      const dualUse = ['chemical precursor', 'nuclear material', 'biological agent'];
      const hit = dualUse.find(d => textLower.includes(d));
      if (hit) {
        checkStatus = 'fail';
        finding = 'Dual-use item reference: ' + hit;
        legalRef = 'EU Dual-Use Regulation 2021/821 / Wassenaar Arrangement';
        recommendation = 'Immediate escalation required';
        requiresHuman = true;
      }
    } else if (checkType === 'document_verify') {
      checkStatus = content ? 'pass' : 'warning';
      finding = content ? 'Document content present for review' : 'No document content provided — manual review needed';
      requiresHuman = !content;
    }

    checks.push({ checkType, checkStatus, finding, legalRef, recommendation, requiresHuman });
  }

  // Insert all check records
  const checkPayloads = checks.map(c => ({
    run_id: run.id,
    check_type: c.checkType,
    check_status: c.checkStatus,
    subject: resolvedScope,
    finding: c.finding,
    legal_reference: c.legalRef,
    recommendation: c.recommendation,
    requires_human_review: c.requiresHuman,
    created_at: new Date().toISOString()
  }));

  await fetch(supabaseUrl + '/rest/v1/compliance_checks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader },
    body: JSON.stringify(checkPayloads)
  });

  const passed = checks.filter(c => c.checkStatus === 'pass').length;
  const failed = checks.filter(c => c.checkStatus === 'fail').length;
  const warnings = checks.filter(c => c.checkStatus === 'warning').length;
  const overallStatus = failed > 0 ? 'failed' : 'completed';

  // Update run with results
  await fetch(supabaseUrl + '/rest/v1/compliance_runs?id=eq.' + run.id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', apikey: serviceRoleKey, Authorization: authHeader },
    body: JSON.stringify({
      run_status: overallStatus,
      total_checks: checks.length,
      passed_checks: passed,
      failed_checks: failed,
      result_summary: { passed, failed, warnings, overall: overallStatus },
      completed_at: new Date().toISOString()
    })
  });

  return new Response(JSON.stringify({
    message: 'compliance run complete',
    run_id: run.id,
    scope: resolvedScope,
    run_status: overallStatus,
    total_checks: checks.length,
    passed_checks: passed,
    failed_checks: failed,
    warnings,
    checks,
    requires_human_review: checks.some(c => c.requiresHuman)
  }), { status: 200 });
}
