import { Router } from 'express';
import { verifyIdentity } from '../middleware/auth.js';
import { systemComparator } from '../middleware/predictionShield.js';

const router = Router();

router.get('/profile', verifyIdentity, (req, res) => {
  res.status(200).json({
    user_id: req.identity.userId,
    identity_verified: req.identity.verified
  });
});

router.get('/honeypot', (_req, res) => {
  res.status(200).json({
    message: 'Security challenge environment active.'
  });
});

router.post('/token', (req, res) => {
  if (req.header('x-admin-token') !== process.env.ADMIN_API_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  const userId = String(req.body?.user_id || '').trim();
  const token = String(req.body?.token || '').trim();

  if (!userId || !token) {
    return res.status(400).json({ error: 'user_id and token are required' });
  }

  systemComparator.addUserToken(userId, token);
  return res.status(200).json({
    status: 'registered',
    user_id: userId
  });
});

export default router;
