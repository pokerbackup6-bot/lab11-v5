-- =============================================================================
-- LAB11 — Seed: Cenários do defaultScenarios.ts → banco de dados
-- =============================================================================
-- COMO USAR:
--   Os cenários padrão vivem no arquivo defaultScenarios.ts do frontend.
--   Este script deve ser gerado OU executado via a função de migração abaixo.
--
-- OPÇÃO A (recomendada para produção):
--   Usar a função migrate_scenarios_from_client() que o admin chama
--   uma única vez pela interface após conectar ao Supabase.
--
-- OPÇÃO B (manual):
--   Gerar os INSERTs via script Node.js que lê defaultScenarios.ts.
--   Ver seed_scenarios_generator.mjs abaixo.
-- =============================================================================


-- =============================================================================
-- Função auxiliar: upsert de cenário + suas variantes
-- Chame esta função para cada cenário do defaultScenarios.ts
-- =============================================================================
CREATE OR REPLACE FUNCTION public.upsert_scenario(p_data jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_scenario_id uuid;
  v_variant     jsonb;
  v_sort        integer := 0;
BEGIN
  -- Inserir ou atualizar cenário principal
  INSERT INTO public.scenarios (
    name,
    modality,
    street,
    preflop_action,
    player_count,
    hero_pos,
    opponents,
    stack_bb,
    hero_bet_size,
    opponent_bet_size,
    initial_pot_bb,
    opponent_action,
    board,
    ranges,
    custom_actions,
    description,
    video_link,
    is_system_default,
    created_by
  ) VALUES (
    p_data->>'name',
    p_data->>'modality',
    p_data->>'street',
    COALESCE(p_data->>'preflopAction', ''),
    COALESCE((p_data->>'playerCount')::integer, 9),
    p_data->>'heroPos',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_data->'opponents')), '{}'),
    COALESCE((p_data->>'stackBB')::numeric, 100),
    COALESCE((p_data->>'heroBetSize')::numeric, 0),
    (p_data->>'opponentBetSize')::numeric,
    (p_data->>'initialPotBB')::numeric,
    p_data->>'opponentAction',
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_data->'board')), '{}'),
    COALESCE(p_data->'ranges', '{}'),
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_data->'customActions')), '{}'),
    p_data->>'description',
    p_data->>'videoLink',
    true,  -- is_system_default
    NULL   -- sem created_by para cenários padrão
  )
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_scenario_id;

  -- Se o cenário já existia (ON CONFLICT DO NOTHING retorna NULL), buscar o id
  IF v_scenario_id IS NULL THEN
    SELECT id INTO v_scenario_id
    FROM public.scenarios
    WHERE name = p_data->>'name'
      AND is_system_default = true
    LIMIT 1;
  END IF;

  -- Inserir variantes (se existirem)
  IF p_data->'variants' IS NOT NULL THEN
    -- Remover variantes antigas antes de reinserir
    DELETE FROM public.scenario_variants WHERE scenario_id = v_scenario_id;

    FOR v_variant IN SELECT * FROM jsonb_array_elements(p_data->'variants')
    LOOP
      INSERT INTO public.scenario_variants (
        scenario_id,
        board,
        ranges,
        custom_actions,
        is_duplicate,
        sort_order
      ) VALUES (
        v_scenario_id,
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_variant->'board')), '{}'),
        COALESCE(v_variant->'ranges', '{}'),
        COALESCE(ARRAY(SELECT jsonb_array_elements_text(v_variant->'customActions')), '{}'),
        COALESCE((v_variant->>'isDuplicate')::boolean, false),
        v_sort
      );
      v_sort := v_sort + 1;
    END LOOP;
  END IF;

  RETURN v_scenario_id;
END;
$$;


-- =============================================================================
-- Script gerador: Node.js para converter defaultScenarios.ts → SQL
-- Salvar como seed_scenarios_generator.mjs e executar:
--   node seed_scenarios_generator.mjs > generated_scenarios.sql
-- Depois rodar o generated_scenarios.sql no Supabase SQL Editor.
-- =============================================================================
-- (Conteúdo do arquivo .mjs abaixo — copiar para um arquivo separado)
/*

import { readFileSync } from 'fs';
import { createRequire } from 'module';

// Como defaultScenarios.ts é TypeScript, precisamos transpilá-lo ou
// usar uma versão já compilada. Alternativa: copiar e renomear para .mjs
// removendo as anotações de tipo.

// Após ter a lista de cenários como JSON:
const scenarios = SYSTEM_DEFAULT_SCENARIOS; // importar aqui

const lines = ["-- Generated scenarios seed"];
for (const s of scenarios) {
  const json = JSON.stringify(s).replace(/'/g, "''");
  lines.push(`SELECT public.upsert_scenario('${json}');`);
}

console.log(lines.join('\n'));

*/


-- =============================================================================
-- Alternativa: Migração via código (recomendada para o App.tsx futuro)
-- Quando o app iniciar com Supabase conectado, o admin pode chamar:
--
--   POST /api/admin/seed-scenarios
--   Body: { scenarios: SYSTEM_DEFAULT_SCENARIOS }
--
-- Isso chama upsert_scenario() para cada cenário via supabase RPC:
--   supabase.rpc('upsert_scenario', { p_data: scenario })
-- =============================================================================
