export function securityWatcher(req, _res, next) {
  const scoreHeader = req.header('x-risk-score');
  const scoreBody = Number(req.body?.risk_score);
  const riskScore = Number.isFinite(Number(scoreHeader))
    ? Number(scoreHeader)
    : Number.isFinite(scoreBody)
      ? scoreBody
      : 0;

  req.security = {
    riskScore,
    flags: []
  };

  if (riskScore >= 90) req.security.flags.push('critical-risk-score');
  else if (riskScore >= 70) req.security.flags.push('high-risk-score');

  next();
}
