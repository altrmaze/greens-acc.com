export function tradingMonitor(req, _res, next) {
  const amount = Number(req.body?.amount || 0);
  const tradeVelocity = Number(req.header('x-trade-velocity') || req.body?.trade_velocity || 0);

  if (tradeVelocity > 100 || amount > 500000) {
    req.security.flags.push('anomalous-trade-pattern');
  }

  next();
}
