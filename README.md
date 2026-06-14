# GreenACC

GreenACC is a static website with Supabase backend support for secure trade escrow, AI-monitored handshake workflows, and payment lifecycle tracking.

## Project structure

- `index.html` — main static site
- `package.json` — build, start, and test scripts
- `supabase/schema.sql` — database schema for deals and payments
- `supabase/functions/processEntryFee.js` — edge function to process the flat $20 entry fee
- `supabase/functions/processWithdrawal.js` — edge function to release escrow only after all 3 AI agents verify compliance

## Supabase integration

1. Create a Supabase project.
2. Add the `green_acc_deals` table using `supabase/schema.sql`.
3. Deploy edge functions from `supabase/functions/`.
4. Set environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

## Usage

- `npm run build` — build static site to `dist/`
- `npm start` — serve the site locally on port `5000`
- `npm test` — validate schema and edge function syntax

## Payment workflow

- Tracks mandatory $20 USD entry fee in `entry_fee_status`.
- Calculates 2% handshake commission using `handshake_commission_amount`.
- Locks funds in escrow until `ai_agent_status` is fully verified and `compliance_status` is verified.
- Uses `withdrawal_triggered` and `safe_withdrawal_ready` to prevent unauthorized fund release.

## Notes

- `processEntryFee.js` requires exactly $20.00 USD for fee processing.
- `processWithdrawal.js` gates withdrawal on handshake confirmation, compliance verification, and three AI agent verifications.
