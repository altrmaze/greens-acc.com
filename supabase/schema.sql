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

-- Deal announcements and syndication tracking
create table if not exists public.deal_announcements (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null,
  press_release text,
  social_posts jsonb,
  syndication_status text not null default 'draft', -- draft, preview, published, failed
  syndication_metadata jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_announcements_deal_id on public.deal_announcements (deal_id);
create index if not exists idx_deal_announcements_status on public.deal_announcements (syndication_status);

-- Instant meeting rooms with crypto tokens and session fees
create table if not exists public.instant_rooms (
  id uuid primary key default gen_random_uuid(),
  room_token text not null unique,
  room_name text,
  creator_company text,
  participant_company text,
  encryption_key text,
  session_fee_status text not null default 'pending', -- pending, paid, expired
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  is_active boolean not null default true
);

-- Document references (pointers to external files, not storing files)
create table if not exists public.document_references (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.instant_rooms(id) on delete cascade,
  document_name text,
  document_type text, -- pdf, docx, spreadsheet, contract, blueprint
  source_url text,
  oauth_provider text, -- gdrive, onedrive, etc (optional)
  encryption_metadata jsonb,
  uploaded_by text,
  created_at timestamptz not null default now()
);

-- Compliance monitoring logs
create table if not exists public.compliance_logs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.instant_rooms(id) on delete cascade,
  violation_type text, -- tariff_bypass, illegal_commodity, sanction_violation, export_control, etc
  severity text not null default 'warning', -- warning, critical, kill_switch
  description text,
  detected_content text,
  legal_citation text,
  ai_recommendation text,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- Room session state (tracks compliance status and kill switch)
create table if not exists public.room_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.instant_rooms(id) on delete cascade,
  session_status text not null default 'active', -- active, suspended, killed, completed
  compliance_flags jsonb,
  kill_switch_triggered boolean not null default false,
  kill_switch_reason text,
  handshake_allowed boolean not null default true,
  payment_allowed boolean not null default true,
  last_ai_check timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_instant_rooms_token on public.instant_rooms (room_token);
create index if not exists idx_instant_rooms_active on public.instant_rooms (is_active);
create index if not exists idx_document_references_room on public.document_references (room_id);
create index if not exists idx_compliance_logs_room on public.compliance_logs (room_id);
create index if not exists idx_compliance_logs_severity on public.compliance_logs (severity);
create index if not exists idx_room_sessions_status on public.room_sessions (session_status);

-- Behavioral signals for predictive intelligence engine
-- Tracks user interactions with categories (purchase, search, deal_close, etc.)
create table if not exists public.behavioral_signals (
  id uuid primary key default gen_random_uuid(),
  interaction_type text not null, -- purchase, deal_close, search, view, inquiry, etc.
  weight numeric(5,2) not null default 1.0,
  metadata jsonb, -- must contain { "category": "..." } to match market trends
  created_at timestamptz not null default now()
);

create index if not exists idx_behavioral_signals_created_at on public.behavioral_signals (created_at desc);
create index if not exists idx_behavioral_signals_interaction_type on public.behavioral_signals (interaction_type);

-- Global market trends for predictive intelligence engine
create table if not exists public.market_trends (
  id uuid primary key default gen_random_uuid(),
  category text not null unique,
  demand_index numeric(5,4) not null default 0.0, -- normalized 0.0–1.0
  velocity_score numeric(5,4) not null default 0.0, -- normalized 0.0–1.0
  source text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_market_trends_category on public.market_trends (category);

-- Automated alerts inserted when a category match score crosses the high-yield threshold (>75%)
create table if not exists public.prediction_alerts (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  score numeric(5,2) not null,
  threshold numeric(5,2) not null default 75.0,
  triggered_at timestamptz not null default now()
);

create index if not exists idx_prediction_alerts_category on public.prediction_alerts (category);
create index if not exists idx_prediction_alerts_triggered_at on public.prediction_alerts (triggered_at desc);
