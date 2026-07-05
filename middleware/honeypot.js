import { recordSecurityEvent } from '../database/auditStore.js';

export async function honeypotGuard(req, res, next) {
  const isUnverified = !req.identity?.verified;
  const isCritical = req.security?.flags?.includes('critical-risk-score') || req.security?.flags?.includes('amount-exceeds-policy');

  if (!isUnverified && !isCritical) {
    return next();
  }

  await recordSecurityEvent({
    type: 'honeypot_redirect',
    user_id: req.identity?.userId || 'unknown',
    flags: req.security?.flags || [],
    ip: req.ip,
    at: new Date().toISOString()
  });

  return res.status(403).json({
    status: 'blocked',
    message: 'User redirected to honeypot due to trust policy',
    honeypot_path: '/api/users/honeypot'
  });
}
