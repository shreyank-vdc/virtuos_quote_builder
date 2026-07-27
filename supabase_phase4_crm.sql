-- Phase 4: Light CRM — Leads, Opportunities (+ Contacts upgrade)
-- Run this in the Supabase SQL editor AFTER phase2/phase3 migrations.
-- Safe to re-run (idempotent).

-- ─── 1. Enums ─────────────────────────────────────────────────────────────────
do $$ begin
  create type lead_status as enum ('new','contacted','qualified','disqualified','converted');
exception when duplicate_object then null; end $$;

do $$ begin
  create type opportunity_stage as enum ('new','qualified','demo','proposal','negotiation','closed_won','closed_lost');
exception when duplicate_object then null; end $$;

-- ─── 2. Leads table ─────────────────────────────────────────────────────────────
create table if not exists leads (
  id                        uuid primary key default gen_random_uuid(),
  name                      text not null,
  company                   text,
  email                     text,
  phone                     text,
  title                     text,
  source                    text,
  status                    lead_status not null default 'new',
  owner_id                  uuid references auth.users(id) on delete set null,
  notes                     text,
  converted_contact_id      uuid,
  converted_opportunity_id  uuid,
  created_by                uuid references auth.users(id) on delete set null,
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

-- ─── 3. Opportunities table ──────────────────────────────────────────────────
create table if not exists opportunities (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  account_id           uuid references accounts(id) on delete set null,
  primary_contact_id   uuid references contacts(id) on delete set null,
  stage                opportunity_stage not null default 'new',
  value_usd            numeric default 0,
  currency             text default 'USD',
  expected_close_date  date,
  owner_id             uuid references auth.users(id) on delete set null,
  notes                text,
  created_by           uuid references auth.users(id) on delete set null,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- ─── 4. Cross-references (added after both tables exist) ────────────────────
do $$ begin
  alter table leads add constraint leads_converted_contact_id_fkey
    foreign key (converted_contact_id) references contacts(id) on delete set null;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table leads add constraint leads_converted_opportunity_id_fkey
    foreign key (converted_opportunity_id) references opportunities(id) on delete set null;
exception when duplicate_object then null; end $$;

alter table quotes add column if not exists opportunity_id uuid references opportunities(id) on delete set null;

-- ─── 5. Contacts upgrade (CRM fields) ────────────────────────────────────────
alter table contacts add column if not exists owner_id   uuid references auth.users(id) on delete set null;
alter table contacts add column if not exists source     text;
alter table contacts add column if not exists notes      text;
alter table contacts add column if not exists updated_at timestamptz default now();

-- ─── 6. Indexes ───────────────────────────────────────────────────────────────
create index if not exists idx_leads_status            on leads(status);
create index if not exists idx_leads_owner              on leads(owner_id);
create index if not exists idx_opportunities_stage       on opportunities(stage);
create index if not exists idx_opportunities_account     on opportunities(account_id);
create index if not exists idx_opportunities_contact     on opportunities(primary_contact_id);
create index if not exists idx_opportunities_owner       on opportunities(owner_id);
create index if not exists idx_quotes_opportunity        on quotes(opportunity_id);

-- ─── 7. RLS ───────────────────────────────────────────────────────────────────
alter table leads enable row level security;
alter table opportunities enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'leads' and policyname = 'team_select_leads') then
    execute 'create policy "team_select_leads" on leads for select using (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'leads' and policyname = 'team_insert_leads') then
    execute 'create policy "team_insert_leads" on leads for insert with check (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'leads' and policyname = 'team_update_leads') then
    execute 'create policy "team_update_leads" on leads for update using (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'leads' and policyname = 'team_delete_leads') then
    execute 'create policy "team_delete_leads" on leads for delete using (auth.role() = ''authenticated'')';
  end if;

  if not exists (select 1 from pg_policies where tablename = 'opportunities' and policyname = 'team_select_opportunities') then
    execute 'create policy "team_select_opportunities" on opportunities for select using (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'opportunities' and policyname = 'team_insert_opportunities') then
    execute 'create policy "team_insert_opportunities" on opportunities for insert with check (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'opportunities' and policyname = 'team_update_opportunities') then
    execute 'create policy "team_update_opportunities" on opportunities for update using (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'opportunities' and policyname = 'team_delete_opportunities') then
    execute 'create policy "team_delete_opportunities" on opportunities for delete using (auth.role() = ''authenticated'')';
  end if;
end
$$;
