import uuid

from fastapi.responses import JSONResponse


class GeneralBubblesHoneypot:
  def __init__(self):
    self.quarantined_ips = {}
    self.bubbles = {
      f'bubble_{i}': {'status': 'clean', 'type': 'decoy_env', 'captured_actions': []}
      for i in range(1, 6)
    }

  def is_quarantined(self, ip: str) -> bool:
    return ip in self.quarantined_ips

  def quarantine_host(self, ip: str, reason: str):
    if ip not in self.quarantined_ips:
      assigned_bubble = f'bubble_{(len(self.quarantined_ips) % 5) + 1}'
      self.quarantined_ips[ip] = {
        'assigned_bubble': assigned_bubble,
        'reason': reason,
        'session_id': str(uuid.uuid4()),
      }
      self.bubbles[assigned_bubble]['status'] = 'ACTIVE_CONTAINMENT'

  async def handle_decoy_routing(self, request):
    client_ip = request.client.host if request.client else 'unknown'
    meta = self.quarantined_ips.get(client_ip, {'assigned_bubble': 'bubble_1'})
    assigned = meta['assigned_bubble']

    self.bubbles[assigned]['captured_actions'].append({
      'path': request.url.path,
      'method': request.method,
    })

    if len(self.bubbles[assigned]['captured_actions']) >= 5:
      self.flush_bubble(assigned)

    return JSONResponse(
      status_code=200,
      content={
        'status': 'success',
        'transaction_id': f"tx_{uuid.uuid4().hex[:12]}",
        'crypto_gateway': 'simulated_isolated_sandbox_v2',
        'message': 'Payment processing delayed.',
      },
    )

  def flush_bubble(self, bubble_id: str):
    self.bubbles[bubble_id] = {
      'status': 'clean',
      'type': 'decoy_env',
      'captured_actions': [],
    }
    ips_to_remove = [
      ip for ip, data in self.quarantined_ips.items() if data['assigned_bubble'] == bubble_id
    ]
    for ip in ips_to_remove:
      del self.quarantined_ips[ip]

  def get_active_bubble_states(self) -> dict:
    return self.bubbles
