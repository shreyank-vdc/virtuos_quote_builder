-- Phase 6: Server-side signup domain restriction
-- Run this in the Supabase SQL editor AFTER phase2/phase3/phase4/phase5 migrations.
-- Safe to re-run (idempotent).
--
-- Why: Login.jsx only checks the email domain in the browser before calling
-- supabase.auth.signUp(). That check is trivially bypassed by calling the
-- Supabase Auth REST endpoint directly with the (intentionally public)
-- anon/publishable key. Once signed up, a new account is "authenticated" and
-- — because accounts/contacts/leads/opportunities use team-wide
-- authenticated-only SELECT policies — could read the entire customer
-- database. This trigger enforces the domain allowlist at the database
-- level, where it can't be bypassed by any client.

CREATE OR REPLACE FUNCTION enforce_signup_email_domain()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.email !~* '@(virtuos\.com|virtuosdigital\.com)$' THEN
    RAISE EXCEPTION 'Signups are restricted to @virtuos.com and @virtuosdigital.com email addresses.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_signup_email_domain_trigger ON auth.users;
CREATE TRIGGER enforce_signup_email_domain_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION enforce_signup_email_domain();
