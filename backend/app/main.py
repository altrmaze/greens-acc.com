import os

import stripe
from fastapi import FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.core.security.honeypot import GeneralBubblesHoneypot
from app.core.security.shield import AIShield, SecurityWatcher
from app.services.trading.monitor import TradingMonitor

app = FastAPI(title='Thermazi OX Enterprise Platform', version='2.0.0')

stripe.api_key = os.getenv('STRIPE_SECRET_KEY', 'sk_test_mock')
shield = AIShield()
security_watcher = SecurityWatcher()
honeypot = GeneralBubblesHoneypot()
trading_monitor = TradingMonitor()

app.add_middleware(
  CORSMiddleware,
  allow_origins=['*'],
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)


@app.middleware('http')
async def security_watcher_middleware(request: Request, call_next):
  client_ip = request.client.host if request.client else 'unknown'
  path = request.url.path

  if honeypot.is_quarantined(client_ip):
    return await honeypot.handle_decoy_routing(request)

  body = b''
  if request.method in ['POST', 'PUT', 'PATCH']:
    body = await request.body()

    async def receive():
      return {'type': 'http.request', 'body': body}

    request._receive = receive

  is_safe, threat_type = shield.inspect_payload(body.decode('utf-8', errors='ignore'))
  security_watcher.record_request(path=path, method=request.method, client_ip=client_ip, blocked=not is_safe)
  if not is_safe:
    honeypot.quarantine_host(client_ip, reason=threat_type)
    return await honeypot.handle_decoy_routing(request)

  return await call_next(request)


class AuthenticationPayload(BaseModel):
  user_id: str
  token: str


@app.post('/api/v1/auth/verify')
async def verify_authentication(payload: AuthenticationPayload):
  is_valid = shield.comparator_verify(payload.user_id, payload.token)
  if not is_valid:
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail='Invalid credentials')
  return {'status': 'authenticated', 'access': 'granted'}


@app.post('/api/v1/billing/webhook')
async def stripe_webhook(request: Request):
  payload = await request.body()
  sig_header = request.headers.get('stripe-signature')
  try:
    event = stripe.Webhook.construct_event(
      payload, sig_header, os.getenv('STRIPE_WEBHOOK_SECRET', 'whsec_mock')
    )
  except Exception as error:
    raise HTTPException(status_code=400, detail=str(error)) from error

  if event.get('type') == 'checkout.session.completed':
    session = event.get('data', {}).get('object', {})
    client_reference_id = session.get('client_reference_id')
    if client_reference_id:
      trading_monitor.provision_credits(client_reference_id)
  return {'status': 'success'}


@app.get('/api/v1/analytics/dashboard')
async def get_admin_analytics():
  return {
    'system_status': 'SECURE',
    'active_isolation_bubbles': honeypot.get_active_bubble_states(),
    'blocked_attacks_count': shield.get_attack_counters(),
    'trading_volume_24h': trading_monitor.get_global_metrics(),
    'github_sync_status': 'CONNECTED',
    'security_watcher': security_watcher.get_stats(),
  }
