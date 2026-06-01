-- Phase 2: Customer Accounts & Contacts + Fix Quotes team visibility
-- Run this in the Supabase SQL editor for your project
-- Safe to run multiple times (uses IF NOT EXISTS / OR REPLACE)

-- ─── 1. Fix quotes table RLS to allow all team members to read all quotes ───
-- Drop the old per-user SELECT policy if it exists, replace with team-wide one
do $$
begin
  -- Drop common per-user policy names (adjust if yours is named differently)
  if exists (select 1 from pg_policies where tablename = 'quotes' and policyname = 'Users can view their own quotes') then
    execute 'drop policy "Users can view their own quotes" on quotes';
  end if;
  if exists (select 1 from pg_policies where tablename = 'quotes' and policyname = 'user_select_quotes') then
    execute 'drop policy "user_select_quotes" on quotes';
  end if;
  if exists (select 1 from pg_policies where tablename = 'quotes' and policyname = 'select_own_quotes') then
    execute 'drop policy "select_own_quotes" on quotes';
  end if;
end
$$;

-- Team-wide read: any authenticated user can see all quotes
create policy "team_select_quotes" on quotes
  for select using (auth.role() = 'authenticated');

-- Ensure insert/update/delete are still scoped to own records
do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'quotes' and policyname = 'team_insert_quotes') then
    execute 'create policy "team_insert_quotes" on quotes for insert with check (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'quotes' and policyname = 'team_update_quotes') then
    execute 'create policy "team_update_quotes" on quotes for update using (auth.uid() = user_id)';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'quotes' and policyname = 'team_delete_quotes') then
    execute 'create policy "team_delete_quotes" on quotes for delete using (auth.uid() = user_id)';
  end if;
end
$$;

-- ─── 2. Accounts table ────────────────────────────────────────────────────────
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

-- ─── 3. Contacts table ───────────────────────────────────────────────────────
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

-- ─── 4. Link quotes to accounts ──────────────────────────────────────────────
alter table quotes add column if not exists account_id uuid references accounts(id) on delete set null;

-- ─── 5. Indexes for fast lookups ─────────────────────────────────────────────
create index if not exists idx_contacts_account   on contacts(account_id);
create index if not exists idx_quotes_account     on quotes(account_id);
create index if not exists idx_accounts_name      on accounts using gin(to_tsvector('simple', name));

-- ─── 6. RLS for accounts and contacts ────────────────────────────────────────
alter table accounts enable row level security;
alter table contacts enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'accounts' and policyname = 'team_select_accounts') then
    execute 'create policy "team_select_accounts" on accounts for select using (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'accounts' and policyname = 'team_insert_accounts') then
    execute 'create policy "team_insert_accounts" on accounts for insert with check (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'accounts' and policyname = 'team_update_accounts') then
    execute 'create policy "team_update_accounts" on accounts for update using (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'accounts' and policyname = 'team_delete_accounts') then
    execute 'create policy "team_delete_accounts" on accounts for delete using (auth.role() = ''authenticated'')';
  end if;

  if not exists (select 1 from pg_policies where tablename = 'contacts' and policyname = 'team_select_contacts') then
    execute 'create policy "team_select_contacts" on contacts for select using (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'contacts' and policyname = 'team_insert_contacts') then
    execute 'create policy "team_insert_contacts" on contacts for insert with check (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'contacts' and policyname = 'team_update_contacts') then
    execute 'create policy "team_update_contacts" on contacts for update using (auth.role() = ''authenticated'')';
  end if;
  if not exists (select 1 from pg_policies where tablename = 'contacts' and policyname = 'team_delete_contacts') then
    execute 'create policy "team_delete_contacts" on contacts for delete using (auth.role() = ''authenticated'')';
  end if;
end
$$;
