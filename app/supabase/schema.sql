-- CampusFest Kolkata (Challenge B) Growth Center — Supabase Postgres Schema
-- Run this in Supabase SQL Editor BEFORE running seed.sql

create table if not exists public.gc_targets (
  id text primary key,
  event_name text not null,
  city text not null,
  total_prospects_target integer not null,
  conversations_target integer not null,
  proposals_target integer not null,
  signed_deals_target integer not null,
  cash_deals_target integer not null,
  base_cash_collected_target_inr integer not null,
  stretch_cash_collected_target_inr integer not null,
  risk_adjusted_target_inr integer not null,
  budget_cap_inr integer not null,
  inventory_cash_slots integer not null,
  team_hours_cap integer not null,
  historical_qualified_goal integer not null,
  historical_confirmed_goal integer not null
);

create table if not exists public.gc_campaigns (
  id text primary key,
  name text not null,
  rank integer not null,
  rice_score numeric(6,2) not null,
  owner text not null,
  timeline text not null,
  gross_inr integer not null,
  overlap_haircut_pct numeric(5,4) not null,
  net_incremental_inr integer not null,
  realized_incremental_inr integer not null,
  budget_inr integer not null,
  spent_inr integer not null,
  leading_indicator_name text not null,
  leading_unit text not null,
  leading_actual numeric(8,2) not null,
  sample_completed integer not null,
  sample_target integer not null,
  "window" text not null,
  scale_min numeric(8,2) not null,
  change_min numeric(8,2) not null,
  stop_below numeric(8,2) not null,
  scale_action text not null,
  change_action text not null,
  stop_action text not null,
  status text not null default 'active'
);

create table if not exists public.gc_historical_channels (
  campaign_id text primary key,
  campaign_name text not null,
  channel text not null,
  tier_group text not null,
  owner_name text not null,
  attempts integer not null,
  brands_touched integer not null,
  meetings_held integer not null,
  opt_outs integer not null,
  qualified_brands integer not null,
  opportunities_created integer not null,
  proposals_sent integer not null,
  confirmed_deals integer not null,
  lost_or_withdrawn integer not null,
  confirmed_cash_inr integer not null,
  confirmed_inkind_inr integer not null
);

create table if not exists public.gc_opportunities (
  opportunity_id text primary key,
  brand_id text not null,
  brand_name text not null,
  opportunity_name text not null,
  industry text not null,
  originating_campaign_id text not null,
  originating_campaign_name text not null,
  primary_contact_name text not null,
  primary_contact_job_title text not null,
  owner_name text not null,
  qualification_status text not null,
  support_type text not null,
  stage text not null,
  proposed_value_inr integer not null,
  confirmed_value_inr integer not null,
  cash_collected_inr integer not null,
  early_bird_terms boolean not null default false,
  days_in_stage integer not null default 1,
  effective_at text not null
);

create table if not exists public.gc_dropped_qualified_brands (
  brand_id text primary key,
  brand_name text not null,
  industry text not null,
  source_campaign_id text not null,
  source_campaign_name text not null,
  owner_name text not null,
  qualified_at text not null,
  converted_to_opp boolean not null default false
);

create table if not exists public.gc_tasks (
  id text primary key,
  title text not null,
  campaign_id text not null,
  owner text not null,
  deadline text not null,
  status text not null,
  priority text not null,
  notes text not null default ''
);

create table if not exists public.gc_change_log (
  id text primary key,
  changed_at text not null,
  entity_type text not null,
  entity_id text not null,
  summary text not null,
  actor text not null
);

create table if not exists public.gc_frozen_snapshot (
  snapshot_id text primary key,
  created_at timestamptz not null default now(),
  payload jsonb not null
);

-- Enable Row Level Security with open prototype policies (anon read/write for demo & evaluator testing)
alter table public.gc_targets enable row level security;
alter table public.gc_campaigns enable row level security;
alter table public.gc_historical_channels enable row level security;
alter table public.gc_opportunities enable row level security;
alter table public.gc_dropped_qualified_brands enable row level security;
alter table public.gc_tasks enable row level security;
alter table public.gc_change_log enable row level security;
alter table public.gc_frozen_snapshot enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array[
    'gc_targets','gc_campaigns','gc_historical_channels',
    'gc_opportunities','gc_dropped_qualified_brands',
    'gc_tasks','gc_change_log','gc_frozen_snapshot'
  ] loop
    execute format('drop policy if exists "Allow all for prototype" on public.%I', t);
    execute format('create policy "Allow all for prototype" on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;
