export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { room_id, conversation_text, document_content } = body || {};

  if (!room_id || (!conversation_text && !document_content)) {
    return new Response(JSON.stringify({ error: 'room_id and (conversation_text or document_content) required' }), { status: 400 });
  }

  const text = (conversation_text || '') + '\n' + (document_content || '');
  const textLower = text.toLowerCase();

  // OFAC and sanctions list (simplified demo)
  const restrictedRegions = ['iran', 'syria', 'north korea', 'cuba', 'crimea'];
  const sanctionedEntities = ['irgc', 'hamas', 'hezbollah', 'ofac'];
  const illegalCommodities = ['weapons', 'explosives', 'narcotics', 'biological agents'];
  const exportControls = ['encryption key', 'advanced semiconductor', 'military technology'];

  const violations = [];
  let killSwitchTriggered = false;
  let killSwitchReason = null;

  // Check for sanctioned regions
  for (const region of restrictedRegions) {
    if (textLower.includes(region)) {
      violations.push({
        type: 'sanction_violation',
        severity: 'critical',
        description: `Reference to sanctioned region: ${region}`,
        detected_content: region,
        legal_citation: 'OFAC SDN List / EU Sanctions Reg. 833/2014',
        recommendation: 'Terminate transaction immediately'
      });
      killSwitchTriggered = true;
      killSwitchReason = `Critical OFAC sanction violation detected: ${region}`;
    }
  }

  // Check for sanctioned entities
  for (const entity of sanctionedEntities) {
    if (textLower.includes(entity)) {
      violations.push({
        type: 'entity_sanction',
        severity: 'critical',
        description: `Reference to sanctioned entity: ${entity}`,
        detected_content: entity,
        legal_citation: 'OFAC Specially Designated Nationals (SDN) List',
        recommendation: 'Block transaction and file report'
      });
      killSwitchTriggered = true;
      killSwitchReason = `Sanctioned entity reference: ${entity}`;
    }
  }

  // Check for illegal commodity transport
  for (const commodity of illegalCommodities) {
    if (textLower.includes(commodity)) {
      violations.push({
        type: 'illegal_commodity',
        severity: 'critical',
        description: `Potential illegal commodity detected: ${commodity}`,
        detected_content: commodity,
        legal_citation: 'International Trade in Endangered Species (CITES) / Arms Trade Treaty',
        recommendation: 'Halt transaction immediately'
      });
      killSwitchTriggered = true;
      killSwitchReason = `Illegal commodity transport detected: ${commodity}`;
    }
  }

  // Check for export control violations
  for (const control of exportControls) {
    if (textLower.includes(control)) {
      violations.push({
        type: 'export_control_violation',
        severity: 'warning',
        description: `Potential export-controlled item: ${control}`,
        detected_content: control,
        legal_citation: 'EAR (Export Administration Regulations) / ITAR',
        recommendation: 'Verify destination country and obtain export license'
      });
    }
  }

  // Check for tariff bypass language
  if (
    textLower.includes('circumvent tariff') ||
    textLower.includes('avoid duty') ||
    textLower.includes('tariff evasion') ||
    textLower.includes('misclassify shipment')
  ) {
    violations.push({
      type: 'tariff_bypass',
      severity: 'critical',
      description: 'Conversation suggests intentional tariff avoidance or misclassification',
      detected_content: 'tariff evasion language detected',
      legal_citation: 'WCO Harmonized System / Customs Valuation Agreement',
      recommendation: 'Terminate meeting and alert compliance authorities'
    });
    killSwitchTriggered = true;
    killSwitchReason = 'Tariff evasion or customs fraud detected';
  }

  // Insert compliance logs
  const logs = [];
  for (const violation of violations) {
    const logPayload = {
      room_id,
      violation_type: violation.type,
      severity: violation.severity,
      description: violation.description,
      detected_content: violation.detected_content,
      legal_citation: violation.legal_citation,
      ai_recommendation: violation.recommendation,
      is_resolved: false,
      created_at: new Date().toISOString()
    };

    const logResp = await fetch(`${supabaseUrl}/rest/v1/compliance_logs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(logPayload)
    });

    const logData = await logResp.json();
    if (logResp.ok) {
      logs.push(Array.isArray(logData) ? logData[0] : logData);
    }
  }

  // Update room session if kill switch triggered
  if (killSwitchTriggered) {
    // Get the room session
    const sessionResp = await fetch(`${supabaseUrl}/rest/v1/room_sessions?room_id=eq.${room_id}&select=id`, {
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`
      }
    });

    const sessions = await sessionResp.json();
    if (Array.isArray(sessions) && sessions.length > 0) {
      const session = sessions[0];

      // Trigger kill switch
      const killPayload = {
        session_status: 'killed',
        kill_switch_triggered: true,
        kill_switch_reason: killSwitchReason,
        handshake_allowed: false,
        payment_allowed: false,
        last_ai_check: new Date().toISOString()
      };

      await fetch(`${supabaseUrl}/rest/v1/room_sessions?id=eq.${session.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`
        },
        body: JSON.stringify(killPayload)
      });
    }
  }

  return new Response(JSON.stringify({
    message: 'compliance check complete',
    violations_detected: violations.length,
    violations: violations,
    compliance_logs: logs,
    kill_switch_triggered: killSwitchTriggered,
    kill_switch_reason: killSwitchReason,
    recommendation: killSwitchTriggered ? 'MEETING TERMINATED: Critical compliance violation' : 'Conversation compliant with international trade law',
    timestamp: new Date().toISOString()
  }), { status: 200 });
}

export async function GET(_request) {
  return new Response(JSON.stringify({ standby: true, message: "hi Ayman" }), { status: 200 });
}
