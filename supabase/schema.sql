-- Supabase database schema for GreenACC payment lifecycle and escrow deals
-- This schema defines the master deal table for the GreenACC platform.

create extension if not exists "pgcrypto";

create table if not exists public.green_acc_deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  buyer_id uuid,
  seller_id uuid,
  region text not null default 'US',
  currency text not null default 'USD',
  amount_total numeric(12,2) not null default 0.00,
  entry_fee_amount numeric(12,2) not null default 20.00,
  entry_fee_status text not null default 'pending' check (entry_fee_status in ('pending','paid','verified','refunded')),
  handshake_commission_rate numeric(5,4) not null default 0.02,
  handshake_commission_amount numeric(12,2) generated always as (round(amount_total * handshake_commission_rate, 2)) stored,
  lc_reference_number text,
  handshake_status text not null default 'pending' check (handshake_status in ('pending','confirmed','rejected')),
  escrow_status text not null default 'locked' check (escrow_status in ('locked','released','pending','cancelled')),
  funds_locked boolean not null default true,
  compliance_status text not null default 'pending' check (compliance_status in ('pending','verified','failed')),
  safe_withdrawal_ready boolean not null default false,
  withdrawal_triggered boolean not null default false,
  ai_agent_status jsonb not null default '{"agent1":"pending","agent2":"pending","agent3":"pending"}',
  last_updated timestamptz not null default now()
);

create index if not exists idx_green_acc_deals_lc_reference_number on public.green_acc_deals (lc_reference_number);
create index if not exists idx_green_acc_deals_buyer_id on public.green_acc_deals (buyer_id);
create index if not exists idx_green_acc_deals_seller_id on public.green_acc_deals (seller_id);
