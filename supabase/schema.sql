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

-- Signaling table for meeting suite (used for WebRTC offer/answer/candidates via Supabase Realtime)
create table if not exists public.meeting_signals (
  id uuid primary key default gen_random_uuid(),
  room_id text not null,
  sender_id text not null,
  target_id text,
  signal_type text not null,
  signal_data jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_meeting_signals_room_id on public.meeting_signals (room_id);

-- Global news feed for emergency interceptor
create table if not exists public.global_news (
  id uuid primary key default gen_random_uuid(),
  source text,
  title text,
  summary text,
  category text,
  severity text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.global_risk_flags (
  id uuid primary key default gen_random_uuid(),
  news_id uuid references public.global_news(id) on delete set null,
  scope text not null default 'global', -- can be room-specific later
  active boolean not null default true,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_global_news_created_at on public.global_news (created_at);
create index if not exists idx_global_risk_flags_scope on public.global_risk_flags (scope);
