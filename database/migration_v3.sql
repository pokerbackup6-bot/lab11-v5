-- ============================================================
-- LAB11 — Migration v3: access_expires_at
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Adiciona coluna para controle manual de expiração de acesso
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS access_expires_at timestamptz;

-- Comentário: quando o admin estende o acesso de um usuário,
-- basta setar is_active = true e access_expires_at = [data futura].
-- A desativação automática pode ser feita via pg_cron ou Edge Function agendada.
-- Por ora, o admin visualiza a data e desativa manualmente quando necessário.
