// greenBubblesDefense.js
// GREEN BUBBLES AUTONOMOUS DEFENSE ORCHESTRATOR
//
// Two-path security architecture:
//   TRUSTED PATH   → normal application flow
//   SUSPICIOUS PATH → score → isolate → observe → classify →
//                     contain → learn → preserve forensics →
//                     destroy bubble → update dashboard → report
//
// Safety constraints (non-negotiable):
//   • NO autonomous fund release
//   • NO autonomous destructive production code change
//   • NO deletion of critical business data
//   • NO execution of unknown binaries on production infrastructure
//   • Every autonomous action records: what, why, signal, policy,
//     resource, success status, and reversal path

'use strict';

// ============================================================
// CAPACITY LIMITS
// ============================================================
const MAX_ACTIVE_BUBBLES         = 50;
const MAX_PENDING_ANALYSIS_JOBS  = 200;
const MAX_ARTIFACT_SIZE_BYTES    = 5 * 1024 * 1024; // 5 MB
const MAX_ANALYSIS_TIME_MS       = 30_000;
const MAX_TEMP_STORAGE_MB        = 500;

// Load-shedding thresholds (%)
const CAPACITY_WARN_PCT          = 60;
const CAPACITY_HIGH_PCT          = 80;
const CAPACITY_EMERGENCY_PCT     = 90;

// ============================================================
// RISK LEVELS — maps score → color + label
// ============================================================
function riskColor(score) {
  if (score >= 90) return 'dark_red';
  if (score >= 70) return 'red';
  if (score >= 50) return 'orange';
  if (score >= 25) return 'yellow';
  return 'green';
}

function riskLevel(score) {
  if (score >= 90) return 'critical';
  if (score >= 70) return 'severe';
  if (score >= 50) return 'high';
  if (score >= 25) return 'elevated';
  return 'low';
}

// ============================================================
// POLICY ENGINE — determines action from composite risk score
// ============================================================
function resolveAction(score) {
  if (score >= 90) return 'quarantine';
  if (score >= 70) return 'deny';
  if (score >= 50) return 'rate_limit';
  if (score >= 25) return 'challenge';
  return 'allow';
}

// ============================================================
// FIVE-MODEL DEFENSIVE ANALYSIS PIPELINE
// Each model is a deterministic engine / adapter.
// They are NOT claimed to be AI unless actual models are wired in.
// ============================================================

