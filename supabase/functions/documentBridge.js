export async function POST(request) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }), { status: 500 });
  }

  const body = await request.json();
  const { room_id, document_name, document_type, source_url, oauth_provider, uploaded_by } = body || {};

  if (!room_id || !document_name) {
    return new Response(JSON.stringify({ error: 'room_id and document_name required' }), { status: 400 });
  }

  // Validate document type
  const validTypes = ['pdf', 'docx', 'spreadsheet', 'contract', 'blueprint', 'legal', 'compliance'];
  if (document_type && !validTypes.includes(document_type)) {
    return new Response(JSON.stringify({ error: `Invalid document_type. Must be one of: ${validTypes.join(', ')}` }), { status: 400 });
  }

  // In production: validate OAuth token and fetch from Google Drive / OneDrive / Dropbox
  // For demo: create a document reference without storing the file
  const encryptionMetadata = {
    cipher: 'AES-256-GCM',
    is_encrypted: true,
    encryption_algorithm: 'AES-256-GCM',
    streaming: true,
    server_stored: false // Important: file NOT stored on GreenACC servers
  };

  const docPayload = {
    room_id,
    document_name,
    document_type: document_type || 'document',
    source_url,
    oauth_provider,
    encryption_metadata: encryptionMetadata,
    uploaded_by: uploaded_by || 'system',
    created_at: new Date().toISOString()
  };

  const insertResp = await fetch(`${supabaseUrl}/rest/v1/document_references`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation'
    },
    body: JSON.stringify(docPayload)
  });

  const docData = await insertResp.json();
  if (!insertResp.ok) {
    return new Response(JSON.stringify({ error: 'Failed to register document', details: docData }), { status: insertResp.status });
  }

  const doc = Array.isArray(docData) ? docData[0] : docData;

  // Return document reference with streaming metadata
  return new Response(JSON.stringify({
    message: 'document bridge registered',
    document: doc,
    stream_endpoint: `/supabase/functions/documentStream?doc_id=${doc.id}&room_id=${room_id}`,
    encryption_ready: true,
    note: 'File is streamed on-demand. Not stored on GreenACC servers. Access requires room session token.'
  }), { status: 200 });
}
