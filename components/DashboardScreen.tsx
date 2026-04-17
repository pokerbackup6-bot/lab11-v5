import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Trophy, Target, Clock, Layers, Flame, ChevronRight,
  Play, Zap, Heart, BookOpen, TrendingUp, Award, Star
} from 'lucide-react';
import { supabase } from '../utils/supabase.ts';
import { supabaseAdmin } from '../utils/supabaseAdmin.ts';
import { Scenario } from '../types.ts';
import { BannerCarousel, TopTicker } from './AdComponents.tsx';

interface DashboardStats {
  totalHands: number;
  correctHands: number;
  accuracyPct: number;
  totalSessions: number;
  totalTimeSeconds: number;
  currentStreak: number;
  longestStreak: number;
}

interface RankingEntry {
  user_id: string;
  full_name: string;
  total_hands: number;
  correct_hands: number;
  accuracy_pct: number;
}

interface RecentSession {
  id: string;
  scenario_name: string;
  started_at: string;
  total_hands: number;
  correct_hands: number;
  duration_seconds: number;
}

interface DashboardScreenProps {
  userId: string;
  userEmail: string;
  userName: string;
  scenarios: Scenario[];
  onNavigate: (view: string) => void;
  onStartTraining: (filter?: string) => void;
  onQuickTraining: () => void;
}

const BADGES = [
  { type: 'hands_100', label: '100 Mãos', icon: Layers, threshold: 100 },
  { type: 'hands_500', label: '500 Mãos', icon: Layers, threshold: 500 },
  { type: 'hands_1000', label: '1K Mãos', icon: Layers, threshold: 1000 },
  { type: 'hands_5000', label: '5K Mãos', icon: Star, threshold: 5000 },
  { type: 'hands_10000', label: '10K Mãos', icon: Award, threshold: 10000 },
  { type: 'streak_3', label: '3 Dias Seguidos', icon: Flame, threshold: 3, isStreak: true },
  { type: 'streak_7', label: '7 Dias Seguidos', icon: Flame, threshold: 7, isStreak: true },
  { type: 'streak_30', label: '30 Dias Seguidos', icon: Flame, threshold: 30, isStreak: true },
];

const formatTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    return `${m}min`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return 'Agora mesmo';
  if (diffH < 24) return `${diffH}h atrás`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'Ontem';
  if (diffD < 7) return `${diffD} dias atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const DashboardScreen: React.FC<DashboardScreenProps> = ({
  userId,
  userEmail,
  userName,
  scenarios,
  onNavigate,
  onStartTraining,
  onQuickTraining,
}) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalHands: 0, correctHands: 0, accuracyPct: 0,
    totalSessions: 0, totalTimeSeconds: 0, currentStreak: 0, longestStreak: 0,
  });
  const [weeklyRanking, setWeeklyRanking] = useState<RankingEntry[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentSession[]>([]);
  const [userBadges, setUserBadges] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const preflopCount = useMemo(() => scenarios.filter(s => s.street === 'PREFLOP').length, [scenarios]);
  const postflopCount = useMemo(() => scenarios.filter(s => s.street !== 'PREFLOP').length, [scenarios]);

  useEffect(() => {
    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadWeeklyRanking(),
      loadRecentSessions(),
      loadBadges(),
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    const { data, error } = await supabase.rpc('get_user_dashboard_stats', { p_user_id: userId });
    if (data && data.length > 0) {
      const row = data[0];
      setStats({
        totalHands: Number(row.total_hands) || 0,
        correctHands: Number(row.correct_hands) || 0,
        accuracyPct: Number(row.accuracy_pct) || 0,
        totalSessions: Number(row.total_sessions) || 0,
        totalTimeSeconds: Number(row.total_time_seconds) || 0,
        currentStreak: Number(row.current_streak) || 0,
        longestStreak: Number(row.longest_streak) || 0,
      });
    } else if (error) {
      console.warn('[Dashboard] Stats error:', error.message);
      // Fallback: query hand_history directly
      const { count } = await supabase.from('hand_history').select('*', { count: 'exact', head: true }).eq('user_id', userId);
      const { count: correctCount } = await supabase.from('hand_history').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('is_correct', true);
      if (count) {
        setStats(prev => ({
          ...prev,
          totalHands: count || 0,
          correctHands: correctCount || 0,
          accuracyPct: count > 0 ? Math.round(100 * (correctCount || 0) / count) : 0,
        }));
      }
    }
  };

  const loadWeeklyRanking = async () => {
    const { data, error } = await supabase.rpc('get_ranking_by_period', { p_days: 7 });
    if (data) {
      setWeeklyRanking(data.map((r: any) => ({
        ...r,
        full_name: r.full_name || 'Sem nome',
        total_hands: Number(r.total_hands) || 0,
        correct_hands: Number(r.correct_hands) || 0,
        accuracy_pct: Number(r.accuracy_pct) || 0,
      })));
    } else if (error) {
      console.warn('[Dashboard] Ranking RPC error, falling back:', error.message);
      // Fallback: aggregate hand_history from last 7 days (admin to bypass RLS)
      try {
        const since = new Date();
        since.setDate(since.getDate() - 7);
        const { data: hands } = await supabaseAdmin.from('hand_history').select('user_id, is_correct').gte('played_at', since.toISOString());
        if (hands && hands.length > 0) {
          const map = new Map<string, { total: number; correct: number }>();
          hands.forEach((h: any) => {
            const e = map.get(h.user_id) || { total: 0, correct: 0 };
            e.total++;
            if (h.is_correct) e.correct++;
            map.set(h.user_id, e);
          });
          const userIds = Array.from(map.keys());
          const { data: profiles } = await supabaseAdmin.from('profiles').select('id, full_name').in('id', userIds);
          const nameMap = new Map<string, string>();
          profiles?.forEach((p: any) => nameMap.set(p.id, p.full_name || 'Sem nome'));
          const ranking = Array.from(map.entries())
            .map(([uid, s]) => ({
              user_id: uid,
              full_name: nameMap.get(uid) || 'Sem nome',
              total_hands: s.total,
              correct_hands: s.correct,
              accuracy_pct: s.total > 0 ? Math.round(100 * s.correct / s.total) : 0,
            }))
            .sort((a, b) => b.total_hands - a.total_hands);
          setWeeklyRanking(ranking);
        }
      } catch (e) {
        console.warn('[Dashboard] Ranking fallback failed:', e);
      }
    }
  };

  const loadRecentSessions = async () => {
    const { data, error } = await supabase
      .from('training_sessions')
      .select('id, scenario_name, started_at, total_hands, correct_hands, duration_seconds')
      .eq('user_id', userId)
      .eq('is_active', false)
      .order('started_at', { ascending: false })
      .limit(5);
    if (data) setRecentSessions(data);
    // If table doesn't exist yet, just leave empty — no crash
    if (error) console.warn('[Dashboard] Sessions error (migration pending?):', error.message);
  };

  const loadBadges = async () => {
    const { data, error } = await supabase
      .from('user_badges')
      .select('badge_type')
      .eq('user_id', userId);
    if (data) setUserBadges(data.map(b => b.badge_type));
    if (error) console.warn('[Dashboard] Badges error (migration pending?):', error.message);
  };

  // Ranking motivacional
  const myRankIdx = weeklyRanking.findIndex(r => r.user_id === userId);
  const myRank = myRankIdx >= 0 ? weeklyRanking[myRankIdx] : null;
  const nextAbove = myRankIdx > 0 ? weeklyRanking[myRankIdx - 1] : null;
  const handsToOvertake = nextAbove && myRank ? nextAbove.total_hands - myRank.total_hands + 1 : 0;

  const firstName = userName?.split(' ')[0] || userEmail?.split('@')[0] || 'Jogador';

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600 text-[10px] font-black uppercase tracking-widest">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-y-auto pb-24 md:pb-8">
      <TopTicker />
      <div className="max-w-6xl mx-auto p-4 md:p-8">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-1">
            <h2 className="text-sky-500 text-[9px] font-black tracking-[0.3em] uppercase">PRO TRAINING</h2>
            {stats.currentStreak > 0 ? (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span className="text-[9px] font-black text-orange-400">{stats.currentStreak} dias</span>
                <span className="text-[8px] font-bold text-orange-400/60 hidden sm:inline">— Treine hoje e mantenha a sua ofensiva!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-500/5 border border-orange-500/10 rounded-lg">
                <Flame className="w-3.5 h-3.5 text-orange-500/50" />
                <span className="text-[8px] font-bold text-orange-400/50">Treine hoje e inicie sua ofensiva!</span>
              </div>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase">
            Olá, <span className="text-sky-400">{firstName}</span>
          </h1>
          <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase mt-1">
            {stats.totalHands > 0
              ? `${stats.totalHands.toLocaleString()} mãos treinadas no total`
              : 'Comece seu primeiro treino hoje'}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
        >
          <StatCard
            icon={Layers}
            label="Mãos Treinadas"
            value={stats.totalHands.toLocaleString()}
            color="sky"
          />
          <StatCard
            icon={Target}
            label="Precisão"
            value={`${stats.accuracyPct}%`}
            color={stats.accuracyPct >= 70 ? 'emerald' : stats.accuracyPct >= 50 ? 'amber' : 'rose'}
          />
          <StatCard
            icon={Clock}
            label="Tempo Total"
            value={formatTime(stats.totalTimeSeconds)}
            color="purple"
          />
          <StatCard
            icon={TrendingUp}
            label="Sessões"
            value={stats.totalSessions.toString()}
            color="indigo"
          />
        </motion.div>

        {/* Banner Promo */}
        <BannerCarousel />

        {/* Ranking Preview + Training Shortcuts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">

          {/* Ranking Motivacional */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="lg:col-span-2 bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] border border-white/5 rounded-3xl p-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-48 h-48 bg-yellow-500/5 blur-[80px] rounded-full -mr-24 -mt-24 pointer-events-none" />

            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-yellow-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300">Ranking Semanal</h3>
              </div>
              <button
                onClick={() => onNavigate('ranking')}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-600 hover:text-sky-400 transition-colors"
              >
                Ver Completo <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {weeklyRanking.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Trophy className="w-10 h-10 text-gray-800" />
                <p className="text-gray-700 text-[10px] font-bold text-center">
                  Nenhum treino registrado esta semana.<br />
                  Seja o primeiro!
                </p>
                <button
                  onClick={() => onStartTraining()}
                  className="mt-2 px-6 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-[10px] font-black uppercase tracking-widest text-white transition-all"
                >
                  Treinar Agora
                </button>
              </div>
            ) : (
              <>
                {/* Top 3 Mini */}
                <div className="space-y-2 mb-5">
                  {weeklyRanking.slice(0, 5).map((entry, idx) => {
                    const isMe = entry.user_id === userId;
                    const medals = ['text-yellow-400', 'text-gray-400', 'text-amber-600'];
                    return (
                      <div
                        key={entry.user_id}
                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                          isMe
                            ? 'bg-sky-600/10 border-sky-500/20'
                            : 'bg-white/[0.02] border-white/5'
                        }`}
                      >
                        <div className="w-6 text-center">
                          {idx < 3 ? (
                            <Trophy className={`w-3.5 h-3.5 ${medals[idx]}`} />
                          ) : (
                            <span className="text-[10px] font-black text-gray-600">#{idx + 1}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[11px] font-black truncate block ${isMe ? 'text-sky-300' : 'text-white'}`}>
                            {entry.full_name}
                            {isMe && <span className="text-sky-500/70 ml-1.5 text-[8px]">(VOCÊ)</span>}
                          </span>
                        </div>
                        <span className="text-[12px] font-black text-white tabular-nums">{entry.total_hands.toLocaleString()}</span>
                        <span className="text-[9px] font-bold text-gray-600">mãos</span>
                      </div>
                    );
                  })}
                </div>

                {/* Motivacional */}
                {myRank && nextAbove && handsToOvertake > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-gradient-to-r from-sky-600/10 to-purple-600/10 border border-sky-500/20 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="p-2.5 bg-sky-500/20 rounded-xl shrink-0">
                      <Zap className="w-5 h-5 text-sky-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-300">
                        Faltam apenas <span className="text-sky-400 font-black">{handsToOvertake} mãos</span> para ultrapassar{' '}
                        <span className="text-white font-black">{nextAbove.full_name}</span> na{' '}
                        <span className="text-yellow-400 font-black">{myRankIdx}ª posição</span>!
                      </p>
                    </div>
                    <button
                      onClick={() => onStartTraining()}
                      className="shrink-0 px-4 py-2.5 bg-sky-600 hover:bg-sky-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all shadow-lg shadow-sky-600/20"
                    >
                      Treinar
                    </button>
                  </motion.div>
                )}

                {/* Não está no ranking */}
                {!myRank && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="bg-gradient-to-r from-emerald-600/10 to-sky-600/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4"
                  >
                    <div className="p-2.5 bg-emerald-500/20 rounded-xl shrink-0">
                      <Play className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[11px] font-bold text-gray-300">
                        Você ainda não aparece no ranking semanal. Treine agora para entrar!
                      </p>
                    </div>
                    <button
                      onClick={() => onStartTraining()}
                      className="shrink-0 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-[9px] font-black uppercase tracking-widest text-white transition-all"
                    >
                      Começar
                    </button>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>

          {/* Training Shortcuts */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col gap-3"
          >
            {/* Pré-Flop */}
            <button
              onClick={() => onStartTraining('PREFLOP')}
              className="group relative bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 text-left hover:border-emerald-500/40 hover:shadow-[0_0_30px_-10px_rgba(16,185,129,0.2)] transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 blur-[40px] rounded-full -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-emerald-500/20 rounded-lg">
                  <Play className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Pré-Flop</h4>
                  <span className="text-[9px] font-bold text-gray-600">{preflopCount} cenários</span>
                </div>
              </div>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500/30 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Pós-Flop */}
            <button
              onClick={() => onStartTraining('POSTFLOP')}
              className="group relative bg-gradient-to-br from-sky-500/10 to-sky-500/5 border border-sky-500/20 rounded-2xl p-5 text-left hover:border-sky-500/40 hover:shadow-[0_0_30px_-10px_rgba(14,165,233,0.2)] transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/10 blur-[40px] rounded-full -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-sky-500/20 rounded-lg">
                  <Layers className="w-4 h-4 text-sky-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-sky-400">Pós-Flop</h4>
                  <span className="text-[9px] font-bold text-gray-600">{postflopCount} cenários</span>
                </div>
              </div>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500/30 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Treino Rápido */}
            <button
              onClick={onQuickTraining}
              className="group relative bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-2xl p-5 text-left hover:border-purple-500/40 hover:shadow-[0_0_30px_-10px_rgba(147,51,234,0.2)] transition-all overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-20 h-20 bg-purple-500/10 blur-[40px] rounded-full -mr-10 -mt-10 pointer-events-none" />
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <Zap className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h4 className="text-[11px] font-black uppercase tracking-wider text-purple-400">Treino Rápido</h4>
                  <span className="text-[9px] font-bold text-gray-600">Cenário aleatório</span>
                </div>
              </div>
              <ChevronRight className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-500/30 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
            </button>

            {/* Ver Todos */}
            <button
              onClick={() => onStartTraining()}
              className="group flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-500 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all"
            >
              <span className="text-[9px] font-black uppercase tracking-widest">Ver Todos os Cenários</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </motion.div>
        </div>

        {/* Bottom Row: Recent Sessions + Badges/Courses */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Últimas Sessões */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-sky-500" />
                Últimas Sessões
              </h3>
              <button
                onClick={() => onNavigate('history')}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-gray-600 hover:text-sky-400 transition-colors"
              >
                Histórico <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {recentSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Clock className="w-8 h-8 text-gray-800" />
                <p className="text-gray-700 text-[10px] font-bold text-center">
                  Nenhuma sessão finalizada ainda.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {recentSessions.map(session => {
                  const accuracy = session.total_hands > 0
                    ? Math.round(100 * session.correct_hands / session.total_hands)
                    : 0;
                  return (
                    <div
                      key={session.id}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-all"
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        accuracy >= 70 ? 'bg-emerald-500/10' : accuracy >= 50 ? 'bg-amber-500/10' : 'bg-rose-500/10'
                      }`}>
                        <span className={`text-[13px] font-black ${
                          accuracy >= 70 ? 'text-emerald-400' : accuracy >= 50 ? 'text-amber-400' : 'text-rose-400'
                        }`}>{accuracy}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black text-white truncate">{session.scenario_name || 'Sessão'}</div>
                        <div className="text-[9px] font-bold text-gray-600">
                          {session.total_hands} mãos · {formatTime(session.duration_seconds)}
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-gray-700 shrink-0">
                        {formatDate(session.started_at)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Conquistas + Conteúdos */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col gap-4"
          >
            {/* Conquistas */}
            <div className="bg-[#0f0f0f] border border-white/5 rounded-3xl p-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-300 flex items-center gap-2 mb-4">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                Conquistas
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {BADGES.map(badge => {
                  const unlocked = userBadges.includes(badge.type);
                  const progress = badge.isStreak
                    ? Math.min(100, (stats.longestStreak / badge.threshold) * 100)
                    : Math.min(100, (stats.totalHands / badge.threshold) * 100);
                  const Icon = badge.icon;
                  return (
                    <div
                      key={badge.type}
                      className={`relative flex flex-col items-center gap-1.5 p-3 rounded-2xl border transition-all ${
                        unlocked
                          ? 'bg-amber-500/10 border-amber-500/20'
                          : 'bg-white/[0.02] border-white/5 opacity-40'
                      }`}
                      title={badge.label}
                    >
                      <Icon className={`w-4 h-4 ${unlocked ? 'text-amber-400' : 'text-gray-600'}`} />
                      <span className={`text-[7px] font-black uppercase tracking-wider text-center leading-tight ${
                        unlocked ? 'text-amber-400' : 'text-gray-700'
                      }`}>{badge.label}</span>
                      {!unlocked && (
                        <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-500/40 rounded-full"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Card Conteúdos */}
            <button
              onClick={() => onNavigate('courses')}
              className="group bg-gradient-to-br from-[#0f0f0f] to-[#0a0a0a] border border-white/5 rounded-3xl p-6 text-left hover:border-sky-500/30 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-sky-500/10 rounded-2xl shrink-0 group-hover:bg-sky-500/20 transition-colors">
                  <BookOpen className="w-6 h-6 text-sky-400" />
                </div>
                <div className="flex-1">
                  <h4 className="text-[12px] font-black uppercase tracking-wider text-white mb-0.5">Conteúdos</h4>
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">Aulas e estratégias do Lab11</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-700 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.FC<any>;
  label: string;
  value: string;
  color: string;
}> = ({ icon: Icon, label, value, color }) => {
  const colorMap: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    sky:     { bg: 'bg-sky-500/5',     border: 'border-sky-500/10',     text: 'text-sky-400',     icon: 'text-sky-500' },
    emerald: { bg: 'bg-emerald-500/5', border: 'border-emerald-500/10', text: 'text-emerald-400', icon: 'text-emerald-500' },
    amber:   { bg: 'bg-amber-500/5',   border: 'border-amber-500/10',   text: 'text-amber-400',   icon: 'text-amber-500' },
    rose:    { bg: 'bg-rose-500/5',     border: 'border-rose-500/10',    text: 'text-rose-400',    icon: 'text-rose-500' },
    purple:  { bg: 'bg-purple-500/5',   border: 'border-purple-500/10',  text: 'text-purple-400',  icon: 'text-purple-500' },
    indigo:  { bg: 'bg-indigo-500/5',   border: 'border-indigo-500/10',  text: 'text-indigo-400',  icon: 'text-indigo-500' },
  };
  const c = colorMap[color] || colorMap.sky;
  return (
    <div className={`${c.bg} border ${c.border} rounded-2xl p-4 md:p-5`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`w-3.5 h-3.5 ${c.icon}`} />
        <span className="text-[8px] font-black uppercase tracking-widest text-gray-600">{label}</span>
      </div>
      <div className={`text-xl md:text-2xl font-black ${c.text}`}>{value}</div>
    </div>
  );
};

export default DashboardScreen;
