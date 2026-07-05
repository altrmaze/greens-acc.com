import { recordSecurityEvent } from '../database/auditStore.js';
import { ironDomeShield, ROUTE_TO_HONEYPOT, systemComparator } from './predictionShield.js';

export async function honeypotGuard(req, res, next) {
  const isUnverified = !req.identity?.verified;
  const isCritical = req.security?.flags?.includes('critical-risk-score') || req.security?.flags?.includes('amount-exceeds-policy');
  const userId = req.identity?.userId || 'unknown';
  const tokenInput = req.header('x-user-token') || req.body?.input_token || req.body?.user_token || '';
  const comparatorRoute = systemComparator.verifyAndRouteUser(userId, tokenInput);
  const bubbleId = ironDomeShield.assignBubbleForUser(userId);
  const bubbleSafe = ironDomeShield.inspectBubbleBehavior(
    bubbleId,
    req.body?.execution_log || req.header('x-execution-log') || ''
  );
  const shouldRouteToHoneypot = isUnverified || isCritical || comparatorRoute === ROUTE_TO_HONEYPOT || !bubbleSafe;

  if (!shouldRouteToHoneypot) {
    return next();
  }

  await recordSecurityEvent({
    type: 'honeypot_redirect',
    user_id: userId,
    flags: req.security?.flags || [],
    comparator_route: comparatorRoute,
    bubble_id: bubbleId,
    bubble_safe: bubbleSafe,
    ip: req.ip,
    at: new Date().toISOString()
  });

  return res.status(403).json({
    status: 'blocked',
    message: 'User redirected to honeypot due to trust policy',
    honeypot_path: '/api/users/honeypot',
    bubble_id: bubbleId
  });
}
