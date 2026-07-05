import { Router } from 'express';
import Stripe from 'stripe';

import { verifyIdentity } from '../middleware/auth.js';
import { securityWatcher } from '../middleware/securityWatcher.js';
import { shield } from '../middleware/shield.js';
import { tradingMonitor } from '../middleware/tradingMonitor.js';
import { honeypotGuard } from '../middleware/honeypot.js';
import { notify } from '../middleware/notifier.js';
import { resolvePaymentDecision } from '../models/paymentDecision.js';
import { recordSecurityEvent } from '../database/auditStore.js';

const router = Router();

function getStripeClient() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error('Missing STRIPE_SECRET_KEY');
    err.status = 500;
    throw err;
  }

  return new Stripe(key);
}

router.post('/intent', verifyIdentity, securityWatcher, shield, tradingMonitor, honeypotGuard, async (req, res, next) => {
  try {
    const amount = Number(req.body.amount);
    const currency = req.body.currency || 'usd';
    const decision = resolvePaymentDecision(req.security.flags);

    if (decision.status === 'manual_review') {
      await notify('manual_review', {
        user_id: req.identity.userId,
        amount,
        flags: req.security.flags
      });

      return res.status(202).json({
        status: 'manual_review',
        reason: decision.reason
      });
    }

    if (decision.status !== 'approved') {
      await notify('blocked', {
        user_id: req.identity.userId,
        amount,
        flags: req.security.flags
      });

      return res.status(403).json({
        status: 'blocked',
        reason: decision.reason
      });
    }

    const stripe = getStripeClient();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        user_id: req.identity.userId,
        platform: 'greensacc.com'
      },
      automatic_payment_methods: { enabled: true }
    });

    await recordSecurityEvent({
      type: 'payment_approved',
      user_id: req.identity.userId,
      amount,
      currency,
      payment_intent_id: paymentIntent.id,
      flags: req.security.flags,
      at: new Date().toISOString()
    });

    await notify('approved', {
      user_id: req.identity.userId,
      payment_intent_id: paymentIntent.id,
      amount,
      currency
    });

    return res.status(200).json({
      status: 'approved',
      payment_intent_id: paymentIntent.id,
      client_secret: paymentIntent.client_secret
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
