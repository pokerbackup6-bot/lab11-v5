
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, PlayerStatus, TimeBankOption, HandRecord, Scenario, User, TrainingGoal, RangeData, TrainingMode } from './types.ts';
import { buildHandPool, dealOpponentAction } from './utils/pokerUtils.ts';
import { SYSTEM_DEFAULT_SCENARIOS } from './defaultScenarios.ts';
import PlayerSeat from './components/PlayerSeat.tsx';
import Sidebar from './components/Sidebar.tsx';
import StopTrainingModal from './components/StopTrainingModal.tsx';
import SessionReportModal from './components/SessionReportModal.tsx';
import RestartConfirmationModal from './components/RestartConfirmationModal.tsx';
import SpotInfoModal from './components/SpotInfoModal.tsx';
import ConfigModal from './components/ConfigModal.tsx';
import ScenarioCreatorModal from './components/ScenarioCreatorModal.tsx';
import SelectionScreen from './components/SelectionScreen.tsx';
import LoginScreen from './components/LoginScreen.tsx';
import RegisterScreen from './components/RegisterScreen.tsx';
import AdminMemberModal from './components/AdminMemberModal.tsx';
import AdminScreen from './components/AdminScreen.tsx';
import AdminContentManager from './components/AdminContentManager.tsx';
import TrainingSetupScreen from './components/TrainingSetupScreen.tsx';
import ProfileScreen from './components/ProfileScreen.tsx';
import RankingScreen from './components/RankingScreen.tsx';
import HistoryScreen from './components/HistoryScreen.tsx';
import SpotReplayScreen from './components/SpotReplayScreen.tsx';
import DashboardScreen from './components/DashboardScreen.tsx';
import CoursesScreen from './components/CoursesScreen.tsx';
import LessonPlayer from './components/LessonPlayer.tsx';
import AdManager from './components/AdManager.tsx';
import ScenarioVersionHistory from './components/ScenarioVersionHistory.tsx';
import { BenefitsScreen } from './components/AdComponents.tsx';
import { type DeckType, type TableStyle } from './components/ConfigModal.tsx';
import { playDeal, playCorrect, playWrong, playTimeout } from './utils/sounds.ts';
import { supabase } from './utils/supabase.ts';
import { supabaseAdmin } from './utils/supabaseAdmin.ts';

const BIG_BLIND_VALUE = 20;
const SCENARIOS_STORAGE_KEY = 'lab11_scenarios_v1';
const MEMBERS_STORAGE_KEY = 'gto_members';
const USER_STATS_KEY = 'lab11_user_stats';
const SESSION_HISTORY_KEY = 'lab11_session_history';
const TABLE_STYLE_KEY = 'lab11_table_style';

const SUIT_BG_4COLOR: Record<string, string> = { h: '#dc2626', d: '#1d4ed8', c: '#15803d', s: '#111827' };
const SUIT_BORDER_4COLOR: Record<string, string> = { h: '#ef4444', d: '#3b82f6', c: '#22c55e', s: '#374151' };

const persistSessionStats = (email: string, history: HandRecord[]) => {
  if (!email || history.length === 0) return;
  const correct = history.filter(h => h.status === 'correct').length;
  const stored: Record<string, { totalHands: number; correctHands: number }> =
    JSON.parse(localStorage.getItem(USER_STATS_KEY) || '{}');
  const prev = stored[email] || { totalHands: 0, correctHands: 0 };
  stored[email] = {
    totalHands: prev.totalHands + history.length,
    correctHands: prev.correctHands + correct,
  };
  localStorage.setItem(USER_STATS_KEY, JSON.stringify(stored));
};

const persistSessionHistory = (
  email: string,
  scenarioName: string,
  history: HandRecord[],
  durationSeconds: number
) => {
  if (!email || history.length === 0) return;
  const wrongHands = history
    .filter(h => h.status === 'incorrect')
    .map(h => ({ hand: h.cards, action: h.action, correctAction: h.correctAction, isTimeout: h.isTimeout }));
  const record = {
    id: Date.now().toString(),
    email,
    scenarioName,
    date: new Date().toISOString(),
    totalHands: history.length,
    correctHands: history.filter(h => h.status === 'correct').length,
    durationSeconds,
    wrongHands,
  };
  const all: Record<string, typeof record[]> = JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || '{}');
  const userHistory = all[email] || [];
  userHistory.push(record);
  // Keep max 100 sessions per user
  if (userHistory.length > 100) userHistory.splice(0, userHistory.length - 100);
  all[email] = userHistory;
  localStorage.setItem(SESSION_HISTORY_KEY, JSON.stringify(all));
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const isValidUUID = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

// ---------------------------------------------------------------------------
// Mapeamento Scenario (camelCase) ↔ DB (snake_case)
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Snapshot: salva estado completo do cenário antes de qualquer modificação
// ---------------------------------------------------------------------------
const createScenarioSnapshot = async (
  scenarioId: string,
  scenarioData: Record<string, any>,
  variantsData: any[],
  action: 'update' | 'delete' | 'migrate' | 'bulk_replace',
  description?: string,
  userId?: string,
) => {
  const { error } = await supabaseAdmin.from('scenario_snapshots').insert({
    scenario_id: scenarioId,
    scenario_name: scenarioData.name || 'Sem nome',
    scenario_data: scenarioData,
    variants_data: variantsData,
    action,
    description: description || `${action} — ${scenarioData.name}`,
    version: scenarioData.version || 1,
    created_by: userId || null,
  });
  if (error) console.warn('[Snapshot] Erro ao criar snapshot:', error.message);
  return !error;
};

const createBulkSnapshot = async (
  scenarios: Array<{ scenario: Record<string, any>; variants: any[] }>,
  action: 'migrate' | 'bulk_replace',
  description: string,
  userId?: string,
) => {
  const rows = scenarios.map(({ scenario, variants }) => ({
    scenario_id: scenario.id || '00000000-0000-0000-0000-000000000000',
    scenario_name: scenario.name || 'Sem nome',
    scenario_data: scenario,
    variants_data: variants,
    action,
    description,
    version: scenario.version || 1,
    created_by: userId || null,
  }));
  const { error } = await supabaseAdmin.from('scenario_snapshots').insert(rows);
  if (error) console.warn('[Snapshot] Erro ao criar snapshots em lote:', error.message);
  return !error;
};

const scenarioToDb = (s: Scenario, isDefault = false) => {
  const base: Record<string, any> = {
    name: s.name,
    description: s.description ?? null,
    video_link: s.videoLink ?? null,
    modality: s.modality,
    street: s.street,
    preflop_action: s.preflopAction ?? '',
    player_count: s.playerCount,
    hero_pos: s.heroPos,
    opponents: s.opponents ?? [],
    stack_bb: s.stackBB,
    hero_bet_size: s.heroBetSize,
    opponent_bet_size: s.opponentBetSize ?? null,
    initial_pot_bb: s.initialPotBB ?? null,
    opponent_action: s.opponentAction ?? null,
    board: s.board ?? [],
    ranges: s.ranges ?? {},
    custom_actions: s.customActions ?? [],
    is_system_default: isDefault,
    is_published: s.isPublished ?? true,
  };
  // Só envia colunas de opponent ranges se a migration v7 já foi aplicada (dados existem)
  if (s.opponentRanges && Object.keys(s.opponentRanges).length > 0) {
    base.opponent_ranges = s.opponentRanges;
    base.opponent_actions = s.opponentActions ?? [];
    base.hero_ranges_by_action = s.heroRangesByAction ?? null;
  }
  return base;
};

const dbToScenario = (row: any): Scenario => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  videoLink: row.video_link ?? undefined,
  modality: row.modality,
  street: row.street,
  preflopAction: row.preflop_action ?? '',
  playerCount: row.player_count,
  heroPos: row.hero_pos,
  opponents: row.opponents ?? [],
  stackBB: parseFloat(row.stack_bb),
  heroBetSize: parseFloat(row.hero_bet_size),
  opponentBetSize: row.opponent_bet_size != null ? parseFloat(row.opponent_bet_size) : undefined,
  initialPotBB: row.initial_pot_bb != null ? parseFloat(row.initial_pot_bb) : undefined,
  opponentAction: row.opponent_action ?? undefined,
  board: row.board ?? [],
  ranges: row.ranges ?? {},
  customActions: row.custom_actions ?? [],
  isPublished: row.is_published ?? true,
  opponentRanges: row.opponent_ranges ?? undefined,
  opponentActions: row.opponent_actions ?? undefined,
  heroRangesByAction: row.hero_ranges_by_action ?? undefined,
  variants: row.scenario_variants
    ?.sort((a: any, b: any) => a.sort_order - b.sort_order)
    .map((v: any) => ({
      id: v.id,
      board: v.board ?? [],
      ranges: v.ranges ?? {},
      customActions: v.custom_actions ?? [],
      isDuplicate: v.is_duplicate ?? false,
      opponentRanges: v.opponent_ranges ?? undefined,
      opponentActions: v.opponent_actions ?? undefined,
      heroRangesByAction: v.hero_ranges_by_action ?? undefined,
    })),
});

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['c', 'd', 'h', 's'];

const getSuitSymbol = (suitChar: string) => {
  switch (suitChar?.toLowerCase()) {
    case 'c': return '♣';
    case 'd': return '♦';
    case 'h': return '♥';
    case 's': return '♠';
    default: return suitChar;
  }
};

const getSuitColor = (suitChar: string) => {
  switch (suitChar?.toLowerCase()) {
    case 'c': return 'text-green-600';
    case 'd': return 'text-blue-600';
    case 'h': return 'text-red-600';
    case 's': return 'text-black';
    default: return 'text-black';
  }
};

const getTablePositions = (count: number) => {
  if (count === 2) return ['SB', 'BB'];
  if (count <= 4) return ['CO', 'BTN', 'SB', 'BB'];
  if (count <= 6) return ['BTN', 'SB', 'BB', 'LJ', 'HJ', 'CO'];
  return ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'];
};

const getPreflopOrder = (count: number) => {
  if (count === 2) return ['SB', 'BB'];
  if (count <= 4) return ['CO', 'BTN', 'SB', 'BB'];
  if (count <= 6) return ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  return ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
};

const CUSTOM_PALETTE = [
  '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6',
];

const getActionColor = (label: string, index: number): string => {
  const l = label.toLowerCase();
  if (l.includes('fold')) return '#334155';
  if (l.includes('call') || l.includes('pagar') || l === 'limp' || l === 'check') return '#0ea5e9';
  
  // Ações de aposta específicas (cores da paleta para variedade visual)
  if (l.includes('baixo')) return '#84cc16'; // Lime (30%)
  if (l.includes('médio') || l.includes('medio')) return '#f59e0b'; // Amber (50%)
  if (l.includes('alto')) return '#f97316'; // Orange (80%)
  if (l.includes('overbet')) return '#ec4899'; // Pink (125%)
  
  // Ações de aposta/aumento padrão são verdes
  if (l === 'raise' || l === 'rfi' || l === 'bet' || l.includes('3-bet') || l.includes('4-bet') || l.includes('aumentar') || l.includes('iso')) return '#10b981';
  if (l.includes('all-in') || l.includes('shove')) return '#ef4444';
  
  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
};

const generateCardsFromKey = (key: string, excludeCards?: Set<string>): string[] => {
  const excluded = excludeCards || new Set<string>();
  const maxRetries = 50;

  if (key.length === 4) return [key.substring(0, 2), key.substring(2, 4)];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let c1: string, c2: string;

    if (key.length === 2 && key[0] === key[1]) {
      const rank = key[0];
      const s1 = SUITS[Math.floor(Math.random() * SUITS.length)];
      let s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
      while (s1 === s2) s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
      c1 = rank + s1; c2 = rank + s2;
    } else if (key.endsWith('s')) {
      const r1 = key[0]; const r2 = key[1];
      const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
      c1 = r1 + suit; c2 = r2 + suit;
    } else if (key.endsWith('o')) {
      const r1 = key[0]; const r2 = key[1];
      const s1 = SUITS[Math.floor(Math.random() * SUITS.length)];
      let s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
      while (s1 === s2) s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
      c1 = r1 + s1; c2 = r2 + s2;
    } else {
      return ['As', 'Ad'];
    }

    if (!excluded.has(c1) && !excluded.has(c2)) return [c1, c2];
  }

  // Fallback
  if (key.length === 2 && key[0] === key[1]) return [key[0] + 'h', key[0] + 'd'];
  if (key.endsWith('s')) return [key[0] + 'h', key[1] + 'h'];
  return [key[0] + 'h', key[1] + 'd'];
};

