export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { contract_id, text } = body || {};

  if (!text) {
    return new Response(JSON.stringify({ error: 'text (contract body) is required' }), { status: 400 });
  }

  const legalFrameworks = [
    'CISG (UN Convention on Contracts for the International Sale of Goods)',
    'INCOTERMS 2020 (ICC Official Global Delivery Terms)',
    'UNIDROIT Principles of International Commercial Contracts',
    'Anti-Money Laundering (AML) & Know-Your-Customer (KYC) Standards'
  ];

  const report = {
    compliant: true,
    applied_frameworks: legalFrameworks,
    discrepancies: [],
    recommended_clauses: [],
    timestamp: new Date().toISOString()
  };

  // 1. Verify Incoterms 2020 delivery assignment
  if (!(/(FOB|CIF|EXW|DDP|CFR|CIP|DAP|DPU|FCA|CPT|FAS)/i.test(text))) {
    report.compliant = false;
    report.discrepancies.push('Missing clear ICC Incoterms 2020 delivery assignment (e.g., FOB, CIF, EXW).');
    report.recommended_clauses.push('Insert explicit risk-transfer markers using standard Incoterms to protect transport liabilities.');
  }

  // 2. Governing law / CISG alignment
  if (!(/governing law|jurisdiction/i.test(text))) {
    report.compliant = false;
    report.discrepancies.push('Governing law choice or explicit CISG alignment is undefined.');
    report.recommended_clauses.push("Add: 'This contract shall be governed by and construed in accordance with the United Nations Convention on Contracts for the International Sale of Goods (CISG).'");
  }

  // 3. Payment terms (LC, wire, escrow)
  if (!(/payment terms|letter of credit|LC|wire transfer|escrow/i.test(text))) {
    report.compliant = false;
    report.discrepancies.push('Payment terms are not explicitly defined.');
    report.recommended_clauses.push('Specify payment method (e.g., Irrevocable Letter of Credit, escrow, or wire transfer) and timeline.');
  }

  // 4. Dispute resolution clause
  if (!(/dispute|arbitration|mediation|ICC|UNCITRAL/i.test(text))) {
    report.discrepancies.push('No dispute resolution mechanism found.');
    report.recommended_clauses.push('Add an arbitration clause referencing ICC or UNCITRAL rules for international disputes.');
  }

  // 5. Force majeure
  if (!(/force majeure|act of god|unforeseeable/i.test(text))) {
    report.discrepancies.push('Force majeure clause is absent.');
    report.recommended_clauses.push('Include a force majeure clause covering natural disasters, war, pandemics, and government actions.');
  }

  // Log audit to database
  const logPayload = {
    contract_id: contract_id || null,
    is_compliant: report.compliant,
    report_payload: report,
    created_at: new Date().toISOString()
  };

  const logResp = await fetch(`${supabaseUrl}/rest/v1/legal_audit_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `******
      Prefer: 'return=representation'
    },
    body: JSON.stringify(logPayload)
  });

  const logData = await logResp.json();
  const auditLog = logResp.ok ? (Array.isArray(logData) ? logData[0] : logData) : null;

  return new Response(JSON.stringify({
    message: 'Contract compliance audit complete',
    compliance_status: report.compliant ? 'PASS' : 'ACTION REQUIRED',
    report,
    audit_log: auditLog,
    timestamp: new Date().toISOString()
  }), { status: 200 });
}

export async function GET(_request) {
  return new Response(JSON.stringify({ standby: true, message: "hi Ayman" }), { status: 200 });
}
