-- Core platform schema migrated from supabase/schema.sql so `supabase db push`
-- can apply the production tables during CI/CD releases.

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
  scope text not null default 'global',
  active boolean not null default true,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists idx_global_news_created_at on public.global_news (created_at);
create index if not exists idx_global_risk_flags_scope on public.global_risk_flags (scope);

create table if not exists public.deal_announcements (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null,
  press_release text,
  social_posts jsonb,
  syndication_status text not null default 'draft',
  syndication_metadata jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_announcements_deal_id on public.deal_announcements (deal_id);
create index if not exists idx_deal_announcements_status on public.deal_announcements (syndication_status);

create table if not exists public.instant_rooms (
  id uuid primary key default gen_random_uuid(),
  room_token text not null unique,
  room_name text,
  creator_company text,
  participant_company text,
  encryption_key text,
  session_fee_status text not null default 'pending',
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  is_active boolean not null default true
);

create table if not exists public.document_references (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.instant_rooms(id) on delete cascade,
  document_name text,
  document_type text,
  source_url text,
  oauth_provider text,
  encryption_metadata jsonb,
  uploaded_by text,
  created_at timestamptz not null default now()
);

create table if not exists public.compliance_logs (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.instant_rooms(id) on delete cascade,
  violation_type text,
  severity text not null default 'warning',
  description text,
  detected_content text,
  legal_citation text,
  ai_recommendation text,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.room_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references public.instant_rooms(id) on delete cascade,
  session_status text not null default 'active',
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

create table if not exists public.marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null,
  description text,
  quantity numeric(14,4),
  price_per_unit numeric(14,4),
  seller_id uuid not null,
  is_verified boolean not null default false,
  status text not null default 'pending_verification',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_marketplace_listings_seller on public.marketplace_listings (seller_id);
create index if not exists idx_marketplace_listings_status on public.marketplace_listings (status);

create table if not exists public.user_profiles (
  id uuid primary key default gen_random_uuid(),
  display_name text,
  email text,
  account_status text not null default 'active',
  security_flags text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_profiles_status on public.user_profiles (account_status);

create table if not exists public.legal_audit_logs (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid,
  is_compliant boolean not null default false,
  report_payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_legal_audit_logs_contract on public.legal_audit_logs (contract_id);
create index if not exists idx_legal_audit_logs_compliant on public.legal_audit_logs (is_compliant);

create table if not exists public.supply_chain_tracking (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  carrier_identity text not null default 'unassigned',
  origin_point text not null,
  destination_point text not null,
  current_milestone text not null default 'manifest_created',
  transit_status text not null default 'in_preparation',
  logs jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_supply_chain_order on public.supply_chain_tracking (order_id);
create index if not exists idx_supply_chain_status on public.supply_chain_tracking (transit_status);

create table if not exists public.deal_clearances (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null,
  user_id uuid not null,
  commodity_type text not null default 'general',
  status text not null default 'PENDING_DOCUMENTS'
    check (status in ('PENDING_DOCUMENTS','PENDING_REVIEW','APPROVED','REJECTED')),
  ncnda_signed boolean not null default false,
  ncnda_signed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (deal_id, user_id)
);

create index if not exists idx_deal_clearances_deal on public.deal_clearances (deal_id);
create index if not exists idx_deal_clearances_user on public.deal_clearances (user_id);
create index if not exists idx_deal_clearances_status on public.deal_clearances (status);

create table if not exists public.deal_documents (
  id uuid primary key default gen_random_uuid(),
  clearance_id uuid not null references public.deal_clearances(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  file_size_bytes int,
  status text not null default 'PENDING_REVIEW'
    check (status in ('PENDING_REVIEW','APPROVED','REJECTED')),
  reviewer_notes text,
  uploaded_at timestamptz not null default now()
);

create index if not exists idx_deal_documents_clearance on public.deal_documents (clearance_id);
create index if not exists idx_deal_documents_status on public.deal_documents (status);

create table if not exists public.deal_appointments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null,
  user_id uuid not null,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 60,
  timezone text not null default 'UTC',
  status text not null default 'pending'
    check (status in ('pending','confirmed','cancelled')),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_appointments_deal on public.deal_appointments (deal_id);
create index if not exists idx_deal_appointments_user on public.deal_appointments (user_id);
create index if not exists idx_deal_appointments_status on public.deal_appointments (status);

create table if not exists public.proxy_gov_filings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  deal_id uuid not null,
  agency_target_name text not null,
  document_type_scope text not null,
  execution_status text not null default 'DRAFT'
    check (execution_status in ('DRAFT','SUBMITTED','ACKNOWLEDGED','REISSUED','REJECTED','FAILED')),
  preferred_language text not null default 'en',
  proxy_authorization_signed boolean not null default false,
  tracking_reference_logs jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_proxy_gov_filings_deal on public.proxy_gov_filings (deal_id);
create index if not exists idx_proxy_gov_filings_user on public.proxy_gov_filings (user_id);
create index if not exists idx_proxy_gov_filings_status on public.proxy_gov_filings (execution_status);

create table if not exists public.deal_fulfillments (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null unique,
  buyer_id uuid,
  seller_id uuid,
  gross_value_usd numeric(15,2) not null default 0.00,
  platform_fee_usd numeric(15,2) generated always as (round(gross_value_usd * 0.02, 2)) stored,
  stripe_session_id text,
  stripe_payment_status text not null default 'PENDING'
    check (stripe_payment_status in ('PENDING','PAID','FAILED','REFUNDED')),
  current_logistics_status text not null default 'ORIGIN_PORT'
    check (current_logistics_status in ('ORIGIN_PORT','IN_TRANSIT','CUSTOMS_CLEARANCE','DELIVERED')),
  vessel_tracking_id text,
  origin_port text,
  destination_port text,
  estimated_delivery_date date,
  route_coordinates jsonb not null default '[]',
  milestone_log jsonb not null default '[]',
  commodity_type text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_fulfillments_deal on public.deal_fulfillments (deal_id);
create index if not exists idx_deal_fulfillments_buyer on public.deal_fulfillments (buyer_id);
create index if not exists idx_deal_fulfillments_seller on public.deal_fulfillments (seller_id);
create index if not exists idx_deal_fulfillments_status on public.deal_fulfillments (stripe_payment_status);
create index if not exists idx_deal_fulfillments_logistics on public.deal_fulfillments (current_logistics_status);

create table if not exists public.meeting_room_documents (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null,
  uploader_id uuid not null,
  file_name text not null,
  file_path text not null,
  mime_type text not null,
  file_size_bytes int,
  scan_status text not null default 'PENDING'
    check (scan_status in ('PENDING','CLEAN','QUARANTINED')),
  created_at timestamptz not null default now()
);

create index if not exists idx_meeting_docs_deal on public.meeting_room_documents (deal_id);
create index if not exists idx_meeting_docs_uploader on public.meeting_room_documents (uploader_id);

create table if not exists public.meeting_memos (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null,
  receiver_id uuid not null,
  memo_type text not null default 'CONTRACT_FLAG'
    check (memo_type in ('CONTRACT_FLAG','COMPLIANCE_ALERT','DOCUMENT_NOTE','GENERAL')),
  content_message text not null,
  source_clause text,
  severity text not null default 'INFO'
    check (severity in ('INFO','WARNING','CRITICAL')),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_meeting_memos_deal on public.meeting_memos (deal_id);
create index if not exists idx_meeting_memos_receiver on public.meeting_memos (receiver_id);
create index if not exists idx_meeting_memos_read on public.meeting_memos (is_read);
