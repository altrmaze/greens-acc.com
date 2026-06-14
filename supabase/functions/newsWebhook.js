export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { source, title, summary, category, severity, metadata } = body || {};

  if (!title) {
    return new Response(JSON.stringify({ error: 'title required' }), { status: 400 });
  }

  const newsPayload = { source: source || 'mock', title, summary: summary || '', category: category || 'general', severity: severity || 'low', metadata: metadata || {}, created_at: new Date().toISOString() };

  // insert into global_news
  const insertNews = await fetch(`${supabaseUrl}/rest/v1/global_news`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(newsPayload)
  });

  const newsData = await insertNews.json();
  if (!insertNews.ok) {
    return new Response(JSON.stringify({ error: 'Failed to insert news', details: newsData }), { status: insertNews.status });
  }

  const created = Array.isArray(newsData) ? newsData[0] : newsData;

  // Determine if this should raise a risk flag (simple heuristic)
  const severeKeywords = ['tariff','conflict','war','closure','blockade','devaluation','sanction','strike','supply chain','sank','sinking','canal','shortage'];
  const text = `${title} ${summary}`.toLowerCase();
  const isCritical = severeKeywords.some(k => text.includes(k)) || (severity && (severity === 'high' || severity === 'critical'));

  let flagData = null;
  if (isCritical) {
    const flagPayload = { news_id: created.id, scope: 'global', active: true, reason: title, created_at: new Date().toISOString() };
    const insertFlag = await fetch(`${supabaseUrl}/rest/v1/global_risk_flags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(flagPayload)
    });
    flagData = await insertFlag.json();
  }

  return new Response(JSON.stringify({ message: 'news ingested', news: created, flag: flagData }), { status: 200 });
}
