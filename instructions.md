# Greens ACC Copilot Instructions

You are helping build Greens ACC at greensacc.com.

## Project goal

Build a secure trade escrow / deal verification website with dashboard, instant deal rooms, buyer/seller workflow, Supabase database, and clean professional UI.

## Brand

- **Name:** Greens ACC
- **Domain:** greensacc.com
- **Style:** dark navy, emerald green, gold accents
- Avoid "Green Banana" unless user asks.

## Tech stack

- HTML, TailwindCSS, JavaScript
- Supabase JS v2
- Mobile-first design
- Keep code simple enough to edit from phone/GitHub app.

## Rules

- Always return complete working code, not fragments.
- Explain exactly where to paste each file.
- Do not remove existing features unless asked.
- Add security comments where Supabase keys, RLS, auth, or payments are involved.
- Prefer one-file HTML when user asks for simple deployment.
- For larger updates, separate files clearly:
  - `index.html`
  - `styles.css`
  - `app.js`
  - `supabase.sql`

## Main features to improve

- Secure escrow deal records
- $20 entry fee display
- 2% commission preview
- Instant verification rooms
- AI assistant section
- Trademark/ticker bar
- Login/admin dashboard
- Mobile-friendly UI
