-- =============================================================================
-- LAB11 POKER TRAINER — Supabase Migration v1
-- =============================================================================
-- Execute este arquivo no Supabase SQL Editor (projeto > SQL > New Query)
-- Ordem de execução: rodar tudo de uma vez, de cima para baixo.
-- =============================================================================


-- =============================================================================
-- 0. EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- =============================================================================
-- 1. PROFILES
-- Estende auth.users do Supabase com dados do perfil do usuário.
-- Criado automaticamente via trigger ao registrar um usuário.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     text,
  whatsapp      text,
  is_admin      boolean NOT NULL DEFAULT false,
  must_change_password boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Trigger: atualiza updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Trigger: cria perfil automaticamente ao registrar novo usuário no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, must_change_password)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, true)
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================================================
-- 2. USER_SESSIONS
-- Controla sessões ativas por usuário para a política "um acesso por vez".
-- Apenas a sessão mais recente fica ativa; novas logins invalidam sessões antigas.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_token   text NOT NULL UNIQUE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  last_active_at  timestamptz NOT NULL DEFAULT now(),
  is_active       boolean NOT NULL DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token  ON public.user_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id, is_active);


-- =============================================================================
-- 3. SCENARIOS
-- Cenários de treino (pré-flop e pós-flop).
-- Mapeia 1:1 com a interface Scenario do TypeScript.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.scenarios (
  id                uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Identificação
  name              text NOT NULL,
  description       text,
  video_link        text,
  -- Classificação
  modality          text NOT NULL,                   -- ex: 'MTT', 'Cash'
  street            text NOT NULL,                   -- 'pre-flop' | 'post-flop'
  preflop_action    text NOT NULL DEFAULT '',
  -- Configuração da mesa
  player_count      integer NOT NULL DEFAULT 9,
  hero_pos          text NOT NULL,                   -- ex: 'BTN', 'CO', 'BB'
  opponents         text[] NOT NULL DEFAULT '{}',    -- ex: ['SB', 'BB']
  -- Stack e apostas
  stack_bb          numeric NOT NULL DEFAULT 100,
  hero_bet_size     numeric NOT NULL DEFAULT 0,
  opponent_bet_size numeric,
  initial_pot_bb    numeric,
  opponent_action   text,                            -- ex: 'Check', 'Bet'
  -- Board (pós-flop)
  board             text[] NOT NULL DEFAULT '{}',    -- ex: ['Ah', 'Kd', '2s']
  -- Range data (frequências por mão/combo)
  ranges            jsonb NOT NULL DEFAULT '{}',
  -- Ações customizadas dos botões
  custom_actions    text[] NOT NULL DEFAULT '{}',
  -- Metadados
  is_system_default boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER scenarios_updated_at
  BEFORE UPDATE ON public.scenarios
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_scenarios_created_by ON public.scenarios(created_by);
CREATE INDEX IF NOT EXISTS idx_scenarios_is_default  ON public.scenarios(is_system_default);
-- Índice GIN para buscas dentro do JSONB de ranges (suporte a @>, ?, etc.)
CREATE INDEX IF NOT EXISTS idx_scenarios_ranges_gin  ON public.scenarios USING GIN (ranges);


-- =============================================================================
-- 4. SCENARIO_VARIANTS
-- Variantes de board para um mesmo cenário pós-flop.
-- Cada variante tem seu próprio board, ranges e custom_actions.
-- Mapeia 1:1 com a interface BoardVariant do TypeScript.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.scenario_variants (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_id    uuid NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  board          text[] NOT NULL DEFAULT '{}',
  ranges         jsonb NOT NULL DEFAULT '{}',
  custom_actions text[] NOT NULL DEFAULT '{}',
  is_duplicate   boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 0,         -- para manter a ordem original
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_variants_scenario_id ON public.scenario_variants(scenario_id);
CREATE INDEX IF NOT EXISTS idx_variants_ranges_gin  ON public.scenario_variants USING GIN (ranges);


-- =============================================================================
-- 5. HAND_HISTORY
-- Registro de cada decisão tomada pelo usuário durante o treino.
-- Inclui a frequência da ação escolhida para o sistema de peso (✓/✓✓/✓✓✓).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.hand_history (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id     uuid REFERENCES public.scenarios(id) ON DELETE SET NULL,
  variant_id      uuid REFERENCES public.scenario_variants(id) ON DELETE SET NULL,
  -- Mão do herói
  hand_key        text NOT NULL,                     -- ex: 'AA', 'KQs', 'AhKd'
  hero_cards      text[] NOT NULL DEFAULT '{}',      -- ex: ['Ah', 'Kd']
  -- Decisão
  user_action     text NOT NULL,                     -- ação escolhida pelo usuário
  correct_action  text NOT NULL,                     -- ação de maior frequência no range
  is_correct      boolean NOT NULL,
  is_timeout      boolean NOT NULL DEFAULT false,
  -- Frequência da ação escolhida no range (0–100)
  -- Usado para o sistema de peso: ≥60 → ✓✓✓, ≥30 → ✓✓, <30 → ✓
  correct_freq    numeric NOT NULL DEFAULT 0,
  -- Timestamp
  played_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hand_history_user_id     ON public.hand_history(user_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_scenario_id ON public.hand_history(scenario_id);
CREATE INDEX IF NOT EXISTS idx_hand_history_played_at   ON public.hand_history(user_id, played_at DESC);


-- =============================================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenarios        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hand_history     ENABLE ROW LEVEL SECURITY;


-- Helper: verifica se o usuário autenticado é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid()),
    false
  );
$$;


-- ---------------------------------------------------------------------------
-- 6.1 PROFILES policies
-- ---------------------------------------------------------------------------
-- Usuário lê apenas o próprio perfil; admin lê todos
CREATE POLICY "profiles_select_own"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin());

-- Usuário atualiza apenas o próprio perfil
CREATE POLICY "profiles_update_own"
  ON public.profiles FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Apenas admin pode inserir/deletar perfis diretamente
-- (Insert normal é feito pelo trigger handle_new_user com SECURITY DEFINER)
CREATE POLICY "profiles_insert_admin"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "profiles_delete_admin"
  ON public.profiles FOR DELETE
  USING (public.is_admin());


-- ---------------------------------------------------------------------------
-- 6.2 USER_SESSIONS policies
-- ---------------------------------------------------------------------------
-- Usuário gerencia apenas suas próprias sessões
CREATE POLICY "sessions_select_own"
  ON public.user_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "sessions_insert_own"
  ON public.user_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "sessions_update_own"
  ON public.user_sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "sessions_delete_own"
  ON public.user_sessions FOR DELETE
  USING (user_id = auth.uid());


-- ---------------------------------------------------------------------------
-- 6.3 SCENARIOS policies
-- ---------------------------------------------------------------------------
-- Todos os usuários autenticados podem ler cenários
CREATE POLICY "scenarios_select_authenticated"
  ON public.scenarios FOR SELECT
  TO authenticated
  USING (true);

-- Apenas admin pode criar, editar, deletar cenários
CREATE POLICY "scenarios_insert_admin"
  ON public.scenarios FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "scenarios_update_admin"
  ON public.scenarios FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "scenarios_delete_admin"
  ON public.scenarios FOR DELETE
  USING (public.is_admin());


-- ---------------------------------------------------------------------------
-- 6.4 SCENARIO_VARIANTS policies
-- ---------------------------------------------------------------------------
CREATE POLICY "variants_select_authenticated"
  ON public.scenario_variants FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "variants_insert_admin"
  ON public.scenario_variants FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "variants_update_admin"
  ON public.scenario_variants FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "variants_delete_admin"
  ON public.scenario_variants FOR DELETE
  USING (public.is_admin());


-- ---------------------------------------------------------------------------
-- 6.5 HAND_HISTORY policies
-- ---------------------------------------------------------------------------
-- Usuário lê/escreve apenas o próprio histórico
CREATE POLICY "history_select_own"
  ON public.hand_history FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "history_insert_own"
  ON public.hand_history FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Histórico não pode ser editado após inserido (apenas admin pode)
CREATE POLICY "history_update_admin"
  ON public.hand_history FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "history_delete_admin"
  ON public.hand_history FOR DELETE
  USING (public.is_admin());


-- =============================================================================
-- 7. FUNÇÕES AUXILIARES
-- =============================================================================

-- Invalida todas as sessões anteriores do usuário e cria uma nova
-- Chamar após login bem-sucedido para implementar "um acesso por vez"
CREATE OR REPLACE FUNCTION public.create_session(p_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_session_id uuid;
BEGIN
  -- Invalidar sessões antigas do usuário
  UPDATE public.user_sessions
  SET is_active = false
  WHERE user_id = auth.uid() AND is_active = true;

  -- Criar nova sessão ativa
  INSERT INTO public.user_sessions (user_id, session_token, is_active)
  VALUES (auth.uid(), p_token, true)
  RETURNING id INTO v_session_id;

  RETURN v_session_id;
END;
$$;


-- Verificar se o token de sessão ainda é o token ativo do usuário
-- Retorna true se sessão válida, false se foi substituída (login em outro device)
CREATE OR REPLACE FUNCTION public.validate_session(p_token text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_sessions
    WHERE user_id = auth.uid()
      AND session_token = p_token
      AND is_active = true
  );
$$;


-- Atualizar last_active_at da sessão (heartbeat a cada 30s no cliente)
CREATE OR REPLACE FUNCTION public.ping_session(p_token text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.user_sessions
  SET last_active_at = now()
  WHERE user_id = auth.uid()
    AND session_token = p_token
    AND is_active = true;
END;
$$;


-- =============================================================================
-- 8. VIEW: user_stats
-- Estatísticas agregadas por usuário + cenário (útil para relatórios)
-- =============================================================================
CREATE OR REPLACE VIEW public.user_stats AS
SELECT
  hh.user_id,
  p.full_name,
  hh.scenario_id,
  s.name AS scenario_name,
  COUNT(*)                                        AS total_hands,
  SUM(CASE WHEN hh.is_correct THEN 1 ELSE 0 END) AS correct_hands,
  ROUND(
    100.0 * SUM(CASE WHEN hh.is_correct THEN 1 ELSE 0 END) / COUNT(*), 1
  )                                               AS accuracy_pct,
  AVG(hh.correct_freq)                            AS avg_correct_freq,
  MAX(hh.played_at)                               AS last_played_at
FROM public.hand_history hh
JOIN public.profiles p ON p.id = hh.user_id
LEFT JOIN public.scenarios s ON s.id = hh.scenario_id
GROUP BY hh.user_id, p.full_name, hh.scenario_id, s.name;


-- =============================================================================
-- 9. REALTIME (para multi-login via WebSocket)
-- Habilitar realtime na tabela user_sessions para o cliente detectar
-- quando sua sessão é invalidada em tempo real (sem polling de 30s).
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_sessions;


-- =============================================================================
-- FIM DA MIGRATION V1
-- =============================================================================
-- Próximos passos:
-- 1. Execute seed_users.sql para importar os usuários existentes
-- 2. Execute seed_scenarios.sql para importar os cenários padrão
-- 3. Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
-- =============================================================================
