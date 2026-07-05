import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

export const ROUTE_TO_PRODUCTION = 'ROUTE_TO_PRODUCTION';
export const ROUTE_TO_HONEYPOT = 'ROUTE_TO_HONEYPOT';

export class SystemComparator {
  constructor() {
    this.verifiedTokens = new Map();
  }

  generateSecureHash(data) {
    return createHash('sha256').update(String(data)).digest('hex');
  }

  addUserToken(userId, token) {
    this.verifiedTokens.set(String(userId), this.generateSecureHash(token));
  }

  verifyAndRouteUser(userId, inputToken) {
    const storedHash = this.verifiedTokens.get(String(userId));
    if (!storedHash) return ROUTE_TO_HONEYPOT;
    if (!inputToken) return ROUTE_TO_HONEYPOT;

    const inputHash = this.generateSecureHash(inputToken);
    const a = Buffer.from(storedHash, 'utf8');
    const b = Buffer.from(inputHash, 'utf8');
    if (a.length !== b.length) return ROUTE_TO_HONEYPOT;

    return timingSafeEqual(a, b) ? ROUTE_TO_PRODUCTION : ROUTE_TO_HONEYPOT;
  }
}

export class IronDomeShield {
  constructor() {
    this.bubbles = {
      bubble_1: { status: 'active', isolated: true, type: 'perfumes_decoy' },
      bubble_2: { status: 'active', isolated: true, type: 'cosmetics_decoy' },
      bubble_3: { status: 'active', isolated: true, type: 'b2b_trade_mock' },
      bubble_4: { status: 'active', isolated: true, type: 'payment_gate_mock' },
      bubble_5: { status: 'active', isolated: true, type: 'accounting_preview' }
    };
    this.coreSystemSecure = true;
  }

  assignBubbleForUser(seed = 'anonymous') {
    const hash = this.generateSeedHash(seed);
    const bubbleIds = Object.keys(this.bubbles);
    const index = parseInt(hash.slice(0, 8), 16) % bubbleIds.length;
    return bubbleIds[index];
  }

  inspectBubbleBehavior(bubbleId, executionLog = '') {
    const bubble = this.bubbles[bubbleId];
    if (!bubble) return false;

    const dangerousPatterns = [
      'rm -rf',
      'drop table',
      'inject',
      'reverse_shell',
      'alter_db',
      'truncate',
      'delete from',
      'union select'
    ];

    const lowerLog = String(executionLog).toLowerCase();
    const match = dangerousPatterns.find((pattern) => lowerLog.includes(pattern));
    if (!match) return true;

    bubble.status = 'quarantined';
    bubble.last_incident = {
      incident_id: randomUUID(),
      detected_pattern: match,
      timestamp: new Date().toISOString()
    };
    this.coreSystemSecure = true;
    return false;
  }

  generateSeedHash(seed) {
    return createHash('sha256').update(String(seed)).digest('hex');
  }
}

export const systemComparator = new SystemComparator();
export const ironDomeShield = new IronDomeShield();
