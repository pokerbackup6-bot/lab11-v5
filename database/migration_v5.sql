-- =============================================================================
-- LAB11 — Migration v5: Ads & Promotions System
-- Run this in the Supabase SQL Editor
-- =============================================================================

-- =============================================================================
-- 1. ADS — Publicidades / Promoções / Benefícios
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ads (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title           text NOT NULL,
  description     text,
  image_url       text,                -- URL da imagem/banner
  button_text     text,                -- Texto do botão CTA (ex: "Aproveitar")
  button_url      text,                -- Link de destino do botão
  placement       text NOT NULL,       -- 'banner_dashboard' | 'ticker_topbar' | 'sidebar_card' | 'session_report' | 'benefits_page'
  is_active       boolean NOT NULL DEFAULT true,
  priority        integer NOT NULL DEFAULT 0,   -- Maior = aparece primeiro
  bg_color        text,                -- Cor de fundo customizada (hex)
  text_color      text,                -- Cor do texto customizada (hex)
  start_date      timestamptz,         -- Início da veiculação (null = imediato)
  end_date        timestamptz,         -- Fim da veiculação (null = permanente)
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ads_placement ON public.ads (placement, is_active, priority DESC);

CREATE TRIGGER ads_updated_at
  BEFORE UPDATE ON public.ads
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.ads ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem VER ads ativas
CREATE POLICY "ads_select_authenticated"
  ON public.ads FOR SELECT TO authenticated
  USING (true);

-- Apenas admins podem criar/editar/deletar
CREATE POLICY "ads_insert_admin"
  ON public.ads FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "ads_update_admin"
  ON public.ads FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "ads_delete_admin"
  ON public.ads FOR DELETE
  USING (public.is_admin());


-- =============================================================================
-- 2. AD_EVENTS — Métricas de impressões e cliques
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ad_events (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ad_id       uuid NOT NULL REFERENCES public.ads(id) ON DELETE CASCADE,
  user_id     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type  text NOT NULL,        -- 'impression' | 'click'
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_ad ON public.ad_events (ad_id, event_type);
CREATE INDEX IF NOT EXISTS idx_ad_events_created ON public.ad_events (created_at DESC);

ALTER TABLE public.ad_events ENABLE ROW LEVEL SECURITY;

-- Usuários podem inserir seus próprios eventos
CREATE POLICY "ad_events_insert_authenticated"
  ON public.ad_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admins podem ver todos os eventos
CREATE POLICY "ad_events_select_admin"
  ON public.ad_events FOR SELECT
  USING (public.is_admin());


-- =============================================================================
-- 3. VIEW — Métricas agregadas por ad
-- =============================================================================
CREATE OR REPLACE VIEW public.ad_metrics AS
SELECT
  a.id AS ad_id,
  a.title,
  a.placement,
  a.is_active,
  COALESCE(imp.total, 0) AS impressions,
  COALESCE(clk.total, 0) AS clicks,
  CASE WHEN COALESCE(imp.total, 0) > 0
    THEN ROUND(100.0 * COALESCE(clk.total, 0) / imp.total, 2)
    ELSE 0
  END AS ctr_pct,
  COALESCE(clk_7d.total, 0) AS clicks_7d,
  COALESCE(imp_7d.total, 0) AS impressions_7d
FROM public.ads a
LEFT JOIN (
  SELECT ad_id, COUNT(*) AS total FROM public.ad_events WHERE event_type = 'impression' GROUP BY ad_id
) imp ON imp.ad_id = a.id
LEFT JOIN (
  SELECT ad_id, COUNT(*) AS total FROM public.ad_events WHERE event_type = 'click' GROUP BY ad_id
) clk ON clk.ad_id = a.id
LEFT JOIN (
  SELECT ad_id, COUNT(*) AS total FROM public.ad_events WHERE event_type = 'click' AND created_at >= now() - interval '7 days' GROUP BY ad_id
) clk_7d ON clk_7d.ad_id = a.id
LEFT JOIN (
  SELECT ad_id, COUNT(*) AS total FROM public.ad_events WHERE event_type = 'impression' AND created_at >= now() - interval '7 days' GROUP BY ad_id
) imp_7d ON imp_7d.ad_id = a.id;


-- =============================================================================
-- FIM DA MIGRATION V5
-- =============================================================================
