import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Trophy, Target, Layers, Flame, Zap, Crown, Medal, Award } from 'lucide-react';
import { supabase } from '../utils/supabase.ts';
import { supabaseAdmin } from '../utils/supabaseAdmin.ts';

interface RankingEntry {
  user_id: string;
  full_name: string;
  total_hands: number;
  correct_hands: number;
  accuracy_pct: number;
}

interface RankingScreenProps {
  userId: string;
  onBack: () => void;
  onStartTraining?: () => void;
}

type Period = 'weekly' | 'monthly' | 'all';

const MEDAL_COLORS = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];
const MEDAL_BG = [
  'bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 border-yellow-400/20',
  'bg-gradient-to-br from-gray-300/10 to-gray-500/5 border-gray-400/20',
  'bg-gradient-to-br from-amber-600/10 to-amber-800/5 border-amber-600/20',
];

const RankingScreen: React.FC<RankingScreenProps> = ({ userId, onBack, onStartTraining }) => {
  const [period, setPeriod] = useState<Period>('weekly');
  const [entries, setEntries] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRanking();
  }, [period]);

  const sanitizeEntries = (rows: any[]): RankingEntry[] =>
    rows.map(r => ({
      user_id: r.user_id || '',
      full_name: r.full_name || 'Sem nome',
      total_hands: Number(r.total_hands) || 0,
      correct_hands: Number(r.correct_hands) || 0,
      accuracy_pct: Number(r.accuracy_pct) || 0,
    }));

  const loadRanking = async () => {
    setLoading(true);
    let data: RankingEntry[] | null = null;

    try {
      if (period === 'all') {
        // Use supabaseAdmin to bypass RLS (view needs cross-user access)
        const result = await supabaseAdmin.from('ranking_all_time').select('*');
        if (result.error) throw result.error;
        data = sanitizeEntries(result.data || []);
      } else {
        const days = period === 'weekly' ? 7 : 30;
        const result = await supabase.rpc('get_ranking_by_period', { p_days: days });
        if (result.error) throw result.error;
        data = sanitizeEntries(result.data || []);
      }
    } catch (err: any) {
      console.warn('[Ranking] Query failed, falling back to hand_history:', err?.message);
      // Fallback: aggregate hand_history directly (uses admin to see all users)
      try {
        const cutoff = period === 'all' ? undefined : period === 'weekly' ? 7 : 30;
        let query = supabaseAdmin.from('hand_history').select('user_id, is_correct');
        if (cutoff) {
          const since = new Date();
          since.setDate(since.getDate() - cutoff);
          query = query.gte('played_at', since.toISOString());
        }
        const { data: hands } = await query;
        if (hands && hands.length > 0) {
          const map = new Map<string, { total: number; correct: number }>();
          hands.forEach((h: any) => {
            const entry = map.get(h.user_id) || { total: 0, correct: 0 };
            entry.total++;
            if (h.is_correct) entry.correct++;
            map.set(h.user_id, entry);
          });
          const userIds = Array.from(map.keys());
          const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds);
          const nameMap = new Map<string, string>();
          profiles?.forEach((p: any) => nameMap.set(p.id, p.full_name || 'Sem nome'));

          data = Array.from(map.entries())
            .map(([uid, s]) => ({
              user_id: uid,
              full_name: nameMap.get(uid) || 'Sem nome',
              total_hands: s.total,
              correct_hands: s.correct,
              accuracy_pct: s.total > 0 ? Math.round(100 * s.correct / s.total) : 0,
            }))
            .sort((a, b) => b.total_hands - a.total_hands);
        }
      } catch (fallbackErr) {
        console.warn('[Ranking] Fallback also failed:', fallbackErr);
      }
    }

    setEntries(data || []);
    setLoading(false);
  };

  const myIdx = entries.findIndex(e => e.user_id === userId);
  const myEntry = myIdx >= 0 ? entries[myIdx] : null;
  const nextAbove = myIdx > 0 ? entries[myIdx - 1] : null;
  const handsToOvertake = nextAbove && myEntry ? nextAbove.total_hands - myEntry.total_hands + 1 : 0;

  // TOP 10 logic
  const isOutsideTop10 = myIdx >= 10 || myIdx < 0;
  const tenth = entries.length >= 10 ? entries[9] : null;
  const handsToTop10 = isOutsideTop10 && tenth && myEntry
    ? tenth.total_hands - myEntry.total_hands + 1
    : isOutsideTop10 && tenth && !myEntry
    ? tenth.total_hands + 1
    : 0;

  const getInitials = (name: string | null | undefined) => {
    if (!name || name.trim().length === 0) return '??';
    return name.trim().split(' ').slice(0, 2).map(w => w[0] || '').join('').toUpperCase() || '??';
  };

  const periodLabel = period === 'weekly' ? 'Semanal' : period === 'monthly' ? 'Mensal' : 'Geral';

  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 md:p-8 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all border border-white/5"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[13px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Ranking {periodLabel}
          </h1>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {entries.length > 0
              ? `${entries.length} jogador${entries.length > 1 ? 'es' : ''} • Por quantidade de mãos`
              : 'Nenhum treino registrado'}
          </p>
        </div>
      </div>

      {/* Period Tabs */}
      <div className="px-6 md:px-8 py-4 border-b border-white/5">
        <div className="flex bg-[#0f0f0f] p-1 rounded-2xl border border-white/5 max-w-md">
          {([
            { key: 'weekly' as Period, label: 'Semanal', icon: Flame },
            { key: 'monthly' as Period, label: 'Mensal', icon: Target },
            { key: 'all' as Period, label: 'Geral', icon: Crown },
          ]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setPeriod(tab.key)}
              className={`flex-1 px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 ${
                period === tab.key
                  ? 'bg-sky-600 text-white shadow-lg'
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-6 md:p-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Carregando ranking...</span>
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Trophy className="w-12 h-12 text-gray-800" />
            <p className="text-gray-600 text-[11px] font-black uppercase tracking-widest text-center">
              Nenhum treino registrado neste período.<br />
              <span className="text-gray-700 normal-case font-normal tracking-normal text-[10px]">
                Seja o primeiro a aparecer no ranking!
              </span>
            </p>
            {onStartTraining && (
              <button
                onClick={onStartTraining}
                className="mt-2 px-6 py-3 bg-sky-600 hover:bg-sky-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
              >
                Treinar Agora
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Motivacional: dentro do TOP 10 — ultrapassar o próximo */}
            {myEntry && nextAbove && handsToOvertake > 0 && myIdx < 10 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-r from-sky-600/10 to-purple-600/10 border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="p-2.5 bg-sky-500/20 rounded-xl shrink-0">
                  <Zap className="w-5 h-5 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-gray-300">
                    Faltam <span className="text-sky-400 font-black">{handsToOvertake} mãos</span> para ultrapassar{' '}
                    <span className="text-white font-black">{nextAbove.full_name}</span> e subir para a{' '}
                    <span className="text-yellow-400 font-black">{myIdx}ª posição</span>!
                  </p>
                </div>
                {onStartTraining && (
                  <button
                    onClick={onStartTraining}
                    className="shrink-0 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                  >
                    Treinar
                  </button>
                )}
              </motion.div>
            )}

            {/* Motivacional: fora do TOP 10 — entrar no TOP 10 */}
            {isOutsideTop10 && handsToTop10 > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-r from-amber-600/10 to-orange-600/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-4"
              >
                <div className="p-2.5 bg-amber-500/20 rounded-xl shrink-0">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-gray-300">
                    Faltam <span className="text-amber-400 font-black">{handsToTop10} mãos</span> para você entrar no{' '}
                    <span className="text-yellow-400 font-black">TOP 10</span> jogadores da plataforma!
                  </p>
                </div>
                {onStartTraining && (
                  <button
                    onClick={onStartTraining}
                    className="shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                  >
                    Treinar
                  </button>
                )}
              </motion.div>
            )}

            {/* My position (sticky if outside top 10) */}
            {myEntry && myIdx >= 10 && (
              <div className="mb-4 p-4 rounded-2xl bg-sky-600/10 border border-sky-500/20 flex items-center gap-3">
                <span className="text-[12px] font-black text-sky-400 w-8 text-center">#{myIdx + 1}</span>
                <div className="w-10 h-10 rounded-xl bg-sky-600/30 border border-sky-500/30 flex items-center justify-center">
                  <span className="text-[11px] font-black text-sky-300">{getInitials(myEntry.full_name)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12px] font-black text-sky-300 truncate">{myEntry.full_name}</div>
                  <span className="text-[8px] font-black uppercase tracking-widest text-sky-500/70">Sua posição</span>
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-black text-white">{myEntry.total_hands.toLocaleString()}</div>
                  <div className="text-[8px] font-bold text-gray-600">mãos</div>
                </div>
                <div className="text-center w-14">
                  <div className={`text-[14px] font-black ${
                    myEntry.accuracy_pct >= 70 ? 'text-emerald-400'
                    : myEntry.accuracy_pct >= 50 ? 'text-amber-400'
                    : 'text-rose-400'
                  }`}>{myEntry.accuracy_pct}%</div>
                  <div className="text-[8px] font-bold text-gray-600">precisão</div>
                </div>
              </div>
            )}

            {/* Top 3 Podium */}
            {entries.length >= 3 && (
              <div className="flex items-end justify-center gap-3 mb-8 pt-4">
                {/* 2nd place */}
                <PodiumCard entry={entries[1]} position={2} isMe={entries[1].user_id === userId} getInitials={getInitials} />
                {/* 1st place */}
                <PodiumCard entry={entries[0]} position={1} isMe={entries[0].user_id === userId} getInitials={getInitials} />
                {/* 3rd place */}
                <PodiumCard entry={entries[2]} position={3} isMe={entries[2].user_id === userId} getInitials={getInitials} />
              </div>
            )}

            {/* Column Headers */}
            <div className="flex items-center gap-4 px-4 mb-3">
              <div className="w-8 shrink-0" />
              <div className="w-10 shrink-0" />
              <div className="flex-1 text-[8px] font-black uppercase tracking-widest text-gray-700">Jogador</div>
              <div className="w-16 text-[8px] font-black uppercase tracking-widest text-gray-700 text-center">Mãos</div>
              <div className="w-16 text-[8px] font-black uppercase tracking-widest text-gray-700 text-center">Precisão</div>
            </div>

            {/* Full list (skip top 3 if podium shown) */}
            <div className="space-y-2">
              {entries.slice(entries.length >= 3 ? 3 : 0, 10).map((entry, rawIdx) => {
                const idx = entries.length >= 3 ? rawIdx + 3 : rawIdx;
                const isMe = entry.user_id === userId;
                return (
                  <motion.div
                    key={entry.user_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.03, 0.3) }}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      isMe
                        ? 'bg-sky-600/10 border-sky-500/20'
                        : 'bg-[#0f0f0f] border-white/5'
                    }`}
                  >
                    <div className="w-8 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-black text-gray-600">#{idx + 1}</span>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isMe ? 'bg-sky-600/30 border-sky-500/30' : 'bg-white/5 border-white/5'
                    }`}>
                      <span className={`text-[11px] font-black ${isMe ? 'text-sky-300' : 'text-gray-400'}`}>
                        {getInitials(entry.full_name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12px] font-black truncate ${isMe ? 'text-sky-300' : 'text-white'}`}>
                        {entry.full_name}
                      </div>
                      {isMe && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-sky-500/70">Você</span>
                      )}
                    </div>
                    <div className="w-16 text-center shrink-0">
                      <div className="text-[14px] font-black text-white">{entry.total_hands.toLocaleString()}</div>
                      <div className="mt-0.5 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-sky-500/60 rounded-full"
                          style={{ width: `${Math.min(100, (entry.total_hands / (entries[0]?.total_hands || 1)) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-16 text-center shrink-0">
                      <div className={`text-[14px] font-black ${
                        entry.accuracy_pct >= 70 ? 'text-emerald-400'
                        : entry.accuracy_pct >= 50 ? 'text-amber-400'
                        : 'text-rose-400'
                      }`}>{entry.accuracy_pct}%</div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Podium Card for Top 3
const PodiumCard: React.FC<{
  entry: RankingEntry;
  position: number;
  isMe: boolean;
  getInitials: (name: string) => string;
}> = ({ entry, position, isMe, getInitials }) => {
  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
  const sizes = { 1: 'w-16 h-16', 2: 'w-12 h-12', 3: 'w-12 h-12' };
  const textSizes = { 1: 'text-[14px]', 2: 'text-[12px]', 3: 'text-[12px]' };
  const medalIcons = { 1: Crown, 2: Medal, 3: Award };
  const medalColors = { 1: 'text-yellow-400', 2: 'text-gray-300', 3: 'text-amber-600' };
  const MedalIcon = medalIcons[position as 1 | 2 | 3];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: position === 1 ? 0 : position === 2 ? 0.1 : 0.2 }}
      className={`flex flex-col items-center ${position === 1 ? 'order-2' : position === 2 ? 'order-1' : 'order-3'}`}
    >
      {/* Avatar */}
      <div className="relative mb-2">
        <div className={`${sizes[position as 1 | 2 | 3]} rounded-2xl flex items-center justify-center border-2 ${
          isMe ? 'bg-sky-600/30 border-sky-400' :
          position === 1 ? 'bg-yellow-400/10 border-yellow-400/40' :
          position === 2 ? 'bg-gray-400/10 border-gray-400/30' :
          'bg-amber-600/10 border-amber-600/30'
        }`}>
          <span className={`${textSizes[position as 1 | 2 | 3]} font-black ${isMe ? 'text-sky-300' : 'text-white'}`}>
            {getInitials(entry.full_name)}
          </span>
        </div>
        <div className={`absolute -top-2 -right-2 p-1 rounded-lg ${
          position === 1 ? 'bg-yellow-400/20' : position === 2 ? 'bg-gray-400/20' : 'bg-amber-600/20'
        }`}>
          <MedalIcon className={`w-3.5 h-3.5 ${medalColors[position as 1 | 2 | 3]}`} />
        </div>
      </div>

      {/* Name */}
      <span className={`text-[10px] font-black truncate max-w-[80px] text-center ${isMe ? 'text-sky-300' : 'text-white'}`}>
        {entry.full_name.split(' ')[0]}
      </span>
      {isMe && <span className="text-[7px] font-black uppercase tracking-widest text-sky-500/70">Você</span>}

      {/* Stats */}
      <span className="text-[13px] font-black text-white mt-1">{entry.total_hands.toLocaleString()}</span>
      <span className="text-[8px] font-bold text-gray-600">mãos</span>

      {/* Podium bar */}
      <div className={`${heights[position as 1 | 2 | 3]} w-20 mt-2 rounded-t-xl ${
        position === 1 ? 'bg-gradient-to-t from-yellow-600/20 to-yellow-400/10 border border-yellow-400/20 border-b-0' :
        position === 2 ? 'bg-gradient-to-t from-gray-600/20 to-gray-400/10 border border-gray-400/20 border-b-0' :
        'bg-gradient-to-t from-amber-700/20 to-amber-600/10 border border-amber-600/20 border-b-0'
      } flex items-center justify-center`}>
        <span className={`text-2xl font-black ${medalColors[position as 1 | 2 | 3]}`}>
          {position}
        </span>
      </div>
    </motion.div>
  );
};

export default RankingScreen;
