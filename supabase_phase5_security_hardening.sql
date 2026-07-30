-- Phase 5: Security hardening
-- Run this in the Supabase SQL editor AFTER phase2/phase3/phase4 migrations.
-- Safe to re-run (idempotent).

-- ─── 1. Quotes visibility: Admin sees all, everyone else sees only their own ──
-- Replaces the previous role_based_select_quotes policy (which also gave
-- hr_admin full visibility and let managers see their direct reports' quotes).
DROP POLICY IF EXISTS "team_select_quotes"       ON quotes;
DROP POLICY IF EXISTS "role_based_select_quotes" ON quotes;

CREATE POLICY "role_based_select_quotes" ON quotes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR user_id = auth.uid()
  );
