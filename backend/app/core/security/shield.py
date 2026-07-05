import hashlib
from dataclasses import dataclass, field


@dataclass
class SecurityWatcher:
  total_requests: int = 0
  blocked_requests: int = 0
  methods: dict = field(default_factory=dict)

  def record_request(self, path: str, method: str, client_ip: str, blocked: bool):
    self.total_requests += 1
    self.methods[method] = self.methods.get(method, 0) + 1
    if blocked:
      self.blocked_requests += 1

  def get_stats(self):
    return {
      'total_requests': self.total_requests,
      'blocked_requests': self.blocked_requests,
      'methods': self.methods,
    }


class AIShield:
  def __init__(self):
    self._attack_counters = {
      'total_blocked': 0,
      'inject': 0,
      'drop table': 0,
      'reverse_shell': 0,
      'rm -rf': 0,
      'alter_db': 0,
    }
    self._comparator_tokens = {}

  def add_comparator_token(self, user_id: str, token: str):
    self._comparator_tokens[user_id] = self._hash(token)

  def comparator_verify(self, user_id: str, token: str) -> bool:
    expected = self._comparator_tokens.get(user_id)
    if expected is None:
      return False
    return expected == self._hash(token)

  def inspect_payload(self, payload: str):
    dangerous_patterns = ['rm -rf', 'drop table', 'inject', 'reverse_shell', 'alter_db']
    normalized = (payload or '').lower()
    for pattern in dangerous_patterns:
      if pattern in normalized:
        self._attack_counters['total_blocked'] += 1
        self._attack_counters[pattern] = self._attack_counters.get(pattern, 0) + 1
        return False, pattern
    return True, None

  def get_attack_counters(self):
    return self._attack_counters

  @staticmethod
  def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
