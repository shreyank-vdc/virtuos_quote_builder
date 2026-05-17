-- Phase 2: Customer Accounts & Contacts
-- Run this in the Supabase SQL editor for your project

-- Accounts table
create table if not exists accounts (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  industry     text,
  country      text,
  website      text,
  notes        text,
  owner_id     uuid references auth.users(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now()
);

-- Contacts table
create table if not exists contacts (
  id           uuid primary key default gen_random_uuid(),
  account_id   uuid references accounts(id) on delete cascade,
  name         text not null,
  email        text,
  phone        text,
  designation  text,
  is_primary   boolean default false,
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz default now()
);

-- Link quotes to accounts
alter table quotes add column if not exists account_id uuid references accounts(id) on delete set null;

-- Indexes for fast lookups
create index if not exists idx_contacts_account   on contacts(account_id);
create index if not exists idx_quotes_account     on quotes(account_id);
create index if not exists idx_accounts_name      on accounts using gin(to_tsvector('simple', name));

-- RLS: all authenticated team members can read/write accounts and contacts
alter table accounts enable row level security;
alter table contacts enable row level security;

create policy "team_select_accounts" on accounts for select using (auth.role() = 'authenticated');
create policy "team_insert_accounts" on accounts for insert with check (auth.role() = 'authenticated');
create policy "team_update_accounts" on accounts for update using (auth.role() = 'authenticated');
create policy "team_delete_accounts" on accounts for delete using (auth.role() = 'authenticated');

create policy "team_select_contacts" on contacts for select using (auth.role() = 'authenticated');
create policy "team_insert_contacts" on contacts for insert with check (auth.role() = 'authenticated');
create policy "team_update_contacts" on contacts for update using (auth.role() = 'authenticated');
create policy "team_delete_contacts" on contacts for delete using (auth.role() = 'authenticated');
