-- =============================================================================
-- LAB11 — Migration v4: Dashboard, Ranking, Courses, Gamification
-- Run this in the Supabase SQL Editor
-- =============================================================================


-- =============================================================================
-- 1. TRAINING_SESSIONS
-- Agrupa mãos de hand_history por sessão. Permite ranking semanal/mensal.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.training_sessions (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scenario_id     uuid REFERENCES public.scenarios(id) ON DELETE SET NULL,
  scenario_name   text,
  started_at      timestamptz NOT NULL DEFAULT now(),
  ended_at        timestamptz,
  duration_seconds integer NOT NULL DEFAULT 0,
  total_hands     integer NOT NULL DEFAULT 0,
  correct_hands   integer NOT NULL DEFAULT 0,
  is_active       boolean NOT NULL DEFAULT true,
  training_mode   text NOT NULL DEFAULT 'normal',      -- 'normal' | 'close'
  goal_type       text NOT NULL DEFAULT 'free',        -- 'hands' | 'time' | 'free'
  goal_value      integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_sessions_user
  ON public.training_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_training_sessions_started
  ON public.training_sessions (user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_training_sessions_active
  ON public.training_sessions (user_id, is_active) WHERE is_active = true;

ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_sessions_select"
  ON public.training_sessions FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "training_sessions_insert"
  ON public.training_sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "training_sessions_update"
  ON public.training_sessions FOR UPDATE
  USING (user_id = auth.uid());


-- =============================================================================
-- 2. USER_STREAKS
-- Rastreia dias consecutivos de treino e recorde.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_streaks (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak    integer NOT NULL DEFAULT 0,
  longest_streak    integer NOT NULL DEFAULT 0,
  last_training_date date,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "streaks_select"
  ON public.user_streaks FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "streaks_insert"
  ON public.user_streaks FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "streaks_update"
  ON public.user_streaks FOR UPDATE
  USING (user_id = auth.uid());


-- =============================================================================
-- 3. USER_BADGES
-- Marcos de gamificação desbloqueados pelo usuário.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.user_badges (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type  text NOT NULL,       -- ex: 'hands_100', 'hands_500', 'streak_7', 'accuracy_90'
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user
  ON public.user_badges (user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_select"
  ON public.user_badges FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "badges_insert"
  ON public.user_badges FOR INSERT
  WITH CHECK (user_id = auth.uid());


-- =============================================================================
-- 4. COURSES
-- Cursos organizados por categoria (estilo Netflix).
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.courses (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         text NOT NULL,
  description   text,
  thumbnail_url text,
  category      text NOT NULL DEFAULT 'Geral',    -- ex: 'Pré-Flop', 'Pós-Flop', 'Fundamentos'
  sort_order    integer NOT NULL DEFAULT 0,
  is_published  boolean NOT NULL DEFAULT false,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER courses_updated_at
  BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courses_select_authenticated"
  ON public.courses FOR SELECT
  TO authenticated
  USING (is_published = true OR public.is_admin());

CREATE POLICY "courses_insert_admin"
  ON public.courses FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "courses_update_admin"
  ON public.courses FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "courses_delete_admin"
  ON public.courses FOR DELETE
  USING (public.is_admin());


-- =============================================================================
-- 5. LESSONS
-- Aulas dentro de um curso. video_url aponta para YouTube ou Drive.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.lessons (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  video_url       text NOT NULL,         -- YouTube ou Google Drive URL
  duration_minutes integer NOT NULL DEFAULT 0,
  sort_order      integer NOT NULL DEFAULT 0,
  is_free         boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER lessons_updated_at
  BEFORE UPDATE ON public.lessons
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE INDEX IF NOT EXISTS idx_lessons_course
  ON public.lessons (course_id, sort_order);

ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lessons_select_authenticated"
  ON public.lessons FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "lessons_insert_admin"
  ON public.lessons FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "lessons_update_admin"
  ON public.lessons FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "lessons_delete_admin"
  ON public.lessons FOR DELETE
  USING (public.is_admin());


-- =============================================================================
-- 6. LESSON_PROGRESS
-- Progresso do aluno por aula.
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  completed       boolean NOT NULL DEFAULT false,
  watched_seconds integer NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user
  ON public.lesson_progress (user_id);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lesson_progress_select"
  ON public.lesson_progress FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "lesson_progress_insert"
  ON public.lesson_progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "lesson_progress_update"
  ON public.lesson_progress FOR UPDATE
  USING (user_id = auth.uid());


-- =============================================================================
-- 7. VIEWS para Ranking
-- =============================================================================

-- Ranking geral (todas as mãos)
CREATE OR REPLACE VIEW public.ranking_all_time AS
SELECT
  p.id AS user_id,
  p.full_name,
  COUNT(hh.id) AS total_hands,
  SUM(CASE WHEN hh.is_correct THEN 1 ELSE 0 END) AS correct_hands,
  CASE WHEN COUNT(hh.id) > 0
    THEN ROUND(100.0 * SUM(CASE WHEN hh.is_correct THEN 1 ELSE 0 END) / COUNT(hh.id), 1)
    ELSE 0
  END AS accuracy_pct
FROM public.profiles p
LEFT JOIN public.hand_history hh ON hh.user_id = p.id
GROUP BY p.id, p.full_name
HAVING COUNT(hh.id) > 0
ORDER BY total_hands DESC;

-- Função para ranking por período (últimos N dias)
CREATE OR REPLACE FUNCTION public.get_ranking_by_period(p_days integer)
RETURNS TABLE (
  user_id     uuid,
  full_name   text,
  total_hands bigint,
  correct_hands bigint,
  accuracy_pct numeric
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    p.id AS user_id,
    p.full_name,
    COUNT(hh.id) AS total_hands,
    SUM(CASE WHEN hh.is_correct THEN 1 ELSE 0 END) AS correct_hands,
    CASE WHEN COUNT(hh.id) > 0
      THEN ROUND(100.0 * SUM(CASE WHEN hh.is_correct THEN 1 ELSE 0 END) / COUNT(hh.id), 1)
      ELSE 0
    END AS accuracy_pct
  FROM public.profiles p
  JOIN public.hand_history hh ON hh.user_id = p.id
  WHERE hh.played_at >= now() - (p_days || ' days')::interval
  GROUP BY p.id, p.full_name
  HAVING COUNT(hh.id) > 0
  ORDER BY total_hands DESC;
$$;

-- Função para stats do dashboard do usuário
CREATE OR REPLACE FUNCTION public.get_user_dashboard_stats(p_user_id uuid)
RETURNS TABLE (
  total_hands        bigint,
  correct_hands      bigint,
  accuracy_pct       numeric,
  total_sessions     bigint,
  total_time_seconds bigint,
  current_streak     integer,
  longest_streak     integer
) LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT
    COALESCE(h.total_hands, 0),
    COALESCE(h.correct_hands, 0),
    COALESCE(h.accuracy_pct, 0),
    COALESCE(s.total_sessions, 0),
    COALESCE(s.total_time, 0),
    COALESCE(st.current_streak, 0),
    COALESCE(st.longest_streak, 0)
  FROM
    (SELECT
      COUNT(*) AS total_hands,
      SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) AS correct_hands,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(100.0 * SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) / COUNT(*), 1)
        ELSE 0
      END AS accuracy_pct
    FROM public.hand_history WHERE user_id = p_user_id) h,
    (SELECT
      COUNT(*) AS total_sessions,
      COALESCE(SUM(duration_seconds), 0) AS total_time
    FROM public.training_sessions WHERE user_id = p_user_id AND is_active = false) s,
    (SELECT
      COALESCE(current_streak, 0) AS current_streak,
      COALESCE(longest_streak, 0) AS longest_streak
    FROM public.user_streaks WHERE user_id = p_user_id) st;
$$;

-- Função para atualizar streak ao finalizar sessão
CREATE OR REPLACE FUNCTION public.update_streak(p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_last_date date;
  v_today     date := CURRENT_DATE;
  v_streak    integer;
  v_longest   integer;
BEGIN
  SELECT last_training_date, current_streak, longest_streak
  INTO v_last_date, v_streak, v_longest
  FROM public.user_streaks
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    INSERT INTO public.user_streaks (user_id, current_streak, longest_streak, last_training_date)
    VALUES (p_user_id, 1, 1, v_today);
    RETURN;
  END IF;

  -- Já treinou hoje
  IF v_last_date = v_today THEN
    RETURN;
  END IF;

  -- Dia consecutivo
  IF v_last_date = v_today - 1 THEN
    v_streak := v_streak + 1;
  ELSE
    v_streak := 1;
  END IF;

  IF v_streak > v_longest THEN
    v_longest := v_streak;
  END IF;

  UPDATE public.user_streaks
  SET current_streak = v_streak,
      longest_streak = v_longest,
      last_training_date = v_today,
      updated_at = now()
  WHERE user_id = p_user_id;
END;
$$;


-- =============================================================================
-- 8. REALTIME para training_sessions
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.training_sessions;


-- =============================================================================
-- FIM DA MIGRATION V4
-- =============================================================================
