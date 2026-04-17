-- =============================================================================
-- LAB11 POKER TRAINER — Migration v7: Opponent Ranges (Acao Dinamica do Vilao)
-- =============================================================================
-- Adiciona suporte a range do oponente e ranges do hero por acao do oponente.
-- Ex: BTN pode dar RAISE 2.2 ou ALL-IN dependendo da mao dele.
-- O hero tem ranges diferentes para cada acao do oponente.
-- =============================================================================

-- 1. Novas colunas na tabela scenarios
ALTER TABLE public.scenarios
  ADD COLUMN IF NOT EXISTS opponent_ranges jsonb,
  ADD COLUMN IF NOT EXISTS opponent_actions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hero_ranges_by_action jsonb;

-- 2. Novas colunas na tabela scenario_variants (para pos-flop com variantes)
ALTER TABLE public.scenario_variants
  ADD COLUMN IF NOT EXISTS opponent_ranges jsonb,
  ADD COLUMN IF NOT EXISTS opponent_actions text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS hero_ranges_by_action jsonb;

-- 3. Colunas extras no hand_history para rastrear acao do oponente
ALTER TABLE public.hand_history
  ADD COLUMN IF NOT EXISTS opponent_action text,
  ADD COLUMN IF NOT EXISTS opponent_hand_key text;