function runModel1_Signature(event) {
  // MODEL 1 — SIGNATURE / KNOWN INDICATOR ANALYSIS
  const indicators = [];
  let score = 0;

  const src = JSON.stringify(event).toLowerCase();

  // Known bad patterns
  const badPatterns = [
    { pattern: /sql\s+injection|union\s+select|drop\s+table/i, weight: 40, label: 'SQL_INJECTION' },
    { pattern: /<script|javascript:|onerror=/i,                weight: 35, label: 'XSS_PATTERN' },
    { pattern: /\.\.\/|etc\/passwd|etc\/shadow/i,              weight: 45, label: 'PATH_TRAVERSAL' },
    { pattern: /eval\s*\(|exec\s*\(|system\s*\(/i,             weight: 50, label: 'CODE_EXECUTION' },
    { pattern: /base64_decode|base64,/i,                       weight: 20, label: 'ENCODED_PAYLOAD' },
    { pattern: /EICAR|x5O!P%@AP/i,                             weight: 80, label: 'TEST_MALWARE_SIGNATURE' },
  ];

  for (const { pattern, weight, label } of badPatterns) {
    if (pattern.test(src)) {
      score = Math.min(100, score + weight);
      indicators.push(label);
    }
  }

  return {
    model_name: 'SignatureAnalyzer',
    model_version: '1.0.0',
    risk_score: score,
    confidence: indicators.length > 0 ? 90 : 70,
    observations: `Scanned ${src.length} bytes for known indicators`,
    indicators,
    recommended_action: resolveAction(score),
    analysis_started_at:  new Date().toISOString(),
    analysis_completed_at: new Date().toISOString(),
  };
}

function runModel2_StaticStructure(event) {
  // MODEL 2 — STATIC STRUCTURE ANALYSIS
  let score = 0;
  const observations = [];

  // Oversized payload
  const payloadSize = JSON.stringify(event).length;
  if (payloadSize > MAX_ARTIFACT_SIZE_BYTES) {
    score += 30;
    observations.push(`Oversized payload: ${payloadSize} bytes`);
  }

  // Unusually deep nesting
  function nestDepth(obj, depth = 0) {
    if (depth > 20 || typeof obj !== 'object' || obj === null) return depth;
    return Math.max(...Object.values(obj).map(v => nestDepth(v, depth + 1)));
  }
  const depth = nestDepth(event);
  if (depth > 8) {
    score += 20;
    observations.push(`Excessive nesting depth: ${depth}`);
  }

  // Suspicious field names
  const suspiciousFields = ['__proto__', 'constructor', 'prototype', 'eval'];
  const flat = JSON.stringify(event);
  for (const f of suspiciousFields) {
    if (flat.includes(`"${f}"`)) {
      score += 25;
      observations.push(`Prototype-pollution field detected: ${f}`);
    }
  }

  return {
    model_name: 'StaticStructureAnalyzer',
    model_version: '1.0.0',
    risk_score: Math.min(100, score),
    confidence: 80,
    observations: observations.join('; ') || 'Structure normal',
    indicators: observations,
    recommended_action: resolveAction(score),
    analysis_started_at:  new Date().toISOString(),
    analysis_completed_at: new Date().toISOString(),
  };
}

function runModel3_BehaviorTelemetry(event) {
  // MODEL 3 — ISOLATED BEHAVIOR TELEMETRY ANALYSIS
  // No live execution. Analyses declared intent metadata.
  let score = 0;
  const observations = [];

  const action  = String(event.action || '').toLowerCase();
  const target  = String(event.target || '').toLowerCase();
  const method  = String(event.method || '').toLowerCase();

  if (['delete', 'drop', 'truncate', 'purge'].some(k => action.includes(k))) {
    score += 35;
    observations.push(`Destructive action declared: ${action}`);
  }
  if (target.includes('admin') || target.includes('production') || target.includes('wallet')) {
    score += 25;
    observations.push(`High-value target: ${target}`);
  }
  if (method === 'delete' || method === 'put') {
    score += 10;
    observations.push(`Mutative HTTP method: ${method}`);
  }
  // Rapid repeat events (if rate hint provided)
  if (Number(event.rate_per_minute) > 300) {
    score += 30;
    observations.push(`High event rate: ${event.rate_per_minute}/min`);
  }

  return {
    model_name: 'BehaviorTelemetryAnalyzer',
    model_version: '1.0.0',
    risk_score: Math.min(100, score),
    confidence: 75,
    observations: observations.join('; ') || 'Behavior nominal',
    indicators: observations,
    recommended_action: resolveAction(score),
    analysis_started_at:  new Date().toISOString(),
    analysis_completed_at: new Date().toISOString(),
  };
}

function runModel4_NetworkMovement(event) {
  // MODEL 4 — NETWORK AND MOVEMENT-PATTERN ANALYSIS
  let score = 0;
  const observations = [];

  const userAgent = String(event.user_agent || '');
  const country   = String(event.country || '');
  const ipClass   = String(event.ip_class || '');

  // Headless / scanner user agents
  if (/HeadlessChrome|python-requests|curl\/|sqlmap|nikto|nmap/i.test(userAgent)) {
    score += 35;
    observations.push(`Automated tool user-agent: ${userAgent.slice(0, 60)}`);
  }

  // Tor / proxy indicators
  if (ipClass === 'tor' || ipClass === 'proxy' || ipClass === 'vpn_datacenter') {
    score += 20;
    observations.push(`Anonymizing network class: ${ipClass}`);
  }

  // Geographic hop anomaly (indicative only — not definitive proof)
  if (event.geo_hop_count && Number(event.geo_hop_count) > 5) {
    score += 15;
    observations.push(`High geographic hop count: ${event.geo_hop_count}`);
  }

  return {
    model_name: 'NetworkMovementAnalyzer',
    model_version: '1.0.0',
    risk_score: Math.min(100, score),
    confidence: 65,
    observations: observations.join('; ') || 'Network pattern normal',
    indicators: observations,
    recommended_action: resolveAction(score),
    analysis_started_at:  new Date().toISOString(),
    analysis_completed_at: new Date().toISOString(),
  };
}

function runModel5_TrustContext(event) {
  // MODEL 5 — TRUST / CONTEXT / CORRELATION ANALYSIS
  let score = 0;
  const observations = [];

  // Unauthenticated access to sensitive endpoints
  if (!event.authenticated && event.sensitive_endpoint) {
    score += 40;
    observations.push('Unauthenticated request to sensitive endpoint');
  }
  // Repeated auth failures
  if (Number(event.auth_failures_last_hour) > 5) {
    score += 30;
    observations.push(`Repeated auth failures: ${event.auth_failures_last_hour} in last hour`);
  }
  // Token age anomaly
  if (event.token_age_days && Number(event.token_age_days) > 365) {
    score += 15;
    observations.push(`Stale token: ${event.token_age_days} days old`);
  }
  // First-time source + high-value target
  if (event.first_seen_source && event.high_value_target) {
    score += 20;
    observations.push('First-seen source targeting high-value resource');
  }

  return {
    model_name: 'TrustContextAnalyzer',
    model_version: '1.0.0',
    risk_score: Math.min(100, score),
    confidence: 85,
    observations: observations.join('; ') || 'Trust context normal',
    indicators: observations,
    recommended_action: resolveAction(score),
    analysis_started_at:  new Date().toISOString(),
    analysis_completed_at: new Date().toISOString(),
  };
}

// ============================================================
// TRUST ORCHESTRATOR — combines 5 model outputs
// Preserves disagreement rather than hiding it.
// ============================================================
function orchestrateModels(modelResults) {
  const scores     = modelResults.map(m => m.risk_score);
  const maxScore   = Math.max(...scores);
  const avgScore   = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  // Composite: weighted toward the highest (adversarial worst-case)
  const composite  = Math.round(maxScore * 0.6 + avgScore * 0.4);

  // Disagreement = std deviation > 20 points
  const mean = avgScore;
  const variance = scores.reduce((acc, s) => acc + (s - mean) ** 2, 0) / scores.length;
  const modelAgreement = Math.sqrt(variance) <= 20;

  const allIndicators = modelResults.flatMap(m => m.indicators);

  return {
    composite_risk:  composite,
    max_risk:        maxScore,
    avg_risk:        avgScore,
    model_agreement: modelAgreement,
    risk_color:      riskColor(composite),
    risk_level:      riskLevel(composite),
    final_action:    resolveAction(composite),
    all_indicators:  [...new Set(allIndicators)],
  };
}

// ============================================================
// FINGERPRINT — deterministic, not based on IP alone
// ============================================================
function buildFingerprint(event) {
  const parts = [
    event.event_type   || 'unknown',
    event.target       || 'unknown',
    event.action       || 'unknown',
    String(event.payload_size || 0),
    event.ip_class     || 'unknown',
  ];
  // Simple deterministic hash (not cryptographic — for correlation only)
  let h = 5381;
  for (const c of parts.join('|')) {
    h = ((h << 5) + h) ^ c.charCodeAt(0);
    h = h >>> 0;
  }
  return `gb-fp-${h.toString(16).padStart(8, '0')}`;
}

// ============================================================
// HELPERS — DB
// ============================================================
function makeDbHelpers(supabaseUrl, serviceRoleKey) {
  const h = {
    apikey:         serviceRoleKey,
    Authorization:  'Bearer ' + serviceRoleKey,
    'Content-Type': 'application/json',
    Prefer:         'return=representation',
  };

  async function dbPost(path, body) {
    const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      method: 'POST', headers: h, body: JSON.stringify(body),
    });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  }

  async function dbPatch(path, body) {
    const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      method: 'PATCH', headers: h, body: JSON.stringify(body),
    });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  }

  async function dbGet(path) {
    const r = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      method: 'GET', headers: h,
    });
    return { ok: r.ok, data: await r.json().catch(() => []) };
  }

  async function rpc(fn, args) {
    const r = await fetch(`${supabaseUrl}/rest/v1/rpc/${fn}`, {
      method: 'POST', headers: h, body: JSON.stringify(args),
    });
    return { ok: r.ok, data: await r.json().catch(() => null) };
  }

  return { dbPost, dbPatch, dbGet, rpc };
}

