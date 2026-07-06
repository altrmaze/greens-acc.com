const FORBIDDEN_KEYWORDS = ['fuel', 'diesel', 'gasoline', 'petroleum'];
const ALLOWED_PUBLISHER_TYPES = new Set(['Direct Seller', 'Mandate', 'Broker']);

function validateTextField(value, fieldName, minLength, maxLength) {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return `${fieldName} is required`;
  }
  if (normalized.length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  if (maxLength && normalized.length > maxLength) {
    return `${fieldName} must be at most ${maxLength} characters`;
  }
  return '';
}

function containsForbiddenCommodity(value) {
  const lowered = String(value || '').toLowerCase();
  return FORBIDDEN_KEYWORDS.find((keyword) => lowered.includes(keyword)) || '';
}

export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body?.title || '').trim();
  const description = String(body?.description || '').trim();
  const publisherCompany = String(body?.publisher_company || '').trim();
  const publisherType = String(body?.publisher_type || 'Direct Seller').trim() || 'Direct Seller';
  const buyerQualifications = String(body?.buyer_qualifications || '').trim();
  const requiredDocuments = Array.isArray(body?.required_documents)
    ? body.required_documents
      .map((item) => String(item || '').trim())
      .filter(Boolean)
    : [];
  const userId = body?.user_id ? String(body.user_id).trim() : null;

  const fieldError =
    validateTextField(title, 'title', 5, 100) ||
    validateTextField(description, 'description', 20) ||
    validateTextField(publisherCompany, 'publisher_company', 2) ||
    validateTextField(buyerQualifications, 'buyer_qualifications', 10);

  if (fieldError) {
    return new Response(JSON.stringify({ error: fieldError }), { status: 400 });
  }

  if (!ALLOWED_PUBLISHER_TYPES.has(publisherType)) {
    return new Response(JSON.stringify({ error: 'publisher_type must be Direct Seller, Mandate, or Broker' }), { status: 400 });
  }

  for (const value of [title, description, buyerQualifications]) {
    const forbidden = containsForbiddenCommodity(value);
    if (forbidden) {
      return new Response(JSON.stringify({
        error: `Security Alert: Trading of ${forbidden} commodities is strictly prohibited on Greens ACC.`,
      }), { status: 400 });
    }
  }

  const payload = {
    title,
    description,
    user_id: userId,
    seller_id: userId,
    publisher_company: publisherCompany,
    publisher_type: publisherType,
    status: 'awaiting_payment',
    payment_intent_id: null,
    is_verified: false,
    buyer_qualifications: buyerQualifications,
    required_documents: requiredDocuments,
    compliance_status: 'pending',
    last_updated: new Date().toISOString(),
  };

  const response = await fetch(`${supabaseUrl}/rest/v1/green_acc_deals`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      apikey: serviceRoleKey,
      Authorization: 'Bearer ' + serviceRoleKey,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'Failed to create deal', details: data }), { status: response.status });
  }

  const deal = Array.isArray(data) ? data[0] : data;
  return new Response(JSON.stringify({
    success: true,
    deal,
    next_step: 'Complete the $20 activation workflow before publication review.',
  }), { status: 201 });
}

export async function GET() {
  return new Response(JSON.stringify({ standby: true, workflow: 'seller_create_deal' }), { status: 200 });
}