const getActiveHandsFromRange = (ranges: RangeData): string[] => {
  return Object.keys(ranges).filter(key => {
    const frequencies = ranges[key];
    const totalFreq = Object.values(frequencies).reduce((sum, f) => sum + (f as number), 0);
    return totalFreq > 0;
  });
};

const SYSTEM_DEFAULT_MEMBERS: User[] = [
  { "name": "ADMIN LAB11", "email": "gabrielfmacedo@ymail.com", "password": "admin", "isAdmin": true, "mustChangePassword": false, "hasMultiLoginAttempt": true },
  { "name": "USER ADMIN", "email": "pokerbackup6@gmail.com", "password": "admin", "isAdmin": true, "mustChangePassword": false, "hasMultiLoginAttempt": true },
  { "name": "GABRIEL POKER", "email": "gabrielfpoker@gmail.com", "password": "poker", "isAdmin": false, "mustChangePassword": false, "hasMultiLoginAttempt": true },
  { "name": "TESTE", "email": "gabrizum@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "SUPORTE GRINDERSTYLE", "email": "suporte@grinderstyle.com.br", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "CSTREINADOR", "email": "cstreinador@icloud.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FREITAS.HN", "email": "freitas.hn@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "EVALDODDIAS", "email": "evaldoddias@yahoo.com.br", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "IAMINTREPIDUS", "email": "iamintrepidus@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FROTABF", "email": "frotabf@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "IAFRATE", "email": "iafrate@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "RRCOUTINHO", "email": "rrcoutinho@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "HANIO_2", "email": "hanio_2@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LEO_GALANTE97", "email": "leo_galante97@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "VICTORMOSHE", "email": "victormoshe@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MAILSONCX", "email": "mailsoncx@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "GILBERTOCGPB22", "email": "gilbertocgpb22@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FMANGABEIRA72", "email": "fmangabeira72@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "WAGNERPEDROSALEMOS", "email": "wagnerpedrosalemos@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "NUNESPOKERPLAYER", "email": "nunespokerplayer@outlook.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "BAMBINADO", "email": "bambinado@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "PEDROCARVALHO.SOUSA95", "email": "pedrocarvalho.sousa95@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "CARLOSDUARDO", "email": "carlosduardo@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "PTOBICH", "email": "ptobich@uol.com.br", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "OLIVEIRALUCILIO29", "email": "oliveiralucilio29@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "CADASTROS.MATEUSMAGALHAES", "email": "cadastros.mateusmagalhaes@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FASOLOTIAGOEDF", "email": "fasolotiagoedf@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "DANIELFAR2010", "email": "danielfar2010@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "CLAUDIOROBERTOFRAGA", "email": "claudiorobertofraga@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FERREIRALUAN767", "email": "ferreiraluan767@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FABIANOMAC", "email": "fabianomac@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MARGILLABBRANDAO", "email": "margillabrandao@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "EDUARDO PONTA", "email": "eduardoponta@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "DANILO HENRIQUE", "email": "danilo.henriqueg013@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "EMANUEL NETO", "email": "emanuelneto92@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LEOM", "email": "leom.250396@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "DAGOBERTO JR", "email": "dagoberto.leocadiojunior@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "JEAN VALENTIM", "email": "jeanvalentim.jv@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MARCOS MUSTANG", "email": "marcosmustang87@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "BAETADANN", "email": "baetadann@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "RAFAEL CAMPOS", "email": "camposmellorafael@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "M. INES CARDOSO", "email": "m.ines.cardoso@sapo.pt", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "PEDRO PERRINI", "email": "pedroperrini@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MVSSBA", "email": "mvssba@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "CASSIO MORADILLO", "email": "cassiomoradillo@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LYRION MATHEUS", "email": "lyrionmatheus@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "TIKO VINICIUS", "email": "tikovinicius@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "RENATO BON", "email": "renato.bon87@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "TULIO MOEHLECKE", "email": "tulio_moehlecke@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "ALEXSANDRO ALBRECHT", "email": "alexsandroalbrecht@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "ZEQUINHA", "email": "zequinha@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "PHILLIP FAULHABER", "email": "phillipfaulhabercrf@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MARIAH ANGIE", "email": "mariah.angie@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "KRISTHIANO", "email": "kristhiano@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LUCAS TS", "email": "lucas88.ts@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MARCIO OLIVEIRA", "email": "fmarciooliveira@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "CAROLINE R", "email": "dracaroliner@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "NILSON SILVA", "email": "nilsonsilva2@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "JULIO ANTUALPA", "email": "julioantualpa@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FELIPE CEZAR", "email": "felipecezarsilva13@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "DANILLO DIAZ", "email": "danillodiaz@outlook.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "GUILHERME ASTORRE", "email": "guilhermeastorrevieira@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "GABRIEL SKRIVA", "email": "gabrielskriva@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "HIQUE 2010", "email": "hique2010@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "DIOGO ZAMAGNA", "email": "diogozamagna@sapo.pt", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "THIAGO HAGGE", "email": "thiagohagge09@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FILIPE SBS", "email": "filipesbs@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "ISPERA LUISIO", "email": "isperaluisio@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "PABLO VIANA", "email": "pablovianadias@yahoo.com.br", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MENDES DA SILVA", "email": "D.mendesdasilva11@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "THIAGO SILVA 02", "email": "dasilvath02@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "BRUNO DELFINO", "email": "delfinobruno.cps@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "ALEX OLIVEIRA", "email": "alexoliveira.lelex1212@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "GIANICHINI", "email": "gianichini01@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "ELCIO", "email": "elcio6565@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "EVALDO DIAS", "email": "evaldoddias@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LUANA DAMASCENO", "email": "luanadamasceno@id.uff.br", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "DENIS MARQUES", "email": "denismarques268@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LUCIO JOGOS", "email": "luciojogos2019@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "BRANDAOBZ21", "email": "brandaobz21@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "GILMAR JUNIOR", "email": "gilmarjunior36@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FBFRAGA", "email": "drfbfraga@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "SOLDIGITALL", "email": "soldigitalll@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "RENATO CURTY", "email": "renato.curty@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "TONY UNIKA", "email": "tony.unika@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MUNARETTO ADVOGADO", "email": "munarettoadvogado@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "DRICA PINOTTI", "email": "dricapinotti@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "BNOTORIUS08", "email": "bnotorius08@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "ROD SHINKADO", "email": "rodshinkado@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "ARLEN S", "email": "arlen-s@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FABIANA UETI", "email": "fabianaueti@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "JEAN LUCAS", "email": "jeanlucas.g@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "ALVES JJ", "email": "alves.jj8012554@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "DANTE DRAGO", "email": "dantedrago@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MAYCON BKL", "email": "mayconbkl@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MURILO MATHEUS", "email": "murilomatheusrafaela@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MIGUEL PIAYA", "email": "miguelpiaya@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "TIAGO MDRT", "email": "tiagomdrt@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "RENATO SIQUEIRA", "email": "renato.siqueira@live.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FERNANDO RAFAEL", "email": "fernandorafaelteodoro@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "MARCOS NERES", "email": "marcosneres9@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "KIBO IMPORTACAO", "email": "kiboimportacao@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "PEDRO AGT", "email": "pedroagt10@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "NS MASCARENHAS", "email": "nsmascarenhas@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "ELISBAR 98", "email": "Elisbar_98@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "FELIPE BARBOSA", "email": "felipebarbosa.docs@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "THIAGO SILVA 26", "email": "dasilvath26@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "GABRIEL JELENSKI", "email": "gabrieljelenski@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "CARLOS PAES", "email": "carlospaes859@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "VRUANO", "email": "vruano84@yahoo.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "GABRIEL MOUSINHO", "email": "gabrielmmousinho@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "AMOS JP", "email": "amos_jp3@yahoo.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LEVI PRADO", "email": "pradomilionario@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "OSVALDO AMARO", "email": "osvaldo.amaro646@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LUIZ MILANI", "email": "luiz.h.milani@hotmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "CARLOS PAES", "email": "carlospaes859@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LUAN FERREIRA", "email": "ferreiraluan767@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
  { "name": "LUCAS SOUZA", "email": "lucas02.ssouza@gmail.com", "password": "poker2026", "mustChangePassword": false, "isAdmin": false, "hasMultiLoginAttempt": false },
];


const SupportButton = () => (
  <div className="fixed bottom-8 right-8 z-[999] group">
    <div className="absolute bottom-full right-0 mb-4 opacity-0 group-hover:opacity-100 transition-all pointer-events-none translate-y-2 group-hover:translate-y-0">
      <div className="bg-[#1a1a1a] text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 rounded-xl border border-white/10 shadow-2xl whitespace-nowrap">
        Suporte WhatsApp
      </div>
      <div className="w-2 h-2 bg-[#1a1a1a] border-r border-b border-white/10 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
    </div>
    
    <a
      href="https://wa.me/5521990970439?text=Oi%2C%20vim%20da%20plataforma%20Lab11%20e%20preciso%20de%20ajuda."
      target="_blank"
      rel="noopener noreferrer"
      className="w-12 h-12 bg-[#25D366] hover:bg-[#20ba5a] text-white rounded-full shadow-[0_10px_30px_rgba(37,211,102,0.4)] transition-all hover:scale-110 active:scale-95 flex items-center justify-center border border-white/20"
      aria-label="Suporte via WhatsApp"
    >
      <span className="text-2xl font-black leading-none mt-[-2px]">?</span>
    </a>
  </div>
);

const ForceChangePassword: React.FC<{ onChanged: () => void; onLogout: () => void }> = ({ onChanged, onLogout }) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPass.length < 6) { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
    if (newPass !== confirmPass) { setError('As senhas não coincidem.'); return; }
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password: newPass });
    if (updateError) { setError(updateError.message); setLoading(false); return; }
    onChanged();
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 animate-in fade-in duration-700">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center bg-sky-500/10 border border-sky-500/20">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-sky-400">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">Criar Nova Senha</h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            Bem-vindo ao LAB11! Por segurança, crie uma senha pessoal para continuar.
          </p>
        </div>

        <div className="bg-[#0f0f0f] border border-white/5 rounded-[40px] p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-[60px] rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Nova Senha</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700 shadow-inner disabled:opacity-50"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] text-gray-500 font-black uppercase tracking-widest px-1">Confirmar Senha</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                placeholder="Repita a nova senha"
                disabled={loading}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-white text-sm font-bold outline-none focus:border-sky-500/50 transition-all placeholder:text-gray-700 shadow-inner disabled:opacity-50"
              />
            </div>
            {error && (
              <div className="text-red-500 text-[10px] font-black uppercase tracking-widest text-center">{error}</div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] text-white transition-all shadow-[0_10px_30px_rgba(14,165,233,0.3)] active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Salvando...' : 'Definir Senha e Entrar'}
            </button>
          </form>
          <button
            onClick={onLogout}
            className="w-full mt-4 text-[10px] text-gray-600 hover:text-gray-400 font-black uppercase tracking-widest transition-colors text-center"
          >
            Sair
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [blockReason, setBlockReason] = useState<'inactive' | 'overdue' | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [multiLoginError, setMultiLoginError] = useState(false);

  const [currentView, setCurrentView] = useState<'dashboard' | 'selection' | 'setup' | 'trainer' | 'admin' | 'admin-content' | 'profile' | 'ranking' | 'history' | 'spot-replay' | 'courses' | 'lesson-player' | 'benefits'>('dashboard');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [activeLessonData, setActiveLessonData] = useState<{ lesson: any; course: any } | null>(null);
  const [selectionFilter, setSelectionFilter] = useState<string | undefined>(undefined);

  const [scenarios, setScenarios] = useState<Scenario[]>(SYSTEM_DEFAULT_SCENARIOS);
  const [scenariosLoading, setScenariosLoading] = useState(false);

  const fetchScenarios = async () => {
    setScenariosLoading(true);
    const { data } = await supabaseAdmin
      .from('scenarios')
      .select('*, scenario_variants(*)')
      .order('created_at', { ascending: true });
    if (data && data.length > 0) setScenarios(data.map(dbToScenario));
    setScenariosLoading(false);
  };

  // One-time cleanup: Delete all existing FLOP scenarios while keeping PREFLOP ones
  useEffect(() => {
    // Cleanup script removed to allow loading post-flop scenarios.
  }, []);

  const [activeScenario, setActiveScenario] = useState<Scenario | null>(null);
  const [trainingGoal, setTrainingGoal] = useState<TrainingGoal | null>(null);
  const [sessionElapsedSeconds, setSessionElapsedSeconds] = useState(0);

  const [players, setPlayers] = useState<Player[]>([]);
  const [board, setBoard] = useState<string[]>([]);
  const [currentHandKey, setCurrentHandKey] = useState<string | null>(null);
  const [currentRanges, setCurrentRanges] = useState<RangeData | null>(null);
  const [currentCustomActions, setCurrentCustomActions] = useState<string[]>([]);
  const [currentOpponentAction, setCurrentOpponentAction] = useState<string | null>(null);
  const [currentOpponentHandKey, setCurrentOpponentHandKey] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarPinned, setSidebarPinned] = useState(() => localStorage.getItem('gto_sidebar_pinned') === 'true');
  const [isFocusMode, setIsFocusMode] = useState(false);

  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('lab11_sound_enabled') !== 'false');
  const soundEnabledRef = useRef(soundEnabled);
  useEffect(() => {
    soundEnabledRef.current = soundEnabled;
    localStorage.setItem('lab11_sound_enabled', String(soundEnabled));
  }, [soundEnabled]);

  const [deckType, setDeckType] = useState<DeckType>(
    () => (localStorage.getItem('lab11_deck_type') as DeckType) || 'standard'
  );
  useEffect(() => {
    localStorage.setItem('lab11_deck_type', deckType);
  }, [deckType]);

  const [tableStyle, setTableStyle] = useState<TableStyle>(
    () => (localStorage.getItem(TABLE_STYLE_KEY) as TableStyle) || 'classic'
  );
  useEffect(() => {
    localStorage.setItem(TABLE_STYLE_KEY, tableStyle);
  }, [tableStyle]);

  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect' | 'timeout'>('idle');
  const [correctFreq, setCorrectFreq] = useState<number>(0);
  const [currentPot, setCurrentPot] = useState(0);
  
  const [handHistory, setHandHistory] = useState<HandRecord[]>([]);
  const handPoolRef = useRef<any[]>([]);
  const recentHandKeysRef = useRef<string[]>([]);
  const trainingGoalRef = useRef<TrainingGoal | null>(null);
  const currentUserIdRef = useRef<string>('');
  const trainingSessionIdRef = useRef<string>('');
  useEffect(() => { trainingGoalRef.current = trainingGoal; }, [trainingGoal]);
  const statsSavedRef = useRef(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showRestartModal, setShowRestartModal] = useState(false);
  const [showSpotInfoModal, setShowSpotInfoModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showScenarioCreatorModal, setShowScenarioCreatorModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showAdminMemberModal, setShowAdminMemberModal] = useState(false);

  const [timeBankSetting, setTimeBankSetting] = useState<TimeBankOption>('OFF');
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const timerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const sessionTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (currentView === 'trainer' && !showReportModal && !showStopModal) {
      sessionTimerRef.current = window.setInterval(() => setSessionElapsedSeconds(prev => prev + 1), 1000);
    } else {
      if (sessionTimerRef.current) { clearInterval(sessionTimerRef.current); sessionTimerRef.current = null; }
    }
    return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
  }, [currentView, showReportModal, showStopModal]);

  useEffect(() => {
    if (!trainingGoal || currentView !== 'trainer' || showReportModal) return;
    const goalReached =
      (trainingGoal.type === 'hands' && handHistory.length >= trainingGoal.value) ||
      (trainingGoal.type === 'time' && sessionElapsedSeconds >= trainingGoal.value * 60);
    if (goalReached) {
      if (!statsSavedRef.current) {
        statsSavedRef.current = true;
        if (currentUser) {
          persistSessionStats(currentUser, handHistory);
          persistSessionHistory(currentUser, activeScenario?.name ?? 'Treino', handHistory, sessionElapsedSeconds);
        }
        finalizeTrainingSession();
      }
      setShowReportModal(true);
    }
  }, [handHistory.length, sessionElapsedSeconds, trainingGoal, currentView, showReportModal]);

  // Supabase Auth: restaurar sessão ao carregar + escutar mudanças de auth
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('is_admin, is_active, full_name, subscription_status, access_expires_at, must_change_password')
          .eq('id', session.user.id)
          .single();
        setCurrentUser(session.user.email!);
        currentUserIdRef.current = session.user.id;
        setCurrentUserName(profile?.full_name ?? '');
        setIsAdmin(profile?.is_admin ?? false);
        setMustChangePassword(profile?.must_change_password ?? false);

        // Check access: auto-block if access_expires_at has passed
        let active = profile?.is_active ?? false;
        let reason: 'inactive' | 'overdue' | null = null;
        if (active && profile?.access_expires_at) {
          const expiresAt = new Date(profile.access_expires_at);
          if (expiresAt < new Date()) {
            active = false;
            reason = profile?.subscription_status === 'overdue' ? 'overdue' : 'inactive';
            // Auto-deactivate in DB
            supabaseAdmin.from('profiles').update({ is_active: false }).eq('id', session.user.id);
          }
        }
        if (!active && !reason && profile?.subscription_status === 'overdue') {
          reason = 'overdue';
        }
        if (!active && !reason) {
          reason = 'inactive';
        }

        setIsActive(active);
        setBlockReason(active ? null : reason);
        setIsAuthenticated(true);
        fetchScenarios();
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setCurrentUserName('');
        setIsAdmin(false);
        setIsActive(false);
        setCurrentView('dashboard');
        setAuthView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width < 1024;
      setIsMobile(mobile);
      if (mobile) {
        setSidebarOpen(false);
        setIsFocusMode(false);
      } else if (sidebarPinned && !isFocusMode) {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [sidebarPinned, isFocusMode]);

  const handleToggleSidebarPin = () => {
    const newVal = !sidebarPinned;
    setSidebarPinned(newVal);
    localStorage.setItem('gto_sidebar_pinned', String(newVal));
    if (newVal) setSidebarOpen(true);
  };

  const resetToNewHand = useCallback(() => {
    if (!activeScenario) return;

    // Se o pool estiver vazio, reconstruímos com shuffle estratificado + cobertura de ações
    if (handPoolRef.current.length === 0) {
      const mode: TrainingMode = trainingGoalRef.current?.mode ?? 'normal';
      const newPool = buildHandPool(activeScenario, mode, recentHandKeysRef.current);

      if (newPool.length === 0) {
        console.error("Cenário sem mãos ativas:", activeScenario.name);
        setCurrentView('selection');
        return;
      }

      handPoolRef.current = newPool;
    }

    // Pega a próxima mão do pool (shift = começa pelo início, onde a interleaving é balanceada)
    let nextItem = handPoolRef.current.shift();
    if (!nextItem) {
      // Se por algum motivo o pool estiver vazio após o refil, tentamos novamente
      resetToNewHand();
      return;
    }

    let { variantId, handKey } = nextItem;

    // Track recent keys (last 3) for anti-repeat at next cycle boundary
    recentHandKeysRef.current = [...recentHandKeysRef.current.slice(-2), handKey];

    let effectiveBoard = activeScenario.board || [];
    let effectiveRanges = activeScenario.ranges;
    let effectiveActions = activeScenario.customActions || ['Fold', 'Call', 'Raise', 'All-In'];

    // Se a mão pertence a uma variante, usamos os dados dessa variante
    if (variantId && activeScenario.variants) {
      const variant = activeScenario.variants.find(v => v.id === variantId);
      if (variant) {
        effectiveBoard = variant.board;
        effectiveRanges = variant.ranges;
        if (variant.customActions && variant.customActions.length > 0) {
          effectiveActions = variant.customActions;
        }
      }
    }

    const isPostFlop = activeScenario.street !== 'PREFLOP';

    // Garante que sempre teremos um flop se for post-flop
    if (isPostFlop && (!effectiveBoard || effectiveBoard.length < 3)) {
      console.warn("Mão ignorada: Flop inválido para cenário post-flop.");
      // Se não tem flop, tentamos a próxima mão do pool
      if (handPoolRef.current.length > 0) {
        // Usamos um setTimeout para evitar estouro de pilha em caso de muitos erros seguidos
        setTimeout(() => resetToNewHand(), 0);
      } else {
        // Se o pool acabou e nenhum tinha flop, paramos para evitar loop infinito
        console.error("Nenhuma variante com flop válido encontrada.");
        setCurrentView('selection');
      }
      return;
    }

    // -----------------------------------------------------------------------
    // Opponent Ranges: determinar ação dinâmica do oponente
    // -----------------------------------------------------------------------
    const variant = (variantId && activeScenario.variants)
      ? activeScenario.variants.find(v => v.id === variantId) : null;

    const effectiveOpponentRanges = variant?.opponentRanges || activeScenario.opponentRanges;
    const effectiveHeroRangesByAction = variant?.heroRangesByAction || activeScenario.heroRangesByAction;
    const hasOpponentRanges = effectiveOpponentRanges && effectiveHeroRangesByAction
      && Object.keys(effectiveOpponentRanges).length > 0
      && Object.keys(effectiveHeroRangesByAction).length > 0;

    let resolvedOpponentAction: string | null = null;
    let resolvedOpponentHandKey: string | null = null;
    let heroRangeForAction: RangeData = effectiveRanges;
    let heroActionsForAction: string[] = effectiveActions;
    const excludedCards = new Set<string>();

    if (hasOpponentRanges) {
      // 1. Sorteia mão do oponente e determina ação
      const oppResult = dealOpponentAction(effectiveOpponentRanges);
      if (!oppResult) {
        console.warn('[Opponent Range] Nenhuma mão ativa no range do oponente.');
        // Fallback: usa lógica padrão (ação fixa)
      } else {
        resolvedOpponentAction = oppResult.action;
        resolvedOpponentHandKey = oppResult.handKey;

        // 2. Seleciona range do hero para essa ação do oponente
        const heroRange = effectiveHeroRangesByAction[oppResult.action];
        if (heroRange && Object.keys(heroRange).length > 0) {
          heroRangeForAction = heroRange;
          effectiveRanges = heroRange;

          // 3. Gera cartas do oponente (para exclusão de conflito)
          const oppCards = generateCardsFromKey(oppResult.handKey);
          oppCards.forEach(c => excludedCards.add(c));

          // Adiciona board ao set de exclusão
          if (isPostFlop && effectiveBoard) {
            effectiveBoard.forEach(c => { if (c) excludedCards.add(c); });
          }

          // 4. Seleciona mão do hero do range correspondente
          const activeHeroHands = getActiveHandsFromRange(heroRange);
          if (activeHeroHands.length > 0) {
            handKey = activeHeroHands[Math.floor(Math.random() * activeHeroHands.length)];
          }

          // 5. Ações do hero para esta ação do oponente
          const oppActionsConfig = variant?.opponentActions || activeScenario.opponentActions;
          // As custom actions do hero vêm das chaves do heroRange (as ações definidas no range)
          const heroActionKeys = new Set<string>();
          Object.values(heroRange).forEach(freq => {
            Object.keys(freq).forEach(a => heroActionKeys.add(a));
          });
          if (heroActionKeys.size > 0) {
            heroActionsForAction = Array.from(heroActionKeys);
          }
        } else {
          // Sem range do hero para esta ação — fallback para range padrão
          resolvedOpponentAction = null;
        }
      }
    }

    setCurrentOpponentAction(resolvedOpponentAction);
    setCurrentOpponentHandKey(resolvedOpponentHandKey);
    setCurrentHandKey(handKey);
    setCurrentRanges(effectiveRanges);
    setCurrentCustomActions(heroActionsForAction);

    const heroCards = generateCardsFromKey(handKey, excludedCards.size > 0 ? excludedCards : undefined);

    const count = activeScenario.playerCount;
    const tablePositions = getTablePositions(count);
    const preflopOrder = getPreflopOrder(count);

    setBoard(isPostFlop ? effectiveBoard : []);

    let totalPot = 0;
    const heroOrderIndex = preflopOrder.indexOf(activeScenario.heroPos);

    const isIsoAction = activeScenario.preflopAction.toLowerCase() === 'iso';
    const opponentBetVal = activeScenario.opponentBetSize || 0;
    // Para opponent ranges dinâmicos, extrair o tamanho do bet da ação
    const dynamicOpponentBetVal = resolvedOpponentAction
      ? (() => { const m = resolvedOpponentAction!.match(/(\d+\.?\d*)/); return m ? parseFloat(m[0]) : opponentBetVal; })()
      : opponentBetVal;

    const scenarioPlayers: Player[] = tablePositions.map((posName, i) => {
      const isHero = posName === activeScenario.heroPos;
      const isOpponent = activeScenario.opponents.includes(posName);
      const orderIndex = preflopOrder.indexOf(posName);

      let status = PlayerStatus.IDLE;
      let betAmount = 0;
      let hasCards = false;
      let lastAction: string | undefined = undefined;

      if (isPostFlop) {
        if (isHero || isOpponent) hasCards = true;
        else status = PlayerStatus.FOLDED;

        if (isHero) status = PlayerStatus.ACTING;

        if (isOpponent) {
          const oppAction = resolvedOpponentAction || activeScenario.opponentAction;
          if (oppAction) lastAction = oppAction.toUpperCase();
        }

        betAmount = 0;
      } else {
        if (isIsoAction && isOpponent) {
          betAmount = BIG_BLIND_VALUE;
          status = PlayerStatus.IDLE;
          hasCards = true;
        }
        else if (!isIsoAction && isOpponent && activeScenario.opponents[0] === posName) {
          const betVal = resolvedOpponentAction ? dynamicOpponentBetVal : opponentBetVal;
          if (betVal > 0) {
            betAmount = betVal * BIG_BLIND_VALUE;
            status = PlayerStatus.IDLE;
            hasCards = true;
          }
          // Mostra ação dinâmica do oponente no preflop
          if (resolvedOpponentAction) {
            lastAction = resolvedOpponentAction.toUpperCase();
          }
        }

        if (orderIndex < heroOrderIndex && orderIndex !== -1) {
          if (!isOpponent) status = PlayerStatus.FOLDED;
        } else if (isHero) {
          status = PlayerStatus.ACTING;
          hasCards = true;
        } else if (orderIndex > heroOrderIndex) {
          hasCards = true;
        }

        if (posName === 'SB') { betAmount = Math.max(betAmount, BIG_BLIND_VALUE / 2); }
        else if (posName === 'BB') { betAmount = Math.max(betAmount, BIG_BLIND_VALUE); }
      }

      totalPot += betAmount;

      const isDealer = count === 2 ? posName === 'SB' : posName === 'BTN';

      return {
        id: i + 1,
        name: `PLAYER_${i + 1}`,
        chips: (Number(activeScenario.stackBB) * Number(BIG_BLIND_VALUE)) - (isPostFlop ? 0 : Number(betAmount)),
        positionName: posName,
        status: status,
        betAmount: betAmount,
        lastAction: lastAction,
        cards: isHero ? heroCards : (hasCards ? ['BACK', 'BACK'] : undefined),
        isDealer: isDealer
      };
    });

    // Se for Post-Flop, precisamos definir um pote inicial se não houver apostas na mesa
    if (isPostFlop) {
      // Usa o valor configurado no cenário ou 5.5 BB como padrão
      totalPot = (activeScenario.initialPotBB || 5.5) * BIG_BLIND_VALUE;
    }

    setPlayers(scenarioPlayers);
    setCurrentPot(totalPot);
    setFeedback('idle');
    setCorrectFreq(0);
    if (soundEnabledRef.current) playDeal();
    if (timeBankSetting !== 'OFF') setTimeRemaining(timeBankSetting as number);
    else setTimeRemaining(0);
  }, [timeBankSetting, activeScenario]);

  const initialResetDone = useRef(false);
  useEffect(() => {
    if (isAuthenticated && currentView === 'trainer' && activeScenario && !initialResetDone.current) {
      initialResetDone.current = true;
      resetToNewHand();
    }
    if (currentView !== 'trainer') {
      initialResetDone.current = false;
    }
  }, [isAuthenticated, currentView, activeScenario, resetToNewHand]);

  const handleActionClick = useCallback((label: string, isTimeout: boolean = false) => {
    if (feedback !== 'idle' && !isTimeout) return;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }

    const heroIndex = players.findIndex(p => p.positionName === activeScenario?.heroPos);
    const hero = players[heroIndex];
    if (!hero || !activeScenario) return;

    const [c1, c2] = hero.cards!;
    const r1 = c1[0]; const s1 = c1[1]; const r2 = c2[0]; const s2 = c2[1];
    const rank1Idx = RANKS.indexOf(r1); const rank2Idx = RANKS.indexOf(r2);
    
    const normalizeKey = (k: string) => {
      let n = k.trim().toUpperCase().replace(/10/g, 'T');
      if (n.length === 4) {
        return n[0] + n[1].toLowerCase() + n[2] + n[3].toLowerCase();
      } else if (n.length === 3) {
        return n.slice(0, 2) + n[2].toLowerCase();
      }
      return n;
    };

    let handKey = '';
    if (rank1Idx === rank2Idx) handKey = r1 + r2;
    else if (rank1Idx > rank2Idx) handKey = r1 + r2 + (s1 === s2 ? 's' : 'o');
    else handKey = r2 + r1 + (s1 === s2 ? 's' : 'o');

    const comboKey1 = normalizeKey(r1 + s1 + r2 + s2);
    const comboKey2 = normalizeKey(r2 + s2 + r1 + s1);
    const handKeyNorm = normalizeKey(handKey);

    const ranges = currentRanges || activeScenario.ranges;
    const labelLower = label.toLowerCase();

    const actionMap = ranges[comboKey1] || ranges[comboKey2] || ranges[handKeyNorm];
    let isCorrect = false;
    let correctAction = 'Fold';
    let clickedFreq = 0;

    if (actionMap) {
      const baseAction = (labelLower.includes('raise') || labelLower.includes('iso') || labelLower.includes('bet')) ? 'Raise' : (labelLower.includes('call') || labelLower.includes('check')) ? 'Call' : label;
      const freq = actionMap[label] ?? actionMap[baseAction] ?? 0;
      clickedFreq = freq as number;
      isCorrect = clickedFreq > 0;
      
      const entries = Object.entries(actionMap);
      const sortedEntries = entries.sort((a, b) => (b[1] as number) - (a[1] as number));
      const bestAction = sortedEntries[0];
      if (bestAction) correctAction = bestAction[0];
    } else {
      isCorrect = labelLower.includes('fold');
    }

    if (!isTimeout) {
      const labelLower = label.toLowerCase();
      let additionalBetVal = 0;
      let newTotalBetRaw = hero.betAmount || 0;
      let newChips = hero.chips;

      const isBettingAction = labelLower.includes('raise') || 
                              labelLower.includes('all-in') || 
                              labelLower.includes('shove') || 
                              labelLower.includes('rfi') || 
                              labelLower.includes('bet') ||
                              labelLower.includes('call') ||
                              labelLower.includes('iso') ||
                              labelLower.includes('check') ||
                              labelLower.includes('pagar');

      if (isBettingAction && !labelLower.includes('check')) {
        let betAmountBB: number = 0;
        
        if (labelLower.includes('call') || labelLower.includes('pagar')) {
          betAmountBB = Number(activeScenario.opponentBetSize || 1);
        } else if (labelLower.includes('all-in') || labelLower.includes('shove')) {
          betAmountBB = (Number(hero.chips) + Number(hero.betAmount)) / BIG_BLIND_VALUE;
        } else {
          const match = label.match(/(\d+\.?\d*)/);
          if (label.includes('%')) {
            const percentage = match ? parseFloat(match[0]) : 0;
            // Calcula a aposta como porcentagem do pote atual
            betAmountBB = (currentPot / BIG_BLIND_VALUE) * (percentage / 100);
          } else if (labelLower.includes('baixo')) {
            betAmountBB = (currentPot / BIG_BLIND_VALUE) * 0.3;
          } else if (labelLower.includes('médio') || labelLower.includes('medio')) {
            betAmountBB = (currentPot / BIG_BLIND_VALUE) * 0.5;
          } else if (labelLower.includes('alto')) {
            betAmountBB = (currentPot / BIG_BLIND_VALUE) * 0.8;
          } else if (labelLower.includes('overbet')) {
            betAmountBB = (currentPot / BIG_BLIND_VALUE) * 1.25;
          } else {
            betAmountBB = match ? parseFloat(match[0]) : Number(activeScenario.heroBetSize);
          }
        }
        
        const currentBetVal = Number(hero.betAmount || 0);
        const bbVal = Number(BIG_BLIND_VALUE);
        
        newTotalBetRaw = betAmountBB * bbVal;
        additionalBetVal = newTotalBetRaw - currentBetVal;
        newChips = Number(hero.chips || 0) - additionalBetVal;
      }

      setPlayers(prev => {
        const next = [...prev];
        const playerToUpdate = next[heroIndex];
        if (!playerToUpdate) return prev;
        const p = { ...playerToUpdate };
        
        p.chips = newChips;
        p.betAmount = newTotalBetRaw;
        p.lastAction = label.toUpperCase();
        p.status = labelLower.includes('fold') ? PlayerStatus.FOLDED : PlayerStatus.IDLE;
        
        next[heroIndex] = p;
        return next;
      });

      if (additionalBetVal !== 0) {
        setCurrentPot(curr => Number(curr) + additionalBetVal);
      }
    }

    const status = isCorrect ? 'correct' : 'incorrect';
    setFeedback(isTimeout ? 'timeout' : status);
    setCorrectFreq(isCorrect ? clickedFreq : 0);

    if (soundEnabledRef.current) {
      if (isTimeout) { playTimeout(); }
      else if (isCorrect) { playCorrect(clickedFreq >= 60 ? 'high' : clickedFreq >= 30 ? 'mid' : 'low'); }
      else { playWrong(); }
    }

    const newHand: HandRecord = {
      id: Date.now(),
      cards: hero.cards?.join(' ') || '??',
      action: isTimeout ? 'TEMPO ESGOTADO' : label,
      correctAction: correctAction,
      status: status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isTimeout: isTimeout
    };
    setHandHistory(prev => [...prev, newHand]);

    // Salvar no banco (fire-and-forget)
    if (currentUserIdRef.current) {
      const scenarioUUID = activeScenario.id && isValidUUID(activeScenario.id) ? activeScenario.id : null;
      const handRow: Record<string, any> = {
        user_id:             currentUserIdRef.current,
        scenario_id:         scenarioUUID,
        scenario_name:       activeScenario.name ?? null,
        training_session_id: trainingSessionIdRef.current || null,
        hand_key:            handKey,
        hero_cards:          hero.cards ?? [],
        user_action:         isTimeout ? 'TIMEOUT' : label,
        correct_action:      correctAction,
        is_correct:          isCorrect,
        is_timeout:          isTimeout,
        correct_freq:        clickedFreq,
      };
      // Só envia colunas de opponent ranges se tiver dados (migration v7)
      if (currentOpponentAction) {
        handRow.opponent_action = currentOpponentAction;
        handRow.opponent_hand_key = currentOpponentHandKey || null;
      }
      supabase.from('hand_history').insert(handRow).then(({ error }) => {
        if (error) console.error('[hand_history] Erro ao salvar:', error.message);
      });
    }
    
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current);
    resetTimerRef.current = window.setTimeout(() => {
      resetToNewHand();
      resetTimerRef.current = null;
    }, 1500);
  }, [players, feedback, resetToNewHand, activeScenario, currentPot]);

  // Ref para o callback de timeout — evita recriar o interval a cada tick
  const handleActionClickRef = useRef(handleActionClick);
  handleActionClickRef.current = handleActionClick;

  useEffect(() => {
    if (timeBankSetting === 'OFF' || feedback !== 'idle' || currentView !== 'trainer') {
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    // Inicia o timer apenas quando feedback volta a 'idle' (nova mão) na tela de treino
    // O timeRemaining já foi setado em resetToNewHand
    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        const next = +(prev - 0.1).toFixed(1);
        if (next <= 0) {
          if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
          handleActionClickRef.current('Fold', true);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => { if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; } };
  }, [timeBankSetting, feedback, currentView]);

  const handleLogin = async (email: string, userId: string, isAdminFlag: boolean, isActiveFlag: boolean) => {
    setMultiLoginError(false);
    setCurrentUser(email);
    currentUserIdRef.current = userId;
    setIsAdmin(isAdminFlag);

    // Fetch full profile for expiration check
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, subscription_status, access_expires_at, must_change_password')
      .eq('id', userId)
      .single();
    if (profile?.full_name) setCurrentUserName(profile.full_name);
    setMustChangePassword(profile?.must_change_password ?? false);

    // Check access expiration
    let active = isActiveFlag;
    let reason: 'inactive' | 'overdue' | null = null;
    if (active && profile?.access_expires_at) {
      const expiresAt = new Date(profile.access_expires_at);
      if (expiresAt < new Date()) {
        active = false;
        reason = profile?.subscription_status === 'overdue' ? 'overdue' : 'inactive';
        supabaseAdmin.from('profiles').update({ is_active: false }).eq('id', userId);
      }
    }
    if (!active && !reason && profile?.subscription_status === 'overdue') {
      reason = 'overdue';
    }
    if (!active && !reason) {
      reason = 'inactive';
    }

    setIsActive(active);
    setBlockReason(active ? null : reason);
    setIsAuthenticated(true);
    setCurrentView('dashboard');
    fetchScenarios();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCurrentUser(null);
    setCurrentUserName('');
    setIsAdmin(false);
    setIsActive(false);
    setCurrentView('dashboard');
    setAuthView('login');
  };

  const onSelectScenario = (s: Scenario) => { 
    setActiveScenario(s); 
    setCurrentView('setup'); 
    setHandHistory([]); 
    handPoolRef.current = []; 
    setSessionElapsedSeconds(0); 
  };
  const handleStartTraining = async (goal: TrainingGoal) => {
    setTrainingGoal(goal);
    trainingGoalRef.current = goal;
    setCurrentView('trainer');
    setHandHistory([]);
    handPoolRef.current = [];
    recentHandKeysRef.current = [];
    const sessionId = crypto.randomUUID();
    trainingSessionIdRef.current = sessionId;
    setSessionElapsedSeconds(0);
    statsSavedRef.current = false;

    // Persist training session start to Supabase
    if (currentUserIdRef.current) {
      const scenarioUUID = activeScenario?.id && isValidUUID(activeScenario.id) ? activeScenario.id : null;
      supabase.from('training_sessions').insert({
        id: sessionId,
        user_id: currentUserIdRef.current,
        scenario_id: scenarioUUID,
        scenario_name: activeScenario?.name ?? null,
        training_mode: goal.mode,
        goal_type: goal.type,
        goal_value: goal.value,
        is_active: true,
      }).then(({ error }) => {
        if (error) console.error('[training_sessions] Insert error:', error.message);
      });
    }
  };
  const handleCreateNew = () => setShowScenarioCreatorModal(true);
  
  const handleSaveScenario = async (newScenario: Scenario, shouldClose: boolean = true) => {
    const isUUID = isValidUUID(newScenario.id);
    let savedId = newScenario.id;

    if (isUUID) {
      // Snapshot antes de atualizar
      const { data: existing } = await supabaseAdmin
        .from('scenarios')
        .select('*, scenario_variants(*)')
        .eq('id', newScenario.id)
        .single();
      if (existing) {
        await createScenarioSnapshot(
          newScenario.id,
          existing,
          existing.scenario_variants || [],
          'update',
          `Atualização do cenário "${existing.name}" (v${existing.version || 1})`,
          currentUserIdRef.current || undefined,
        );
      }

      const newVersion = (existing?.version || 1) + 1;
      const { error: updateErr } = await supabaseAdmin
        .from('scenarios')
        .update({ ...scenarioToDb(newScenario), version: newVersion })
        .eq('id', newScenario.id);
      if (updateErr) { console.error('[Save] Update falhou:', updateErr); alert('Erro ao atualizar cenário: ' + updateErr.message); return; }
      await supabaseAdmin.from('scenario_variants').delete().eq('scenario_id', newScenario.id);
    } else {
      const { data, error: insertErr } = await supabaseAdmin.from('scenarios').insert({ ...scenarioToDb(newScenario), version: 1 }).select('id').single();
      if (insertErr) { console.error('[Save] Insert falhou:', insertErr); alert('Erro ao salvar cenário: ' + insertErr.message); return; }
      savedId = data?.id ?? newScenario.id;
    }

    if (newScenario.variants && newScenario.variants.length > 0) {
      const { error: varErr } = await supabaseAdmin.from('scenario_variants').insert(
        newScenario.variants.map((v, i) => ({
          scenario_id: savedId,
          board: v.board ?? [],
          ranges: v.ranges ?? {},
          custom_actions: v.customActions ?? [],
          is_duplicate: v.isDuplicate ?? false,
          sort_order: i,
          opponent_ranges: v.opponentRanges ?? null,
          opponent_actions: v.opponentActions ?? [],
          hero_ranges_by_action: v.heroRangesByAction ?? null,
        }))
      );
      if (varErr) console.error('[Save] Variants falhou:', varErr);
    }

    if (activeScenario?.id === newScenario.id) {
      handPoolRef.current = [];
      initialResetDone.current = false;
    }

    await fetchScenarios();
    if (shouldClose) setShowScenarioCreatorModal(false);
  };

  const handleTogglePublish = async (id: string) => {
    const { data: existing } = await supabaseAdmin
      .from('scenarios')
      .select('is_published, name')
      .eq('id', id)
      .single();
    if (!existing) return;
    const newVal = !existing.is_published;
    await supabaseAdmin.from('scenarios').update({ is_published: newVal }).eq('id', id);
    setScenarios(prev => prev.map(s => s.id === id ? { ...s, isPublished: newVal } : s));
  };

  const handleDeleteScenario = async (id: string) => {
    // Snapshot antes de deletar
    const { data: existing } = await supabaseAdmin
      .from('scenarios')
      .select('*, scenario_variants(*)')
      .eq('id', id)
      .single();
    if (existing) {
      await createScenarioSnapshot(
        id,
        existing,
        existing.scenario_variants || [],
        'delete',
        `Exclusão do cenário "${existing.name}"`,
        currentUserIdRef.current || undefined,
      );
    }

    await supabaseAdmin.from('scenarios').delete().eq('id', id);
    setScenarios(prev => prev.filter(s => s.id !== id));
  };

  const handleMigrateScenarios = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    try {
      const savedJson = localStorage.getItem(SCENARIOS_STORAGE_KEY);
      let savedScenarios: Scenario[] = [];
      if (savedJson) { try { savedScenarios = JSON.parse(savedJson); } catch (e) {} }

      const scenarioMap = new Map<string, Scenario>();
      SYSTEM_DEFAULT_SCENARIOS.forEach(s => scenarioMap.set(s.id, s));
      savedScenarios.forEach(s => scenarioMap.set(s.id, s));
      const allScenarios = Array.from(scenarioMap.values());

      // Busca cenários atuais do banco para snapshot
      const { data: currentDbScenarios } = await supabaseAdmin
        .from('scenarios')
        .select('*, scenario_variants(*)');

      // Validação: mostra o que vai acontecer
      const currentCount = currentDbScenarios?.length || 0;
      const newCount = allScenarios.length;
      const confirmMsg = [
        `⚠️ MIGRAÇÃO DE CENÁRIOS`,
        ``,
        `Estado atual do banco: ${currentCount} cenários`,
        `Cenários após migração: ${newCount} (${SYSTEM_DEFAULT_SCENARIOS.length} padrão + ${savedScenarios.length} customizados)`,
        ``,
        `Esta operação irá:`,
        `• Criar backup de todos os ${currentCount} cenários atuais`,
        `• Apagar todos os cenários existentes`,
        `• Inserir ${newCount} cenários (localStorage + padrões)`,
        ``,
        `Os backups ficam salvos e podem ser revertidos.`,
        ``,
        `Deseja continuar?`,
      ].join('\n');

      if (!window.confirm(confirmMsg)) {
        return { success: false, count: 0, error: 'Cancelado pelo usuário' };
      }

      // Snapshot em lote de TODOS os cenários atuais antes de deletar
      if (currentDbScenarios && currentDbScenarios.length > 0) {
        await createBulkSnapshot(
          currentDbScenarios.map(row => ({
            scenario: row,
            variants: row.scenario_variants || [],
          })),
          'migrate',
          `Migração: backup de ${currentCount} cenários antes de substituir por ${newCount}`,
          currentUserIdRef.current || undefined,
        );
      }

      // Apaga tudo que existe no banco
      await supabaseAdmin.from('scenarios').delete().neq('id', '00000000-0000-0000-0000-000000000000');

      // Insere cada cenário
      for (const s of allScenarios) {
        const isDefault = SYSTEM_DEFAULT_SCENARIOS.some(def => def.id === s.id);
        const { data: inserted } = await supabaseAdmin
          .from('scenarios')
          .insert({ ...scenarioToDb(s, isDefault), version: 1 })
          .select('id')
          .single();

        if (inserted && s.variants && s.variants.length > 0) {
          await supabaseAdmin.from('scenario_variants').insert(
            s.variants.map((v, i) => ({
              scenario_id: inserted.id,
              board: v.board ?? [],
              ranges: v.ranges ?? {},
              custom_actions: v.customActions ?? [],
              is_duplicate: v.isDuplicate ?? false,
              sort_order: i,
              opponent_ranges: v.opponentRanges ?? null,
              opponent_actions: v.opponentActions ?? [],
              hero_ranges_by_action: v.heroRangesByAction ?? null,
            }))
          );
        }
      }

      await fetchScenarios();
      return { success: true, count: allScenarios.length };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message };
    }
  };

  // ---------------------------------------------------------------------------
  // Restaurar cenário a partir de um snapshot
  // ---------------------------------------------------------------------------
  const handleRestoreSnapshot = async (snapshotId: string): Promise<boolean> => {
    try {
      const { data: snapshot, error } = await supabaseAdmin
        .from('scenario_snapshots')
        .select('*')
        .eq('id', snapshotId)
        .single();
      if (error || !snapshot) { alert('Snapshot não encontrado.'); return false; }

      const scenarioData = snapshot.scenario_data;
      const variantsData = snapshot.variants_data || [];
      const originalId = snapshot.scenario_id;

      // Verifica se o cenário ainda existe
      const { data: existing } = await supabaseAdmin
        .from('scenarios')
        .select('*, scenario_variants(*)')
        .eq('id', originalId)
        .single();

      if (existing) {
        // Cria snapshot do estado atual antes de reverter
        await createScenarioSnapshot(
          originalId,
          existing,
          existing.scenario_variants || [],
          'update',
          `Backup antes de reverter para v${snapshot.version} de "${snapshot.scenario_name}"`,
          currentUserIdRef.current || undefined,
        );

        // Atualiza cenário existente
        const { error: updateErr } = await supabaseAdmin
          .from('scenarios')
          .update({
            name: scenarioData.name,
            description: scenarioData.description ?? null,
            video_link: scenarioData.video_link ?? null,
            modality: scenarioData.modality,
            street: scenarioData.street,
            preflop_action: scenarioData.preflop_action ?? '',
            player_count: scenarioData.player_count,
            hero_pos: scenarioData.hero_pos,
            opponents: scenarioData.opponents ?? [],
            stack_bb: scenarioData.stack_bb,
            hero_bet_size: scenarioData.hero_bet_size,
            opponent_bet_size: scenarioData.opponent_bet_size ?? null,
            initial_pot_bb: scenarioData.initial_pot_bb ?? null,
            opponent_action: scenarioData.opponent_action ?? null,
            board: scenarioData.board ?? [],
            ranges: scenarioData.ranges ?? {},
            custom_actions: scenarioData.custom_actions ?? [],
            is_system_default: scenarioData.is_system_default ?? false,
            version: (existing.version || 1) + 1,
          })
          .eq('id', originalId);
        if (updateErr) { alert('Erro ao restaurar: ' + updateErr.message); return false; }

        // Recria variants
        await supabaseAdmin.from('scenario_variants').delete().eq('scenario_id', originalId);
        if (variantsData.length > 0) {
          await supabaseAdmin.from('scenario_variants').insert(
            variantsData.map((v: any, i: number) => ({
              scenario_id: originalId,
              board: v.board ?? [],
              ranges: v.ranges ?? {},
              custom_actions: v.custom_actions ?? [],
              is_duplicate: v.is_duplicate ?? false,
              sort_order: v.sort_order ?? i,
            }))
          );
        }
      } else {
        // Cenário foi deletado — reinsere
        const { data: reinserted, error: insertErr } = await supabaseAdmin
          .from('scenarios')
          .insert({
            name: scenarioData.name,
            description: scenarioData.description ?? null,
            video_link: scenarioData.video_link ?? null,
            modality: scenarioData.modality,
            street: scenarioData.street,
            preflop_action: scenarioData.preflop_action ?? '',
            player_count: scenarioData.player_count,
            hero_pos: scenarioData.hero_pos,
            opponents: scenarioData.opponents ?? [],
            stack_bb: scenarioData.stack_bb,
            hero_bet_size: scenarioData.hero_bet_size,
            opponent_bet_size: scenarioData.opponent_bet_size ?? null,
            initial_pot_bb: scenarioData.initial_pot_bb ?? null,
            opponent_action: scenarioData.opponent_action ?? null,
            board: scenarioData.board ?? [],
            ranges: scenarioData.ranges ?? {},
            custom_actions: scenarioData.custom_actions ?? [],
            is_system_default: scenarioData.is_system_default ?? false,
            version: 1,
          })
          .select('id')
          .single();
        if (insertErr) { alert('Erro ao restaurar cenário deletado: ' + insertErr.message); return false; }

        if (reinserted && variantsData.length > 0) {
          await supabaseAdmin.from('scenario_variants').insert(
            variantsData.map((v: any, i: number) => ({
              scenario_id: reinserted.id,
              board: v.board ?? [],
              ranges: v.ranges ?? {},
              custom_actions: v.custom_actions ?? [],
              is_duplicate: v.is_duplicate ?? false,
              sort_order: v.sort_order ?? i,
            }))
          );
        }
      }

      await fetchScenarios();
      return true;
    } catch (err: any) {
      alert('Erro inesperado ao restaurar: ' + err.message);
      return false;
    }
  };

  const finalizeTrainingSession = async () => {
    if (!currentUserIdRef.current || !trainingSessionIdRef.current) return;
    const correctCount = handHistory.filter(h => h.status === 'correct').length;
    // Update training session in Supabase
    await supabase.from('training_sessions').update({
      ended_at: new Date().toISOString(),
      duration_seconds: sessionElapsedSeconds,
      total_hands: handHistory.length,
      correct_hands: correctCount,
      is_active: false,
    }).eq('id', trainingSessionIdRef.current);
    // Update streak
    await supabase.rpc('update_streak', { p_user_id: currentUserIdRef.current }).then(({ error }) => {
      if (error) console.warn('[update_streak] Error:', error.message);
    });
    // Check and award badges
    await checkAndAwardBadges();
  };

  const checkAndAwardBadges = async () => {
    if (!currentUserIdRef.current) return;
    // Get total stats
    const { count: totalHands } = await supabase.from('hand_history').select('*', { count: 'exact', head: true }).eq('user_id', currentUserIdRef.current);
    const { data: streakData } = await supabase.from('user_streaks').select('longest_streak').eq('user_id', currentUserIdRef.current).single();
    const badges: string[] = [];
    const handThresholds = [
      { type: 'hands_100', threshold: 100 },
      { type: 'hands_500', threshold: 500 },
      { type: 'hands_1000', threshold: 1000 },
      { type: 'hands_5000', threshold: 5000 },
      { type: 'hands_10000', threshold: 10000 },
    ];
    const streakThresholds = [
      { type: 'streak_3', threshold: 3 },
      { type: 'streak_7', threshold: 7 },
      { type: 'streak_30', threshold: 30 },
    ];
    for (const b of handThresholds) {
      if ((totalHands || 0) >= b.threshold) badges.push(b.type);
    }
    const longestStreak = streakData?.longest_streak || 0;
    for (const b of streakThresholds) {
      if (longestStreak >= b.threshold) badges.push(b.type);
    }
    if (badges.length > 0) {
      const rows = badges.map(b => ({ user_id: currentUserIdRef.current, badge_type: b }));
      await supabase.from('user_badges').upsert(rows, { onConflict: 'user_id,badge_type', ignoreDuplicates: true });
    }
  };

  const handleStopTrainingConfirm = () => {
    if (!statsSavedRef.current) {
      statsSavedRef.current = true;
      if (currentUser) {
        persistSessionStats(currentUser, handHistory);
        persistSessionHistory(currentUser, activeScenario?.name ?? 'Treino', handHistory, sessionElapsedSeconds);
      }
      finalizeTrainingSession();
    }
    setShowStopModal(false);
    setShowReportModal(true);
    setIsFocusMode(false);
  };
  const onExitToSelection = () => { setShowReportModal(false); setCurrentView('dashboard'); setTrainingGoal(null); setIsFocusMode(false); };

  const handleRestartConfirm = () => {
    setHandHistory([]);
    setSessionElapsedSeconds(0);
    setShowRestartModal(false);
    resetToNewHand();
  };

  const getDesktopPlayerStyle = (index: number, totalSlots: number) => {
    if (totalSlots === 9) {
      const positions = [
        { x: 50, y: 84 },   // 0: BTN (Hero) - Mantém
        { x: 18, y: 82 },   // 1: SB - Um pouco para baixo (y: 78 -> 82)
        { x: 8, y: 50 },    // 2: BB - Para a esquerda (x: 10 -> 8)
        { x: 12, y: 20 },   // 3: UTG - Pouco para cima (y: 22 -> 20) e mais para esquerda (x: 20 -> 12)
        { x: 40, y: 12 },   // 4: UTG+1 - Esquerda levemente (x: 42 -> 40)
        { x: 60, y: 12 },   // 5: MP - Direita levemente (x: 58 -> 60)
        { x: 88, y: 20 },   // 6: LJ - Pouco para cima (y: 20) e mais para direita (x: 80 -> 88)
        { x: 92, y: 50 },   // 7: HJ - Para a direita (x: 90 -> 92)
        { x: 82, y: 82 },   // 8: CO - Para baixo (y: 82) e para a direita (x: 80 -> 82)
      ];
      return { top: `${positions[index].y}%`, left: `${positions[index].x}%`, transform: 'translate(-50%, -50%)' };
    } else if (totalSlots === 6) {
      const positions = [
        { x: 50, y: 84 },
        { x: 15, y: 65 },
        { x: 15, y: 35 },
        { x: 50, y: 15 },
        { x: 85, y: 35 },
        { x: 85, y: 65 },
      ];
      return { top: `${positions[index].y}%`, left: `${positions[index].x}%`, transform: 'translate(-50%, -50%)' };
    } else if (totalSlots === 4) {
      const positions = [
        { x: 50, y: 84 },
        { x: 15, y: 50 },
        { x: 50, y: 15 },
        { x: 85, y: 50 },
      ];
      return { top: `${positions[index].y}%`, left: `${positions[index].x}%`, transform: 'translate(-50%, -50%)' };
    } else if (totalSlots === 2) {
      return { top: index === 0 ? '84%' : '15%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const startAngle = 270; const angleStep = 360 / totalSlots; const angleInDegrees = startAngle - (index * angleStep);
    let rx = 44; let ry = 38; const angleInRadians = (angleInDegrees * Math.PI) / 180;
    let x = 50 + rx * Math.cos(angleInRadians); let y = 50 - ry * Math.sin(angleInRadians);
    return { top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' };
  };

  const getMobilePlayerStyle = (index: number, totalSlots: number) => {
    if (totalSlots === 9) {
      const positions = [
        { x: 50, y: 80 },   // 0: Bottom
        { x: 18, y: 80 },   // 1
        { x: 10, y: 58 },   // 2
        { x: 10, y: 34 },   // 3
        { x: 30, y: 12 },   // 4
        { x: 70, y: 12 },   // 5
        { x: 90, y: 34 },   // 6
        { x: 90, y: 58 },   // 7
        { x: 82, y: 80 },   // 8
      ];
      return { top: `${positions[index].y}%`, left: `${positions[index].x}%`, transform: 'translate(-50%, -50%)' };
    } else if (totalSlots === 6) {
      const positions = [
        { x: 50, y: 80 },
        { x: 15, y: 68 },
        { x: 15, y: 30 },
        { x: 50, y: 10 },
        { x: 85, y: 30 },
        { x: 85, y: 68 },
      ];
      return { top: `${positions[index].y}%`, left: `${positions[index].x}%`, transform: 'translate(-50%, -50%)' };
    } else if (totalSlots === 4) {
      const positions = [
        { x: 50, y: 80 },
        { x: 14, y: 49 },
        { x: 50, y: 10 },
        { x: 86, y: 49 },
      ];
      return { top: `${positions[index].y}%`, left: `${positions[index].x}%`, transform: 'translate(-50%, -50%)' };
    } else if (totalSlots === 2) {
      return { top: index === 0 ? '80%' : '10%', left: '50%', transform: 'translate(-50%, -50%)' };
    }

    const startAngle = 270; const angleStep = 360 / totalSlots; const angleInDegrees = startAngle - (index * angleStep);
    let rx = 37; let ry = 43; const angleInRadians = (angleInDegrees * Math.PI) / 180;
    let x = 50 + rx * Math.cos(angleInRadians); let y = 50 - ry * Math.sin(angleInRadians);
    return { top: `${y}%`, left: `${x}%`, transform: 'translate(-50%, -50%)' };
  };

  const getOrientationClass = (index: number, isMobileMode: boolean, totalSlots: number) => {
    if (index === 0) return 'bottom';
    if (totalSlots === 9) {
      if (index >= 1 && index <= 3) return 'left';
      if (index >= 4 && index <= 5) return 'top';
      return 'right';
    } else if (totalSlots === 6) {
      if (index === 1 || index === 2) return 'left';
      if (index === 3) return 'top';
      return 'right';
    } else if (totalSlots === 4) {
      if (index === 1) return 'left';
      if (index === 2) return 'top';
      return 'right';
    } else if (totalSlots === 2) {
      return index === 0 ? 'bottom' : 'top';
    }
    return 'bottom';
  };

  const renderActionButtons = () => {
    let customActions = currentCustomActions.length > 0 ? currentCustomActions : (activeScenario?.customActions || ['Fold', 'Call', 'Raise', 'All-In']);

    // Pós-flop: garantir que pelo menos Check e Fold apareçam como distractors
    if (board.length > 0) {
      const augmented = [...customActions];
      if (!augmented.some(a => a.toLowerCase() === 'check' || a.toLowerCase().includes('check'))) augmented.push('Check');
      if (!augmented.some(a => a.toLowerCase() === 'fold' || a.toLowerCase().includes('fold'))) augmented.push('Fold');
      customActions = augmented;
    }

    const n = customActions.length;
    
    let row1: string[] = [];
    let row2: string[] = [];

    if (n <= 3) {
      row1 = customActions;
    } else if (n === 4) {
      row1 = customActions.slice(0, 2);
      row2 = customActions.slice(2, 4);
    } else if (n === 5) {
      row1 = customActions.slice(0, 3);
      row2 = customActions.slice(3, 5);
    } else {
      row1 = customActions.slice(0, 3);
      row2 = customActions.slice(3, 6);
    }

    const renderRow = (row: string[]) => (
      <div className="flex gap-2 w-full justify-center">
        {row.map((label) => {
          const originalIdx = customActions.indexOf(label);
          const color = getActionColor(label, originalIdx);
          const baseWidth = (n === 4) ? 'w-[calc(50%-4px)]' : 'w-[calc(33.33%-6px)]';
          
          return (
            <button key={originalIdx} onClick={() => handleActionClick(label)} 
              style={{ backgroundColor: color, borderColor: 'rgba(255,255,255,0.2)' }}
              className={`${baseWidth} h-8 md:h-10 px-1 rounded-lg border flex items-center justify-center transition-all active:scale-95 text-[9px] md:text-[10px] font-black uppercase tracking-wider text-white shadow-2xl hover:brightness-110 truncate`}>
              {label}
            </button>
          );
        })}
      </div>
    );

    return (
      <div className={`flex flex-col gap-1.5 md:gap-2 w-full ${isMobile ? 'max-w-[340px]' : 'max-w-[440px]'} px-2 items-center`}>
        {renderRow(row1)}
        {row2.length > 0 && renderRow(row2)}
      </div>
    );
  };

  const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`; };
  const getProgressText = () => {
    if (!trainingGoal) return `${handHistory.length} mãos`;
    if (trainingGoal.type === 'hands') return `${handHistory.length} / ${trainingGoal.value} mãos`;
    if (trainingGoal.type === 'time') return `${formatTime(sessionElapsedSeconds)} / ${formatTime(trainingGoal.value * 60)}`;
    return `${handHistory.length} mãos`;
  };

  if (!isAuthenticated) {
    if (authView === 'login') {
      return <LoginScreen onLogin={handleLogin} onGoToRegister={() => setAuthView('register')} />;
    }
    return (
      <>
        <RegisterScreen onRegister={(e) => handleLogin(e, '', false, false)} onGoToLogin={() => setAuthView('login')} />
        <SupportButton />
      </>
    );
  }

  // Force password change gate
  if (mustChangePassword) {
    return <ForceChangePassword
      onChanged={() => {
        setMustChangePassword(false);
        if (currentUserIdRef.current) {
          supabaseAdmin.from('profiles').update({ must_change_password: false }).eq('id', currentUserIdRef.current);
        }
      }}
      onLogout={handleLogout}
    />;
  }

  // Access gate: active subscription required (admins always bypass)
  if (!isAdmin && !isActive) {
    const isOverdue = blockReason === 'overdue';
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 animate-in fade-in duration-700">
        <div className="w-full max-w-md text-center">
          <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${
            isOverdue ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={isOverdue ? 'text-amber-400' : 'text-red-400'}>
              <circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
            </svg>
          </div>
          {isOverdue ? (
            <>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">Plano Bloqueado</h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Seu plano está bloqueado por falta de pagamento.<br/>
                Entre em contato com o suporte para regularização.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-black text-white tracking-tighter uppercase mb-2">Acesso não liberado</h1>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                Sua conta ainda não possui uma assinatura ativa.<br/>
                Adquira o LAB11 para continuar.
              </p>
              <a
                href="https://cakto.com.br"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-8 py-4 bg-sky-600 hover:bg-sky-500 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl transition-all shadow-2xl shadow-sky-500/20 mb-4"
              >
                Adquirir Acesso
              </a>
              <br/>
            </>
          )}
          <button
            onClick={handleLogout}
            className="text-[10px] text-gray-600 hover:text-gray-400 font-black uppercase tracking-widest transition-colors mt-2"
          >
            Sair
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'dashboard') return (
    <>
      <DashboardScreen
        userId={currentUserIdRef.current}
        userEmail={currentUser || ''}
        userName={currentUserName}
        scenarios={scenarios.filter(s => s.isPublished !== false)}
        onNavigate={(view: string) => setCurrentView(view as any)}
        onStartTraining={(filter?: string) => {
          setSelectionFilter(filter);
          setCurrentView('selection');
        }}
        onQuickTraining={() => {
          const pool = scenarios.filter(s => s.isPublished !== false);
          if (pool.length === 0) return;
          const random = pool[Math.floor(Math.random() * pool.length)];
          setActiveScenario(random);
          setCurrentView('setup');
          setHandHistory([]);
          handPoolRef.current = [];
          setSessionElapsedSeconds(0);
        }}
      />
      <div className={`fixed z-[100] ${isMobile ? 'bottom-0 left-0 right-0 flex justify-center gap-2 p-3 bg-gradient-to-t from-[#050505] to-transparent' : 'top-8 right-8 flex gap-3'}`}>
        {isAdmin && !isMobile && (
          <button onClick={() => setCurrentView('admin')} className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all">
            ADMIN
          </button>
        )}
        <button onClick={() => setCurrentView('benefits')} className={`${isMobile ? 'flex-1 py-2.5' : 'px-4 py-2'} bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-amber-400 hover:text-amber-300 transition-all`}>
          {isMobile ? '★' : 'Benefícios'}
        </button>
        <button onClick={() => setCurrentView('profile')} className={`${isMobile ? 'flex-1 py-2.5' : 'px-4 py-2'} bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all`}>
          {isMobile ? '👤' : 'Perfil'}
        </button>
        <button onClick={handleLogout} className={`${isMobile ? 'flex-1 py-2.5' : 'px-4 py-2'} bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all`}>
          {isMobile ? '↩' : 'Sair'}
        </button>
      </div>
      <SupportButton />
    </>
  );

  if (currentView === 'admin') return (
    <>
      <AdminScreen
        onBack={() => setCurrentView('dashboard')}
        onManageScenarios={() => setShowScenarioCreatorModal(true)}
        onMigrate={handleMigrateScenarios}
        onManageContent={() => setCurrentView('admin-content')}
        onViewVersionHistory={() => setShowVersionHistory(true)}
      />
      <ScenarioCreatorModal isOpen={showScenarioCreatorModal} scenarios={scenarios} onClose={() => setShowScenarioCreatorModal(false)} onSave={handleSaveScenario} onDelete={handleDeleteScenario} onTogglePublish={handleTogglePublish} isAdmin={isAdmin} />
      <ScenarioVersionHistory isOpen={showVersionHistory} onClose={() => setShowVersionHistory(false)} onRestore={handleRestoreSnapshot} />
    </>
  );

  if (currentView === 'admin-content') return (
    <AdminContentManager
      userId={currentUserIdRef.current}
      onBack={() => setCurrentView('admin')}
    />
  );

  if (currentView === 'profile') return (
    <ProfileScreen currentUser={currentUser!} onBack={() => setCurrentView('dashboard')} />
  );

  if (currentView === 'ranking') return (
    <RankingScreen userId={currentUserIdRef.current} onBack={() => setCurrentView('dashboard')} onStartTraining={() => { setCurrentView('selection'); }} />
  );

  if (currentView === 'history') return (
    <HistoryScreen currentUser={currentUser!} onBack={() => setCurrentView('dashboard')} />
  );

  if (currentView === 'spot-replay') return (
    <SpotReplayScreen onBack={() => setCurrentView('dashboard')} />
  );

  if (currentView === 'courses') return (
    <CoursesScreen
      userId={currentUserIdRef.current}
      onBack={() => setCurrentView('dashboard')}
      onPlayLesson={(lesson, course) => {
        setActiveLessonData({ lesson, course });
        setCurrentView('lesson-player');
      }}
    />
  );

  if (currentView === 'lesson-player' && activeLessonData) return (
    <LessonPlayer
      lesson={activeLessonData.lesson}
      course={activeLessonData.course}
      userId={currentUserIdRef.current}
      onBack={() => setCurrentView('courses')}
      onSelectLesson={(lesson) => {
        setActiveLessonData({ ...activeLessonData, lesson });
      }}
    />
  );

  if (currentView === 'benefits') return (
    <BenefitsScreen onBack={() => setCurrentView('dashboard')} userId={currentUserIdRef.current} />
  );

  if (currentView === 'selection') {
    // Filter scenarios based on selection from dashboard
    const publishedScenarios = scenarios.filter(s => s.isPublished !== false);
    const displayScenarios = selectionFilter === 'PREFLOP'
      ? publishedScenarios.filter(s => s.street === 'PREFLOP')
      : selectionFilter === 'POSTFLOP'
      ? publishedScenarios.filter(s => s.street !== 'PREFLOP')
      : publishedScenarios;

    return (
      <div className="w-full h-screen overflow-y-auto bg-[#050505]">
        <SelectionScreen scenarios={displayScenarios} onSelect={onSelectScenario} onCreateNew={handleCreateNew} isAdmin={isAdmin} />
        <ScenarioCreatorModal isOpen={showScenarioCreatorModal} scenarios={scenarios} onClose={() => setShowScenarioCreatorModal(false)} onSave={handleSaveScenario} onDelete={handleDeleteScenario} onTogglePublish={handleTogglePublish} isAdmin={isAdmin} />
        <AdminMemberModal isOpen={showAdminMemberModal} onClose={() => setShowAdminMemberModal(false)} />
        <div className={`fixed z-[100] ${isMobile ? 'bottom-0 left-0 right-0 flex justify-center gap-2 p-3 bg-gradient-to-t from-[#050505] to-transparent' : 'top-8 right-8 flex gap-3'}`}>
          <button onClick={() => { setSelectionFilter(undefined); setCurrentView('dashboard'); }} className={`${isMobile ? 'flex-1 py-2.5' : 'px-4 py-2'} bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all`}>
            {isMobile ? '←' : '← Dashboard'}
          </button>
          {isAdmin && !isMobile && (
            <button onClick={handleCreateNew} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 border border-emerald-400/40 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all flex items-center gap-2">
              <span>+</span> Criar Cenário
            </button>
          )}
        </div>
        <SupportButton />
      </div>
    );
  }
  if (currentView === 'setup' && activeScenario) return <> <TrainingSetupScreen scenarioName={activeScenario.name} onStart={handleStartTraining} onBack={() => setCurrentView('selection')} /> <SupportButton /> </>;

  const playerCount = activeScenario?.playerCount || 9;

  return (
    <div className="w-full h-screen bg-[#050505] flex overflow-hidden font-sans text-white relative">
      {!isFocusMode && (
        <Sidebar 
          isOpen={sidebarOpen} 
          isPinned={sidebarPinned} 
          onToggle={() => setSidebarOpen(!sidebarOpen)} 
          onTogglePin={handleToggleSidebarPin} 
          onToggleFocusMode={() => setIsFocusMode(true)} 
          onStopTreino={() => setShowStopModal(true)} 
          onRestartTreino={() => setShowRestartModal(true)} 
          onShowSpotInfo={() => setShowSpotInfoModal(true)} 
          onShowConfig={() => setShowConfigModal(true)} 
          onShowScenarioCreator={() => setShowScenarioCreatorModal(true)} 
          onShowAdminMember={() => setShowAdminMemberModal(true)}
          onBackToSelection={() => {
            if (!statsSavedRef.current && handHistory.length > 0) {
              statsSavedRef.current = true;
              if (currentUser) {
                persistSessionStats(currentUser, handHistory);
                persistSessionHistory(currentUser, activeScenario?.name ?? 'Treino', handHistory, sessionElapsedSeconds);
              }
              finalizeTrainingSession();
            }
            setCurrentView('dashboard');
          }}
          /* Navegação removida da tela de treino — foco total no simulador */
          currentUser={currentUser}
          history={handHistory}
          ranges={currentRanges || activeScenario?.ranges}
          customActions={currentCustomActions.length > 0 ? currentCustomActions : activeScenario?.customActions}
          selectedHand={currentHandKey}
          board={board}
          trainingGoal={trainingGoal || undefined}
          sessionElapsedSeconds={sessionElapsedSeconds}
        />
      )}
      {isFocusMode && (
        <div className="fixed inset-0 z-[200] pointer-events-none animate-in fade-in duration-700">
          <div className="absolute top-5 left-6 pointer-events-auto">
            <span className="text-white/15 hover:text-white/50 font-mono text-[10px] font-black uppercase tracking-widest transition-colors duration-300 cursor-default select-none">
              {getProgressText()}
            </span>
          </div>
          <div className="absolute top-4 right-6 flex gap-4 pointer-events-auto">
            <button onClick={() => setIsFocusMode(false)} className="text-white/15 hover:text-white/60 text-[10px] font-black uppercase tracking-widest transition-colors duration-300">
              SAIR
            </button>
            <button onClick={() => setShowStopModal(true)} className="text-red-500/20 hover:text-red-400/70 text-[10px] font-black uppercase tracking-widest transition-colors duration-300">
              PARAR
            </button>
          </div>
        </div>
      )}
      <div className={`flex-1 relative flex flex-col items-center justify-center transition-all duration-300 ${!isMobile && sidebarOpen && !isFocusMode ? 'ml-80' : 'ml-0'} ${isMobile ? 'pb-[100px]' : ''}`}>
        <div className={`relative w-full ${isMobile ? 'max-w-[400px] aspect-[9/13]' : 'max-w-[800px] aspect-[16/10]'} flex flex-col items-center justify-center select-none transition-all duration-500`}>
          <div
            className={`absolute inset-0 ${isMobile ? 'm-8 rounded-[110px]' : 'm-16 rounded-[120px]'}${tableStyle === 'classic' ? ' border-[8px] border-[#111111] shadow-[0_20px_60px_-15px_rgba(0,0,0,1)] bg-[#080808]' : ''}`}
            style={tableStyle === 'premium' ? {
              /* Rail: ébano / madeira escura com aro dourado — acabamento de alto nível */
              background: 'linear-gradient(160deg, #161610 0%, #0f0f0b 45%, #1a1a14 100%)',
              boxShadow: '0 20px 80px rgba(0,0,0,0.95), 0 6px 20px rgba(0,0,0,0.8), inset 0 2px 5px rgba(220,185,80,0.18), inset 0 -2px 4px rgba(0,0,0,0.9)',
              border: '1.5px solid rgba(195,155,55,0.28)',
            } : {}}
          >
            <div
              className={`absolute flex items-center justify-center overflow-hidden rounded-[100px]${tableStyle === 'classic' ? ' inset-1.5 bg-[radial-gradient(ellipse_at_center,_#6d0000_0%,_#3d0000_65%,_#0d0000_100%)]' : ''}`}
              style={tableStyle === 'premium' ? {
                inset: '13px',
                /* Felt: verde casino profundo — spotlight overhead suave no centro */
                background: 'radial-gradient(ellipse at 50% 44%, #1e4820 0%, #0f2812 40%, #050e06 100%)',
                boxShadow: 'inset 0 10px 40px rgba(0,0,0,0.9), inset 0 0 28px rgba(0,0,0,0.7), inset 8px 0 24px rgba(0,0,0,0.85), inset -8px 0 24px rgba(0,0,0,0.85)',
                border: '1px solid rgba(8,28,10,1)',
              } : {}}
            >
              {tableStyle === 'premium' && <>
                {/* Vignette radial — bordas mergulhadas, centro vivo */}
                <div className="absolute inset-0 pointer-events-none rounded-[100px]" style={{ zIndex: 1, background: 'radial-gradient(ellipse at 50% 46%, transparent 24%, rgba(0,0,0,0.58) 70%, rgba(0,0,0,0.86) 100%)' }} />
                {/* Perspectiva suave — lado distante (topo) levemente mais escuro */}
                <div className="absolute inset-0 pointer-events-none rounded-[100px]" style={{ zIndex: 1, background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.14) 30%, transparent 52%)' }} />
                {/* Spotlight overhead: luz de casino discreta acima da mesa */}
                <div className="absolute inset-0 pointer-events-none rounded-[100px]" style={{ zIndex: 1, background: 'radial-gradient(ellipse at 50% 40%, rgba(120,255,100,0.05) 0%, transparent 55%)' }} />
                {/* Marca d'água — gravada no feltro em ouro */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center" style={{ zIndex: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '16px', opacity: 0.18 }}>
                    <div style={{ width: isMobile ? '28px' : '48px', height: '1px', background: 'rgba(195,155,55,1)' }} />
                    <span style={{
                      fontFamily: "'Inter', sans-serif",
                      fontSize: isMobile ? '0.75rem' : '1rem',
                      fontWeight: 700,
                      letterSpacing: '0.5em',
                      paddingLeft: '0.5em',
                      color: 'rgba(195,155,55,1)',
                      userSelect: 'none',
                    }}>LAB11</span>
                    <div style={{ width: isMobile ? '28px' : '48px', height: '1px', background: 'rgba(195,155,55,1)' }} />
                  </div>
                </div>
              </>}
              <div className={`absolute left-1/2 -translate-x-1/2 ${isMobile ? (playerCount <= 4 ? 'top-[28%]' : 'top-[36%]') + ' flex-col-reverse gap-12' : 'top-[30%] flex-col gap-4'} z-20 flex items-center`}>
                  <div className="bg-black/90 px-3.5 py-1 rounded-full border border-red-500/30 flex items-center gap-1.5 shadow-2xl backdrop-blur-sm">
                    <span className="text-red-500 font-black text-[8px] tracking-widest uppercase">POT</span>
                    <span className="text-white font-mono font-black text-sm tracking-tight leading-none whitespace-nowrap">{(currentPot / BIG_BLIND_VALUE).toFixed(1)} BB</span>
                  </div>
                  {board.length > 0 && (
                    <div className="flex gap-1.5 animate-in fade-in zoom-in duration-700">
                      {board.map((card, i) => {
                        const rank = card.slice(0, -1);
                        const suit = card.slice(-1).toLowerCase();
                        const is4 = deckType === '4color';
                        return (
                          <div
                            key={i}
                            className="w-10 h-14 rounded-md shadow-2xl flex flex-col items-center justify-center leading-none font-bold border transform transition-transform hover:scale-105"
                            style={is4
                              ? { backgroundColor: SUIT_BG_4COLOR[suit] ?? '#fff', borderColor: SUIT_BORDER_4COLOR[suit] ?? '#e5e7eb' }
                              : { backgroundColor: '#fff', borderColor: '#e5e7eb' }
                            }
                          >
                            <span className={`text-[16px] font-black ${is4 ? 'text-white' : getSuitColor(suit)}`}>{rank === 'T' ? '10' : rank}</span>
                            <span className={`text-[20px] ${is4 ? 'text-white' : getSuitColor(suit)}`}>{getSuitSymbol(suit)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
              </div>
            </div>
          </div>
          <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
            {players.map((player, index) => (
              <div key={player.id} style={isMobile ? getMobilePlayerStyle(index, playerCount) : getDesktopPlayerStyle(index, playerCount)} className="absolute pointer-events-auto">
                <PlayerSeat player={player} isMain={player.positionName === activeScenario?.heroPos} bigBlindValue={BIG_BLIND_VALUE} timeRemaining={player.positionName === activeScenario?.heroPos ? timeRemaining : 0} maxTime={(player.positionName === activeScenario?.heroPos && timeBankSetting !== 'OFF') ? (timeBankSetting as number) : 0} totalPlayers={playerCount} isMobile={isMobile} deckType={deckType} className={`${getOrientationClass(index, isMobile, playerCount)} ${index === 0 ? (isMobile ? 'scale-[0.85]' : 'scale-[0.88]') : (isMobile ? 'scale-[0.72]' : 'scale-[0.82]')}`} />
              </div>
            ))}
          </div>
          <div className={`${isMobile ? 'fixed bottom-0 left-0 right-0 pb-4 pt-3 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent' : 'absolute bottom-[-110px] w-full'} flex justify-center z-50 px-4`}>
             {feedback !== 'idle' ? (
               feedback === 'correct' ? (
                 <div className="py-3 px-6 rounded-full border font-black uppercase text-xs tracking-widest animate-in zoom-in duration-300 bg-green-600/20 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.3)] flex items-center gap-3">
                   <span>Decisão Correta</span>
                   <div className="flex gap-0.5 text-base leading-none">
                     {[1, 2, 3].map(i => {
                       const checks = correctFreq >= 60 ? 3 : correctFreq >= 30 ? 2 : 1;
                       return <span key={i} className={i <= checks ? 'text-green-400' : 'text-green-900'}>✓</span>;
                     })}
                   </div>
                 </div>
               ) : (
                 <div className={`py-3 px-8 rounded-full border font-black uppercase text-xs tracking-widest animate-in zoom-in duration-300 ${feedback === 'timeout' ? 'bg-orange-600/20 border-orange-500 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)]' : 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}>
                   {feedback === 'timeout' ? 'Tempo Esgotado' : 'Decisão Errada'}
                 </div>
               )
             ) : renderActionButtons()}
          </div>
        </div>
      </div>
      <StopTrainingModal isOpen={showStopModal} onClose={() => setShowStopModal(false)} onConfirm={handleStopTrainingConfirm} />
      <SessionReportModal 
        isOpen={showReportModal} 
        onClose={onExitToSelection} 
        onNewTraining={onExitToSelection} 
        history={handHistory} 
        scenarioName={activeScenario?.name || "Treino LAB11"}
      />
      <RestartConfirmationModal isOpen={showRestartModal} onClose={() => setShowRestartModal(false)} onConfirm={handleRestartConfirm} />
      <SpotInfoModal 
        isOpen={showSpotInfoModal} 
        onClose={() => setShowSpotInfoModal(false)} 
        trainingName={activeScenario?.name || ""} 
        description={activeScenario?.description}
        videoLink={activeScenario?.videoLink}
      />
      <ConfigModal isOpen={showConfigModal} onClose={() => setShowConfigModal(false)} timeBank={timeBankSetting} setTimeBank={setTimeBankSetting} soundEnabled={soundEnabled} setSoundEnabled={setSoundEnabled} deckType={deckType} setDeckType={setDeckType} tableStyle={tableStyle} setTableStyle={setTableStyle} />
      <ScenarioCreatorModal isOpen={showScenarioCreatorModal} scenarios={scenarios} onClose={() => setShowScenarioCreatorModal(false)} onSave={handleSaveScenario} onDelete={handleDeleteScenario} onTogglePublish={handleTogglePublish} isAdmin={isAdmin} />
      <AdminMemberModal isOpen={showAdminMemberModal} onClose={() => setShowAdminMemberModal(false)} />
    </div>
  );
};

export default App;
