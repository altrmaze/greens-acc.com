export function resolvePaymentDecision(flags = []) {
  if (flags.includes('critical-risk-score') || flags.includes('amount-exceeds-policy')) {
    return { status: 'blocked', reason: 'critical policy violation' };
  }

  if (flags.includes('high-risk-score') || flags.includes('anomalous-trade-pattern')) {
    return { status: 'manual_review', reason: 'requires compliance review' };
  }

  return { status: 'approved', reason: 'risk checks passed' };
}
