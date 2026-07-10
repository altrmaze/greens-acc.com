export async function POST(request) {
  // Demo AI analyze endpoint — stubbed to return immediate sample insights.
  const body = await request.json();
  const text = body?.text || '';
  const room = body?.room || 'unknown';

  // Simple heuristic insights for demo purposes
  const insights = [];
  if (text.length < 40) insights.push('Quick note: consider clarifying the key deliverable.');
  if (/price|cost|fee|commission/i.test(text)) insights.push('Finance: check commission rates and currency exposure.');
  if (/contract|lc|letter of credit/i.test(text)) insights.push('Legal: ensure LC reference and bank terms are captured in the contract.');
  if (insights.length === 0) insights.push('Strategic: consider escalation path and fallback timeline.');

  return new Response(JSON.stringify({ room, insights }), { status: 200 });
}

export async function GET(_request) {
  return new Response(JSON.stringify({ standby: true, message: "hi Ayman" }), { status: 200 });
}
