from collections import defaultdict


class TradingMonitor:
  def __init__(self):
    self._credits = defaultdict(int)
    self._events = 0

  def provision_credits(self, user_id: str, amount: int = 1):
    self._credits[user_id] += amount
    self._events += 1

  def get_global_metrics(self):
    return {
      'events': self._events,
      'credited_accounts': len(self._credits),
      'total_credits': sum(self._credits.values()),
    }
