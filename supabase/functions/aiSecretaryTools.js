export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { action, document_text, query, currency_pair } = body || {};

  if (!action) {
    return new Response(JSON.stringify({ error: 'action required (summarize, parse, calculate)' }), { status: 400 });
  }

  let result = {};

  if (action === 'summarize') {
    if (!document_text) {
      return new Response(JSON.stringify({ error: 'document_text required for summarize' }), { status: 400 });
    }
    // Mock AI summarization - in production, call OpenAI, Claude, or internal LLM
    const lines = document_text.split('\n').filter(l => l.trim());
    const summary = {
      word_count: document_text.split(/\s+/).length,
      section_count: lines.filter(l => l.match(/^#+\s/)).length,
      key_points: [
        'First major point from document',
        'Second critical item identified',
        'Final key takeaway for executives'
      ],
      executive_summary: `This document contains ${lines.length} sections with key focus on compliance, financial terms, and operational logistics.`,
      reading_time_minutes: Math.ceil(document_text.split(/\s+/).length / 200)
    };
    result = summary;
  } else if (action === 'parse') {
    if (!document_text || !query) {
      return new Response(JSON.stringify({ error: 'document_text and query required for parse' }), { status: 400 });
    }
    // Mock clause extraction and weakness detection
    const result_obj = {
      query: query,
      matching_clauses: [
        { clause_number: 3.2, text: 'Matching clause relevant to query', confidence: 0.89 },
        { clause_number: 5.1, text: 'Secondary related clause', confidence: 0.75 }
      ],
      potential_weaknesses: [
        { issue: 'Ambiguous liability language', clause: 3.2, recommendation: 'Clarify jurisdiction and liability caps' },
        { issue: 'Missing force majeure provision', clause: 'N/A', recommendation: 'Add comprehensive force majeure clause' }
      ],
      risk_level: 'medium',
      recommended_edits: 2
    };
    result = result_obj;
  } else if (action === 'calculate') {
    if (!currency_pair) {
      return new Response(JSON.stringify({ error: 'currency_pair required for calculate (e.g., "USD/EUR")' }), { status: 400 });
    }
    // Mock tariff and currency calculation
    const [from, to] = currency_pair.split('/');
    const calc = {
      currency_pair: currency_pair,
      exchange_rate: (Math.random() * 0.5 + 1).toFixed(4), // Mock rate
      tariff_estimate: {
        base_duty_percent: 12,
        regional_surcharge: 2.5,
        estimated_total_cost: '12.5% of goods value',
        notes: 'Rates vary by HS code and origin. Consult USITC for specifics.'
      },
      trade_compliance: {
        restricted_regions: ['Iran', 'Syria', 'North Korea', 'Cuba'],
        sanctions_check: 'Clear',
        export_control_review_needed: false
      },
      estimated_shipping_days: Math.floor(Math.random() * 20 + 5),
      currency_volatility: 'Moderate'
    };
    result = calc;
  } else {
    return new Response(JSON.stringify({ error: 'Unknown action. Must be: summarize, parse, or calculate' }), { status: 400 });
  }

  return new Response(JSON.stringify({
    message: `${action} complete`,
    action: action,
    result: result,
    timestamp: new Date().toISOString()
  }), { status: 200 });
}
