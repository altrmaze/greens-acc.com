import { Router } from 'express';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { rateLimit } from 'express-rate-limit';

const router = Router();
const adminRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many admin requests' }
});

router.get('/security-events', adminRateLimiter, async (req, res, next) => {
  try {
    if (req.header('x-admin-token') !== process.env.ADMIN_API_TOKEN) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const filePath = path.resolve(process.cwd(), 'database', 'security-events.log');
    const content = await readFile(filePath, 'utf8').catch(() => '');

    const events = content
      .split('\n')
      .filter(Boolean)
      .map((line) => JSON.parse(line));

    return res.status(200).json({ events });
  } catch (error) {
    return next(error);
  }
});

export default router;
