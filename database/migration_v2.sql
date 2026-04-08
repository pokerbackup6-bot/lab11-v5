-- =============================================================================
-- LAB11 — Migration v2
-- Adiciona suporte a persistência de histórico de treino no banco
-- =============================================================================

-- Adiciona session ID para agrupar mãos por sessão de treino,
-- e scenario_name para evitar join na leitura do histórico.
ALTER TABLE public.hand_history
  ADD COLUMN IF NOT EXISTS training_session_id uuid,
  ADD COLUMN IF NOT EXISTS scenario_name       text;

CREATE INDEX IF NOT EXISTS idx_hand_history_session
  ON public.hand_history (training_session_id);
