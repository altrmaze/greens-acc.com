import express from 'express';
import Stripe from 'stripe';

import { recordSecurityEvent } from '../database/auditStore.js';

const router = express.Router();

router.post('/stripe', express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripeSecretKey || !webhookSecret) {
      return res.status(500).json({ error: 'Missing Stripe webhook secrets' });
    }

    const signature = req.header('stripe-signature');
    if (!signature) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    const stripe = new Stripe(stripeSecretKey);
    const event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);

    if (event.type === 'payment_intent.succeeded') {
      const paymentIntent = event.data.object;
      await recordSecurityEvent({
        type: 'webhook:payment_intent.succeeded',
        payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        metadata: paymentIntent.metadata,
        at: new Date().toISOString()
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return next(error);
  }
});

export default router;