// ============================================================
// MAIN HANDLER
// ============================================================
export async function POST(request) {
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server configuration error' }, 500);
  }

  const { dbPost, dbPatch, dbGet, rpc } = makeDbHelpers(supabaseUrl, serviceRoleKey);

  const body = await request.json().catch(() => ({}));
  const { action } = body;

  // ── Capacity guard ────────────────────────────────────────────
  const capRes = await dbGet(
    'security_capacity?order=last_updated_at.desc&limit=1'
  );
  const cap = Array.isArray(capRes.data) && capRes.data[0]
    ? capRes.data[0]
    : { active_bubbles: 0, analysis_capacity_percent: 0, load_shedding_active: false };

  const capacityPct = cap.analysis_capacity_percent ?? 0;

  // ── Action routing ────────────────────────────────────────────
  switch (action) {

    // ── CLASSIFY ──────────────────────────────────────────────────
    case 'classify': {
      const event = body.event || {};

      // Overload: emergency load shedding
      if (capacityPct >= CAPACITY_EMERGENCY_PCT) {
        const preScore = event.pre_score ?? 0;
        if (preScore < 50) {
          return json({
            path: 'load_shed',
            action: 'rate_limit',
            reason: 'EMERGENCY_CAPACITY_EXCEEDED',
            composite_risk: preScore,
          });
        }
      }

      // Run all five models
      const modelResults = [
        runModel1_Signature(event),
        runModel2_StaticStructure(event),
        runModel3_BehaviorTelemetry(event),
        runModel4_NetworkMovement(event),
        runModel5_TrustContext(event),
      ];

      const orchestration = orchestrateModels(modelResults);
      const fingerprint   = buildFingerprint(event);
      const bubbleId      = `bubble-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const path          = orchestration.composite_risk >= 25 ? 'suspicious' : 'trusted';

      // Persist threat profile via RPC (upsert)
      let profileId = null;
      try {
        const profileRes = await rpc('upsert_threat_profile', {
          p_fingerprint:        fingerprint,
          p_artifact_hash:      event.artifact_hash ?? null,
          p_classification:     orchestration.composite_risk >= 90 ? 'critical'
                                : orchestration.composite_risk >= 70 ? 'malicious'
                                : orchestration.composite_risk >= 50 ? 'suspicious'
                                : 'unknown',
          p_risk_score:         orchestration.composite_risk,
          p_risk_level:         orchestration.risk_level,
          p_behavior_summary:   orchestration.all_indicators.join(', ') || null,
          p_indicators:         JSON.stringify(orchestration.all_indicators),
          p_recommended_action: orchestration.final_action,
        });
        profileId = profileRes.data;
      } catch (_) { /* non-fatal — forensics degrade gracefully */ }

      // Persist security decision
      const decisionRes = await dbPost('security_decisions', {
        event_source:     event.source       || 'unknown',
        event_type:       event.event_type   || 'unknown',
        fingerprint,
        threat_profile_id: profileId || null,
        path,
        composite_risk:   orchestration.composite_risk,
        risk_color:       orchestration.risk_color,
        final_action:     orchestration.final_action,
        model_agreement:  orchestration.model_agreement,
        bubble_id:        path === 'suspicious' ? bubbleId : null,
        request_metadata: {
          user_agent:    event.user_agent    || null,
          ip_class:      event.ip_class      || null,
          event_type:    event.event_type    || null,
          payload_size:  event.payload_size  || 0,
        },
      });
      const decisionId = Array.isArray(decisionRes.data)
        ? decisionRes.data[0]?.id
        : decisionRes.data?.id;

      // For suspicious path: persist per-model analysis run records
      if (path === 'suspicious' && decisionId) {
        const analysisTypes = [
          'signature', 'static_structure', 'behavior_telemetry',
          'network_movement', 'trust_context',
        ];
        for (let i = 0; i < modelResults.length; i++) {
          const m = modelResults[i];
          await dbPost('analysis_runs', {
            bubble_id:         bubbleId,
            threat_profile_id: profileId || null,
            analysis_type:     analysisTypes[i],
            model_name:        m.model_name,
            model_version:     m.model_version,
            status:            'completed',
            risk_score:        m.risk_score,
            confidence:        m.confidence,
            started_at:        m.analysis_started_at,
            completed_at:      m.analysis_completed_at,
            metadata: {
              observations:      m.observations,
              indicators:        m.indicators,
              recommended_action: m.recommended_action,
            },
          });
        }

        // Containment action record
        if (orchestration.final_action !== 'allow') {
          await dbPost('containment_actions', {
            security_decision_id: decisionId,
            action_type:          orchestration.final_action,
            status:               'active',
            scope:                'request',
            reason:               `Composite risk ${orchestration.composite_risk}/100 — ${orchestration.all_indicators.slice(0, 3).join(', ')}`,
            automatic:            true,
            trigger_signal:       orchestration.all_indicators[0] || 'composite_score',
            policy_name:          'default_autonomous_response_policy',
            resource_affected:    event.target || 'unknown',
            reversal_path:        'Admin review via /admin → Security Decisions',
          });
        }

        // Mark bubble as destroyed (analysis complete, env disposable)
        await dbPatch(
          `security_decisions?id=eq.${decisionId}`,
          { bubble_destroyed: true }
        );
      }

      return json({
        path,
        composite_risk:  orchestration.composite_risk,
        risk_color:      orchestration.risk_color,
        risk_level:      orchestration.risk_level,
        final_action:    orchestration.final_action,
        model_agreement: orchestration.model_agreement,
        fingerprint,
        indicators:      orchestration.all_indicators,
        model_scores:    modelResults.map(m => ({
          model:       m.model_name,
          risk_score:  m.risk_score,
          confidence:  m.confidence,
        })),
        bubble_id:  path === 'suspicious' ? bubbleId : null,
        decision_id: decisionId || null,
      });
    }

    // ── CONTAINMENT ACTION ────────────────────────────────────────
    case 'contain': {
      const { decision_id, action_type, reason, automatic = true } = body;

      // Safety: block irreversible / high-value operations from automation
      const BLOCKED_AUTONOMOUS = [
        'delete_production_data',
        'release_funds',
        'rotate_critical_credentials',
        'execute_binary',
      ];
      if (BLOCKED_AUTONOMOUS.includes(action_type)) {
        return json({
          error: 'BLOCKED_AUTONOMOUS_ACTION',
          message: 'This action requires separate authorized and tested human control path.',
        }, 403);
      }

      const res = await dbPost('containment_actions', {
        security_decision_id: decision_id || 'manual',
        action_type,
        status:               'active',
        scope:                body.scope || 'request',
        reason:               reason     || 'Manual containment',
        automatic,
        trigger_signal:       body.trigger_signal || 'manual_admin',
        policy_name:          body.policy_name    || 'manual',
        resource_affected:    body.resource       || 'unknown',
        reversal_path:        body.reversal_path  || 'Admin review via /admin',
      });
      return json({ ok: res.ok, action_type, data: res.data });
    }

    // ── CAPACITY UPDATE ───────────────────────────────────────────
    case 'update_capacity': {
      const c = body.capacity || {};
      const capacityPctNow = c.analysis_capacity_percent ?? 0;
      const res = await dbPost('security_capacity', {
        active_bubbles:             c.active_bubbles              ?? 0,
        queued_jobs:                c.queued_jobs                 ?? 0,
        rejected_jobs:              c.rejected_jobs               ?? 0,
        analysis_capacity_percent:  capacityPctNow,
        gateway_load_percent:       c.gateway_load_percent        ?? 0,
        quarantine_storage_percent: c.quarantine_storage_percent  ?? 0,
        events_per_minute:          c.events_per_minute           ?? 0,
        requests_per_minute:        c.requests_per_minute         ?? 0,
        load_shedding_active:       capacityPctNow >= CAPACITY_EMERGENCY_PCT,
        circuit_breaker_open:       capacityPctNow >= 100,
        last_updated_at:            new Date().toISOString(),
      });
      return json({ ok: res.ok, load_shedding: capacityPctNow >= CAPACITY_EMERGENCY_PCT });
    }

    // ── GENERATE DAILY REPORT ─────────────────────────────────────
    case 'generate_report': {
      const tz   = body.timezone || 'UTC';
      const date = new Date().toISOString().slice(0, 10);

      // Aggregate today's decisions
      const decisionsRes = await dbGet(
        `security_decisions?created_at=gte.${date}T00:00:00Z&order=created_at.desc&limit=1000`
      );
      const decisions = Array.isArray(decisionsRes.data) ? decisionsRes.data : [];

      const stats = {
        total_requests:         decisions.length,
        allowed_requests:       decisions.filter(d => d.final_action === 'allow').length,
        challenged_requests:    decisions.filter(d => d.final_action === 'challenge').length,
        denied_requests:        decisions.filter(d => ['deny', 'quarantine'].includes(d.final_action)).length,
        quarantined_objects:    decisions.filter(d => d.final_action === 'quarantine').length,
        threats_detected:       decisions.filter(d => d.path === 'suspicious').length,
        critical_events:        decisions.filter(d => d.risk_color === 'dark_red').length,
        high_events:            decisions.filter(d => d.risk_color === 'red').length,
        medium_events:          decisions.filter(d => d.risk_color === 'orange').length,
        low_events:             decisions.filter(d => ['yellow', 'green'].includes(d.risk_color)).length,
        bubbles_created:        decisions.filter(d => d.bubble_id).length,
        bubbles_destroyed:      decisions.filter(d => d.bubble_destroyed).length,
        transactions_held:      decisions.filter(d => d.final_action === 'hold_transaction').length,
        peak_capacity_percent:  cap.analysis_capacity_percent ?? 0,
      };

      // Fetch unique threat profiles seen today
      const profilesRes = await dbGet(
        `threat_profiles?last_seen_at=gte.${date}T00:00:00Z&select=id`
      );
      stats.unique_threat_profiles = Array.isArray(profilesRes.data)
        ? profilesRes.data.length : 0;

      const recommendations = [];
      if (stats.critical_events > 0)
        recommendations.push('Review critical threat profiles and verify containment.');
      if (stats.bubbles_created > MAX_ACTIVE_BUBBLES * 0.8)
        recommendations.push('Consider raising MAX_ACTIVE_BUBBLES or reviewing load-shedding thresholds.');
      if (stats.denied_requests > stats.total_requests * 0.1)
        recommendations.push('High denial rate — review classification thresholds for false-positive risk.');

      const summary =
        `${date}: ${stats.threats_detected} threats detected across ${stats.total_requests} events. ` +
        `${stats.critical_events} critical, ${stats.quarantined_objects} quarantined, ` +
        `${stats.bubbles_destroyed} bubbles destroyed.`;

      const reportRes = await dbPost('daily_security_reports', {
        report_date:    date,
        timezone:       tz,
        ...stats,
        summary,
        recommendations,
        generated_at:   new Date().toISOString(),
      });

      return json({ ok: reportRes.ok, report_date: date, stats, summary });
    }

    default:
      return json({ error: 'Unknown action', valid_actions: [
        'classify', 'contain', 'update_capacity', 'generate_report',
      ] }, 400);
  }
}

export async function GET(request) {
  const supabaseUrl    = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: 'Server configuration error' }, 500);
  }

  const { dbGet } = makeDbHelpers(supabaseUrl, serviceRoleKey);
  const url       = new URL(request.url);
  const endpoint  = url.searchParams.get('endpoint') || 'status';

  switch (endpoint) {

    case 'status': {
      const [capRes, decRes] = await Promise.all([
        dbGet('security_capacity?order=last_updated_at.desc&limit=1'),
        dbGet('security_decisions?order=created_at.desc&limit=200'),
      ]);
      const cap       = Array.isArray(capRes.data) && capRes.data[0] ? capRes.data[0] : {};
      const decisions = Array.isArray(decRes.data) ? decRes.data : [];
      const today     = new Date().toISOString().slice(0, 10);
      const todayDec  = decisions.filter(d => d.created_at?.startsWith(today));

      return json({
        capacity: cap,
        today: {
          total:       todayDec.length,
          threats:     todayDec.filter(d => d.path === 'suspicious').length,
          critical:    todayDec.filter(d => d.risk_color === 'dark_red').length,
          quarantined: todayDec.filter(d => d.final_action === 'quarantine').length,
          denied:      todayDec.filter(d => d.final_action === 'deny').length,
          blocked:     todayDec.filter(d => ['deny','quarantine'].includes(d.final_action)).length,
        },
        system_health: cap.load_shedding_active ? 'DEGRADED' : 'NOMINAL',
      });
    }

    case 'threats': {
      const res = await dbGet(
        'threat_profiles?order=last_seen_at.desc&limit=50'
      );
      return json({ threats: res.data || [] });
    }

    case 'timeline': {
      const res = await dbGet(
        'security_decisions?order=created_at.desc&limit=100'
      );
      return json({ timeline: res.data || [] });
    }

    case 'report': {
      const today = new Date().toISOString().slice(0, 10);
      const res   = await dbGet(
        `daily_security_reports?report_date=eq.${today}&limit=1`
      );
      const report = Array.isArray(res.data) && res.data[0] ? res.data[0] : null;
      return json({ report, report_date: today });
    }

    case 'capacity': {
      const res = await dbGet(
        'security_capacity?order=last_updated_at.desc&limit=24'
      );
      return json({ history: res.data || [] });
    }

    default:
      return json({ error: 'Unknown endpoint' }, 400);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
