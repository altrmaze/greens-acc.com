import { Router } from 'express';
import { verifyIdentity } from '../middleware/auth.js';

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

export default router;
