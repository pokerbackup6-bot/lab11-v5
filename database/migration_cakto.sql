-- ============================================================
-- LAB11 — Cakto Payment Integration
-- Run this in the Supabase SQL Editor
-- ============================================================

-- 1. Add columns to profiles
--    Existing users get is_active = true to avoid breaking current access.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS is_active             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS full_name             text,
  ADD COLUMN IF NOT EXISTS email                 text,
  -- Subscription monitoring:
  --   'active'    — paid and current
  --   'overdue'   — payment past due (Cakto overdue/dunning event)
  --   'canceled'  — user or admin canceled
  --   'refunded'  — refund processed
  --   'chargeback'— chargeback filed
  --   'manual'    — access set manually by admin (no Cakto event)
  ADD COLUMN IF NOT EXISTS subscription_status   text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS subscription_updated_at timestamptz;

-- Activate all profiles that already exist (grandfathered access)
UPDATE profiles
SET is_active = true,
    subscription_status = 'manual'
WHERE is_active = false;

-- 2. Cakto webhook event log (audit trail)
CREATE TABLE IF NOT EXISTS cakto_webhook_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at   timestamptz NOT NULL DEFAULT now(),
  event_type    text NOT NULL,
  customer_email text,
  payload       jsonb,
  processed     boolean NOT NULL DEFAULT false,
  error_message text
);

-- Index for quick lookups when marking events as processed
CREATE INDEX IF NOT EXISTS idx_cakto_events_email ON cakto_webhook_events (customer_email, received_at DESC);

-- RLS: only service role can read/write (webhook runs with service key)
ALTER TABLE cakto_webhook_events ENABLE ROW LEVEL SECURITY;
-- No user-facing policy: only the edge function (service role) accesses this table.
