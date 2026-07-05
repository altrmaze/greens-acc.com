import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import paymentsRouter from './routes/payments.js';
import usersRouter from './routes/users.js';
import adminRouter from './routes/admin.js';
import webhookRouter from './routes/webhook.js';

dotenv.config();

const app = express();

app.disable('x-powered-by');
const allowedOrigins = new Set(
  (process.env.CORS_ORIGIN || 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin && origin !== '*')
);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS origin not allowed'));
  }
}));

app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'Greens ACC platform API' });
});

// Stripe webhook must receive raw body before JSON parser.
app.use('/api/webhook', webhookRouter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

app.use('/api/payments', paymentsRouter);
app.use('/api/users', usersRouter);
app.use('/api/admin', adminRouter);

app.use((err, _req, res, _next) => {
  const status = Number(err?.status) || 500;
  res.status(status).json({ error: err?.message || 'Internal server error' });
});

export default app;
