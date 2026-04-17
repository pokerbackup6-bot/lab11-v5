-- =============================================================================
-- LAB11 POKER TRAINER — Migration v6: Scenario Snapshots (Versionamento)
-- =============================================================================
-- Sistema de backup/versionamento para cenários.
-- Cada alteração (update, delete, migrate) salva um snapshot completo
-- do cenário antes da modificação, permitindo reversão.
-- =============================================================================

-- 1. Tabela de snapshots
CREATE TABLE IF NOT EXISTS public.scenario_snapshots (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id     uuid NOT NULL,  -- NÃO é FK pois o cenário pode ter sido deletado
  scenario_name   text NOT NULL,
  -- Dados completos do cenário no momento do snapshot
  scenario_data   jsonb NOT NULL,          -- JSON completo do cenário (todos os campos)
  variants_data   jsonb NOT NULL DEFAULT '[]', -- JSON completo das variants
  -- Metadados
  action          text NOT NULL,           -- 'update', 'delete', 'migrate', 'bulk_replace'
  description     text,                    -- Descrição legível da operação
  version         integer NOT NULL DEFAULT 1,
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_scenario_id ON public.scenario_snapshots(scenario_id);
CREATE INDEX IF NOT EXISTS idx_snapshots_created_at  ON public.scenario_snapshots(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_snapshots_action       ON public.scenario_snapshots(action);

-- 2. Adiciona coluna version à tabela scenarios
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- 3. RLS policies para snapshots
ALTER TABLE public.scenario_snapshots ENABLE ROW LEVEL SECURITY;

-- Admins podem ver e criar snapshots
CREATE POLICY "Admins podem ver snapshots"
  ON public.scenario_snapshots FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Admins podem criar snapshots"
  ON public.scenario_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- Service role pode tudo (usado pelo supabaseAdmin)
-- Nota: service role bypassa RLS automaticamente

-- 4. Adiciona coluna is_published à tabela scenarios
-- Cenários novos começam como rascunho (false). Só aparecem no treino quando publicados.
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- Cenários existentes (já estão em uso) devem começar como publicados
UPDATE public.scenarios SET is_published = true WHERE is_published = false;
