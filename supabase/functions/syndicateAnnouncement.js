export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { announcement_id, deal_id, press_release, social_posts } = body || {};

  if (!announcement_id || !press_release) {
    return new Response(JSON.stringify({ error: 'announcement_id and press_release required' }), { status: 400 });
  }

  // Mock syndication endpoints
  const syndication_targets = [
    { name: 'TechCrunch', endpoint: 'https://api.mock-techcrunch.io/press', method: 'POST' },
    { name: 'Bloomberg', endpoint: 'https://api.mock-bloomberg.io/news', method: 'POST' },
    { name: 'Reuters', endpoint: 'https://api.mock-reuters.io/feed', method: 'POST' },
    { name: 'LinkedIn Feed', endpoint: 'https://api.mock-linkedin.com/posts', method: 'POST' },
    { name: 'X (Twitter)', endpoint: 'https://api.mock-twitter.com/tweets', method: 'POST' }
  ];

  const syndication_metadata = {};
  let published_count = 0;
  let failed_count = 0;

  for (const target of syndication_targets) {
    try {
      const payload = {
        title: `${press_release.split('\n')[2]}`, // extract title
        content: press_release,
        source: 'Greens ACC',
        timestamp: new Date().toISOString()
      };

      // Mock API call (would be real API call in production)
      const mockResp = await simulateSyndicationCall(target.name, payload);
      
      if (mockResp.success) {
        syndication_metadata[target.name] = { status: 'published', url: mockResp.url, timestamp: new Date().toISOString() };
        published_count++;
      } else {
        syndication_metadata[target.name] = { status: 'failed', reason: mockResp.reason };
        failed_count++;
      }
    } catch (err) {
      syndication_metadata[target.name] = { status: 'error', reason: err.message };
      failed_count++;
    }
  }

  // Update announcement with syndication results
  const updatePayload = {
    syndication_status: published_count > 0 ? 'published' : 'failed',
    syndication_metadata: syndication_metadata,
    published_at: new Date().toISOString()
  };

  const updateResp = await fetch(`${supabaseUrl}/rest/v1/deal_announcements?id=eq.${announcement_id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(updatePayload)
  });

  const updated = await updateResp.json();
  if (!updateResp.ok) {
    return new Response(JSON.stringify({ error: 'Failed to update announcement', details: updated }), { status: updateResp.status });
  }

  return new Response(JSON.stringify({ 
    message: 'syndication complete', 
    published: published_count, 
    failed: failed_count,
    announcement: Array.isArray(updated) ? updated[0] : updated 
  }), { status: 200 });
}

// Mock syndication function (in production, make real API calls with auth)
async function simulateSyndicationCall(targetName, payload) {
  // Simulate random success/partial success
  const random = Math.random();
  
  if (targetName === 'LinkedIn Feed' || targetName === 'X (Twitter)' || targetName === 'Reuters') {
    // Most likely to succeed (80%)
    return random < 0.8 ? { success: true, url: `https://mock-${targetName.toLowerCase().replace(/\s+/g, '-')}.io/${Math.random().toString(36).substr(2, 9)}` } : { success: false, reason: 'Rate limit exceeded' };
  } else {
    // Medium success (60%)
    return random < 0.6 ? { success: true, url: `https://mock-${targetName.toLowerCase().replace(/\s+/g, '-')}.io/${Math.random().toString(36).substr(2, 9)}` } : { success: false, reason: 'Editorial review pending' };
  }
}
