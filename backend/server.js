/**
 * @context For GitHub Copilot:
 * This is the main server for Greens ACC. It initializes Supabase using system environment
 * variables (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
 * Ensure all generated code integrates cleanly with this architecture without placeholders.
 *
 * Routes:
 *   GET  /api/supabase-config          → { url, anonKey }
 *   GET  /api/system-status            → { status, supabase_configured }
 *   POST /supabase/functions/:name     → proxy to Supabase edge function
 *   *                                  → static files from dist/
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { createServer } from 'http';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR  = path.join(__dirname, '..', 'dist');

// ── Environment variables ────────────────────────────────────────────────────
const SUPABASE_URL      = (process.env.SUPABASE_URL      || '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY  || '';
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

// ── Supabase client (service-role, server-side only) ─────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// ── Express app ──────────────────────────────────────────────────────────────
const app = express();
app.use(express.json());

// CORS middleware
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, apikey');
  next();
});

app.options('*', (_req, res) => res.sendStatus(204));

// ── API routes ───────────────────────────────────────────────────────────────
app.get('/api/supabase-config', (_req, res) => {
  res.json({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY });
});

app.get('/api/system-status', (_req, res) => {
  res.json({ status: 'ok', supabase_configured: !!supabase });
});

// ── Supabase edge function proxy ─────────────────────────────────────────────
app.post('/supabase/functions/:name', async (req, res) => {
  const target = `${SUPABASE_URL}/functions/v1/${req.params.name}`;
  try {
    const upstream = await fetch(target, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization: 'Bearer ' + SERVICE_ROLE_KEY,
        apikey:        SERVICE_ROLE_KEY,
      },
      body: JSON.stringify(req.body),
    });
    const data = await upstream.text();
    res.status(upstream.status).type('application/json').send(data);
  } catch (err) {
    res.status(502).json({ error: 'Bad Gateway', message: err.message });
  }
});

// ── Static files (dist/) ─────────────────────────────────────────────────────
app.use(express.static(DIST_DIR));

// ── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
createServer(app).listen(PORT, () => {
  console.log(`✅ Greens ACC server → http://localhost:${PORT}  (dist: ${DIST_DIR})`);
  console.log(`Supabase: ${SUPABASE_URL ? 'configured ✓' : 'NOT configured — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY'}`);
});
