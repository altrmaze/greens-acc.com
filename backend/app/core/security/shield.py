import hashlib
import hmac
import re
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
    self.attack_counter = 0
    self.user_registry = {}
    self._attack_counters = {'total_blocked': 0}
    self._signatures = [
      ('drop table', re.compile(r'\bdrop\s+table\b', re.IGNORECASE)),
      ('truncate table', re.compile(r'\btruncate\s+table\b', re.IGNORECASE)),
      ('union select', re.compile(r'\bunion(?:\s+all)?\s+select\b', re.IGNORECASE)),
      ('sql comment bypass', re.compile(r"(--|#|/\*)\s*(or|and)?\s*\d+=\d+", re.IGNORECASE)),
      ('or true expression', re.compile(r"\b(or|and)\b\s+['\"]?\w+['\"]?\s*=\s*['\"]?\w+['\"]?", re.IGNORECASE)),
      ('rm -rf', re.compile(r'\brm\s+-rf\b', re.IGNORECASE)),
      ('shell chain', re.compile(r'(\|\||&&|;)\s*(curl|wget|bash|sh)\b', re.IGNORECASE)),
      ('command substitution', re.compile(r'(\$\(.+\)|`.+`)', re.IGNORECASE)),
      ('reverse shell', re.compile(r'\b(nc|netcat|bash)\b.*\b(/dev/tcp|mkfifo)\b', re.IGNORECASE)),
      ('alter db', re.compile(r'\balter\s+(table|database)\b', re.IGNORECASE)),
      ('insert/update/delete abuse', re.compile(r'\b(insert|update|delete)\b\s+\binto\b', re.IGNORECASE)),
      ('script tag', re.compile(r'<\s*script[^>]*>', re.IGNORECASE)),
      ('javascript protocol', re.compile(r'javascript\s*:', re.IGNORECASE)),
      ('../../ traversal', re.compile(r'(\.\./){2,}', re.IGNORECASE)),
      ('sensitive file access', re.compile(r'/etc/passwd|win\.ini|id_rsa', re.IGNORECASE)),
      ('ssti', re.compile(r'(\{\{.*\}\}|\$\{.*\}|<%=?\s*.*\s*%>)', re.IGNORECASE)),
    ]

  def add_comparator_token(self, user_id: str, token: str):
    if not user_id or not token:
      return
    self.user_registry[user_id] = self._hash(token)

  def comparator_verify(self, user_id: str, token: str) -> bool:
    if not user_id or not token:
      return False
    expected = self.user_registry.get(user_id)
    if not expected:
      return False
    return hmac.compare_digest(expected, self._hash(token))

  def inspect_payload(self, payload: str):
    normalized = payload if isinstance(payload, str) else ''
    for threat_name, signature in self._signatures:
      if signature.search(normalized):
        self.attack_counter += 1
        self._attack_counters['total_blocked'] = self.attack_counter
        self._attack_counters[threat_name] = self._attack_counters.get(threat_name, 0) + 1
        return False, threat_name
    return True, None

  def get_attack_counters(self):
    return dict(self._attack_counters)

  @staticmethod
  def _hash(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()
