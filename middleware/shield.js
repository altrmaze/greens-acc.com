export function shield(req, _res, next) {
  const amount = Number(req.body?.amount || 0);

  if (!Number.isFinite(amount) || amount <= 0) {
    const error = new Error('Invalid payment amount');
    error.status = 400;
    throw error;
  }

  if (amount > 1000000) {
    req.security.flags.push('amount-exceeds-policy');
  }

  next();
}
