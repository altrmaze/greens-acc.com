const DEMO_MODE = 'sandbox';
const DEMO_GATEWAY = 'demo-payment-service';

export async function simulateSuccessfulTransaction({
  deal_id,
  payer_id,
  amount,
  currency = 'USD',
  channel = 'entry_fee'
}) {
  const normalizedAmount = Number(amount ?? 0);
  if (!deal_id || !payer_id || Number.isNaN(normalizedAmount) || normalizedAmount <= 0) {
    return {
      success: false,
      status: 'failed',
      error: 'Invalid payment payload'
    };
  }

  const nonce = Math.random().toString(36).slice(2, 10).toUpperCase();
  const timestamp = Date.now().toString(36).toUpperCase();
  const transaction_id = `txn_demo_${timestamp}_${nonce}`;
  const processed_at = new Date().toISOString();

  return {
    success: true,
    status: 'succeeded',
    mode: DEMO_MODE,
    gateway: DEMO_GATEWAY,
    transaction_id,
    processed_at,
    amount: normalizedAmount,
    currency,
    deal_id,
    payer_id,
    channel
  };
}

export async function writeAccountingLog({
  supabaseUrl,
  serviceRoleKey,
  payment,
  details = {}
}) {
  if (!supabaseUrl || !serviceRoleKey || !payment?.transaction_id) {
    return { ok: false, error: 'Missing accounting context' };
  }

  const endpoint = `${supabaseUrl}/rest/v1/payment_accounting_logs`;
  const payload = {
    deal_id: payment.deal_id,
    payer_id: payment.payer_id,
    gateway: payment.gateway,
    mode: payment.mode,
    channel: payment.channel,
    transaction_id: payment.transaction_id,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    details
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        apikey: serviceRoleKey,
        Authorization: 'Bearer ' + serviceRoleKey,
        Prefer: 'return=representation'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { ok: false, error: data?.message || data?.error || 'Accounting log write failed' };
    }

    const data = await response.json().catch(() => []);
    return { ok: true, record: data?.[0] ?? null };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
