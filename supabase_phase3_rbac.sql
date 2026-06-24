-- Phase 3: Role-Based Access Control (RBAC)
-- Run this in the Supabase SQL editor AFTER phase2 migration.
-- Safe to re-run (idempotent).

-- ─── 1. Role enum ────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'hr_admin', 'manager', 'contributor');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── 2. User profiles table ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  full_name   text,
  role        user_role NOT NULL DEFAULT 'contributor',
  manager_id  uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_manager ON user_profiles(manager_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role    ON user_profiles(role);

-- ─── 3. Auto-create profile on signup ────────────────────────────────────────
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'contributor'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ─── 4. Backfill profiles for existing users ─────────────────────────────────
INSERT INTO user_profiles (id, email, full_name, role)
SELECT
  id,
  email,
  COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
  'contributor'
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- ─── 5. RLS on user_profiles ─────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "all_read_profiles"       ON user_profiles;
DROP POLICY IF EXISTS "admin_hr_write_profiles" ON user_profiles;
DROP POLICY IF EXISTS "own_profile_insert"      ON user_profiles;

CREATE POLICY "all_read_profiles" ON user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "admin_hr_write_profiles" ON user_profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role IN ('admin', 'hr_admin'))
  );

CREATE POLICY "own_profile_insert" ON user_profiles
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ─── 6. Role-based quotes visibility ─────────────────────────────────────────
-- Replace the simple team_select_quotes with a role-aware policy
DROP POLICY IF EXISTS "team_select_quotes"       ON quotes;
DROP POLICY IF EXISTS "role_based_select_quotes" ON quotes;

CREATE POLICY "role_based_select_quotes" ON quotes
  FOR SELECT USING (
    -- Admin and HR-Admin see all quotes
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'hr_admin')
    )
    OR
    -- Managers see their own + their direct reports' quotes
    (
      EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'manager')
      AND (
        user_id = auth.uid()
        OR user_id IN (SELECT id FROM user_profiles WHERE manager_id = auth.uid())
      )
    )
    OR
    -- Contributors (and unassigned managers) see only their own
    user_id = auth.uid()
  );

-- ─── 7. Create user accounts ─────────────────────────────────────────────────

-- pooja.thareja@virtuos.com → HR-Admin
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'pooja.thareja@virtuos.com';
  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_sso_user, confirmation_sent_at
    ) VALUES (
      v_uid, 'authenticated', 'authenticated',
      'pooja.thareja@virtuos.com',
      crypt('Virtuos@2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Pooja Thareja"}',
      now(), now(), false, now()
    );
  END IF;
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (v_uid, 'pooja.thareja@virtuos.com', 'Pooja Thareja', 'hr_admin')
  ON CONFLICT (id) DO UPDATE SET role = 'hr_admin', full_name = 'Pooja Thareja', email = 'pooja.thareja@virtuos.com';
END $$;

-- shivam.chawla@virtuos.com → Manager
DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'shivam.chawla@virtuos.com';
  IF v_uid IS NULL THEN
    v_uid := gen_random_uuid();
    INSERT INTO auth.users (
      id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      is_sso_user, confirmation_sent_at
    ) VALUES (
      v_uid, 'authenticated', 'authenticated',
      'shivam.chawla@virtuos.com',
      crypt('Virtuos@2024!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Shivam Chawla"}',
      now(), now(), false, now()
    );
  END IF;
  INSERT INTO user_profiles (id, email, full_name, role)
  VALUES (v_uid, 'shivam.chawla@virtuos.com', 'Shivam Chawla', 'manager')
  ON CONFLICT (id) DO UPDATE SET role = 'manager', full_name = 'Shivam Chawla', email = 'shivam.chawla@virtuos.com';
END $$;

-- ─── 8. Make existing admin (shreyank@virtuos.com) an Admin ──────────────────
UPDATE user_profiles
SET role = 'admin'
WHERE email = 'shreyank@virtuos.com';
