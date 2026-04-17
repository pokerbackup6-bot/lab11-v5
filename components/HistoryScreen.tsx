import React, { useState, useMemo, useEffect } from 'react';
import { ArrowLeft, History, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock, Target, TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react';
import { supabase } from '../utils/supabase.ts';

const SESSION_HISTORY_KEY = 'lab11_session_history';

interface WrongHand {
  hand: string;
  action: string;
  correctAction: string;
  isTimeout?: boolean;
}

export interface SessionRecord {
  id: string;
  email: string;
  scenarioName: string;
  date: string;
  totalHands: number;
  correctHands: number;
  durationSeconds: number;
  wrongHands: WrongHand[];
}

interface HistoryScreenProps {
  currentUser: string;
  onBack: () => void;
}

const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

const formatTotalTime = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) +
    ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const normalizeAction = (action: string): 'FOLD' | 'CALL' | 'RAISE' => {
  const u = (action || '').toUpperCase().trim();
  if (u.includes('FOLD')) return 'FOLD';
  if (u.includes('CALL')) return 'CALL';
  return 'RAISE';
};

const accColor = (acc: number) =>
  acc >= 70 ? '#34d399' : acc >= 50 ? '#fbbf24' : '#f87171';

const accClass = (acc: number) =>
  acc >= 70 ? 'text-emerald-400' : acc >= 50 ? 'text-amber-400' : 'text-rose-400';

const Sparkline: React.FC<{ data: number[] }> = ({ data }) => {
  if (data.length < 2) return null;
  const H = 60;
  const min = Math.max(0, Math.min(...data) - 8);
  const max = Math.min(100, Math.max(...data) + 8);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = H - ((v - min) / range) * H;
    return [x, y] as [number, number];
  });
  const polyline = pts.map(([x, y]) => `${x},${y}`).join(' ');
  const last = data[data.length - 1];
  const col = accColor(last);
  return (
    <svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className="w-full h-16">
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.15" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${H} ${polyline} 100,${H}`}
        fill="url(#sparkGrad)"
      />
      <polyline points={polyline} fill="none" stroke={col} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill={col} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
};

const HistoryScreen: React.FC<HistoryScreenProps> = ({ currentUser, onBack }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'performance' | 'historico'>('performance');
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        // Buscar user_id a partir do email
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id;

        // Buscar do Supabase
        let query = supabase
          .from('hand_history')
          .select('training_session_id, scenario_name, is_correct, is_timeout, user_action, correct_action, hero_cards, hand_key, played_at')
          .order('played_at', { ascending: true });
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          // Agrupar por training_session_id
          const sessionMap = new Map<string, typeof data>();
          data.forEach(row => {
            const sid = row.training_session_id || `legacy_${row.played_at}`;
            if (!sessionMap.has(sid)) sessionMap.set(sid, []);
            sessionMap.get(sid)!.push(row);
          });

          const built: SessionRecord[] = [];
          sessionMap.forEach((hands, sid) => {
            const totalHands = hands.length;
            const correctHands = hands.filter(h => h.is_correct).length;
            const wrongHands: WrongHand[] = hands
              .filter(h => !h.is_correct)
              .map(h => ({
                hand: (h.hero_cards as string[] | null)?.join(' ') || h.hand_key || '??',
                action: h.user_action,
                correctAction: h.correct_action,
                isTimeout: h.is_timeout,
              }));
            const firstDate = hands[0].played_at;
            const lastDate = hands[hands.length - 1].played_at;
            const durationSeconds = Math.round(
              (new Date(lastDate).getTime() - new Date(firstDate).getTime()) / 1000
            );
            built.push({
              id: sid,
              email: currentUser,
              scenarioName: hands[0].scenario_name || 'Treino',
              date: firstDate,
              totalHands,
              correctHands,
              durationSeconds: Math.max(durationSeconds, 0),
              wrongHands,
            });
          });

          // Mais recente primeiro
          built.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setSessions(built);
          return;
        }
      } catch {
        // Fallback abaixo
      }

      // Fallback: localStorage
      const all: Record<string, SessionRecord[]> = JSON.parse(localStorage.getItem(SESSION_HISTORY_KEY) || '{}');
      setSessions((all[currentUser] || []).slice().reverse());
    };

    load().finally(() => setLoading(false));
  }, [currentUser]);

  const perf = useMemo(() => {
    if (sessions.length === 0) return null;

    const totalHands = sessions.reduce((a, s) => a + s.totalHands, 0);
    const totalCorrect = sessions.reduce((a, s) => a + s.correctHands, 0);
    const totalDuration = sessions.reduce((a, s) => a + s.durationSeconds, 0);
    const overallAccuracy = totalHands > 0 ? Math.round((totalCorrect / totalHands) * 100) : 0;
    const avgHandsPerSession = Math.round(totalHands / sessions.length);

    const withAcc = sessions.map(s => ({
      ...s,
      acc: s.totalHands > 0 ? Math.round((s.correctHands / s.totalHands) * 100) : 0,
    }));

    const bestAcc = Math.max(...withAcc.map(s => s.acc));

    // Trend: últimas 5 vs 5 anteriores
    const recent = withAcc.slice(0, Math.min(5, withAcc.length));
    const older = withAcc.slice(5, Math.min(10, withAcc.length));
    const recentAvg = recent.reduce((a, b) => a + b.acc, 0) / recent.length;
    const olderAvg = older.length > 0 ? older.reduce((a, b) => a + b.acc, 0) / older.length : recentAvg;
    const trend = older.length > 0 ? Math.round(recentAvg - olderAvg) : 0;

    // Streak de dias consecutivos
    const uniqueDates = [...new Set(sessions.map(s => {
      const d = new Date(s.date);
      d.setHours(0, 0, 0, 0);
      return d.getTime();
    }))].sort((a, b) => b - a);
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let cursor = today.getTime();
    for (const ts of uniqueDates) {
      const diff = Math.round((cursor - ts) / (1000 * 60 * 60 * 24));
      if (diff <= 1) { streak++; cursor = ts; } else break;
    }

    // Sessões nos últimos 7 dias
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sessionsThisWeek = sessions.filter(s => new Date(s.date).getTime() >= weekAgo).length;

    // Timeouts
    const allWrong = sessions.flatMap(s => s.wrongHands);
    const timeouts = allWrong.filter(w => w.isTimeout).length;
    const timeoutRate = allWrong.length > 0 ? Math.round((timeouts / allWrong.length) * 100) : 0;

    // Viés de ação
    const byCorrect: Record<string, number> = { FOLD: 0, CALL: 0, RAISE: 0 };
    const byWrongAction: Record<string, number> = { FOLD: 0, CALL: 0, RAISE: 0 };
    for (const wh of allWrong) {
      const ca = normalizeAction(wh.correctAction);
      const wa = normalizeAction(wh.action);
      byCorrect[ca]++;
      byWrongAction[wa]++;
    }
    const topWrongAction = Object.entries(byWrongAction).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
    let biasLabel = '';
    let biasTip = '';
    if (allWrong.length >= 10) {
      if (topWrongAction === 'FOLD') {
        biasLabel = 'Muito Tight';
        biasTip = 'Você tende a fazer fold mais do que o ótimo. Foque em reconhecer spots de call e 3bet.';
      } else if (topWrongAction === 'RAISE') {
        biasLabel = 'Muito Agressivo';
        biasTip = 'Você tende a apostar/raisear em spots que pedem passividade. Pratique fold e call.';
      } else if (topWrongAction === 'CALL') {
        biasLabel = 'Calling Station';
        biasTip = 'Você tende a chamar demais. Pratique reconhecer spots de fold e raise.';
      }
    }

    // Por cenário
    const scenarioMap: Record<string, { sessions: number; hands: number; correct: number }> = {};
    for (const s of sessions) {
      if (!scenarioMap[s.scenarioName]) scenarioMap[s.scenarioName] = { sessions: 0, hands: 0, correct: 0 };
      scenarioMap[s.scenarioName].sessions++;
      scenarioMap[s.scenarioName].hands += s.totalHands;
      scenarioMap[s.scenarioName].correct += s.correctHands;
    }
    const byScenario = Object.entries(scenarioMap)
      .map(([name, d]) => ({
        name, sessions: d.sessions, hands: d.hands,
        accuracy: d.hands > 0 ? Math.round((d.correct / d.hands) * 100) : 0,
      }))
      .sort((a, b) => b.hands - a.hands);

    const worstScenarios = [...byScenario]
      .filter(s => s.hands >= 5)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5);

    const sparklineData = withAcc.slice(0, Math.min(12, withAcc.length)).reverse().map(s => s.acc);

    return {
      totalHands, totalDuration, overallAccuracy, avgHandsPerSession,
      bestAcc, trend, streak, sessionsThisWeek, timeoutRate,
      byCorrect, byWrongAction, biasLabel, biasTip,
      totalWrong: allWrong.length,
      byScenario, worstScenarios, sparklineData,
    };
  }, [sessions]);

  return (
    <div className="w-full h-screen overflow-y-auto bg-[#050505] text-white">
      {/* Header */}
      <div className="flex items-center gap-4 p-6 border-b border-white/5">
        <button onClick={onBack} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[13px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
            <History className="w-4 h-4 text-sky-400" />
            Histórico & Performance
          </h1>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {sessions.length} sessão{sessions.length !== 1 ? 'ões' : ''} registrada{sessions.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 px-6">
        {(['performance', 'historico'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-5 text-[10px] font-black uppercase tracking-widest transition-all border-b-2 -mb-px ${
              activeTab === tab
                ? 'text-white border-sky-400'
                : 'text-gray-600 border-transparent hover:text-gray-400'
            }`}
          >
            {tab === 'performance' ? 'Performance' : 'Histórico'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-6 h-6 border-2 border-sky-400/30 border-t-sky-400 rounded-full animate-spin" />
          <p className="text-gray-700 text-[10px] uppercase tracking-widest font-black">Carregando...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <History className="w-12 h-12 text-gray-800" />
          <p className="text-gray-600 text-[11px] font-black uppercase tracking-widest text-center">
            Nenhuma sessão registrada ainda.<br />
            <span className="text-gray-700 normal-case font-normal tracking-normal text-[10px]">
              Complete um treino para ver o histórico aqui.
            </span>
          </p>
        </div>
      ) : (
        <div className="max-w-2xl mx-auto p-6 space-y-5">

          {/* ── PERFORMANCE ── */}
          {activeTab === 'performance' && perf && (<>

            {/* KPIs */}
            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600 mb-3">Visão Geral</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Total de Mãos',   value: perf.totalHands.toLocaleString('pt-BR'), cls: 'text-white' },
                  { label: 'Precisão Geral',  value: `${perf.overallAccuracy}%`,               cls: accClass(perf.overallAccuracy) },
                  { label: 'Sessões',          value: String(sessions.length),                  cls: 'text-white' },
                  { label: 'Tempo Total',      value: formatTotalTime(perf.totalDuration),      cls: 'text-sky-400' },
                  { label: 'Média / Sessão',   value: `${perf.avgHandsPerSession} mãos`,        cls: 'text-gray-300' },
                  { label: 'Melhor Sessão',    value: `${perf.bestAcc}%`,                       cls: 'text-emerald-400' },
                  { label: 'Taxa Timeout',     value: `${perf.timeoutRate}%`,                   cls: perf.timeoutRate > 20 ? 'text-rose-400' : 'text-gray-400' },
                  { label: 'Últimos 7 Dias',   value: `${perf.sessionsThisWeek} sess.`,         cls: 'text-white' },
                  { label: 'Sequência',        value: `${perf.streak} dia${perf.streak !== 1 ? 's' : ''}`, cls: perf.streak >= 3 ? 'text-amber-400' : 'text-gray-400' },
                ].map(({ label, value, cls }) => (
                  <div key={label} className="bg-[#111] border border-white/5 rounded-xl p-3 text-center">
                    <div className="text-[7px] text-gray-600 uppercase font-black tracking-widest mb-1.5 leading-tight">{label}</div>
                    <div className={`text-[17px] font-black leading-none ${cls}`}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Tendência */}
            {perf.sparklineData.length >= 3 && (
              <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600">Tendência de Precisão</p>
                    <p className="text-[10px] text-gray-600 mt-0.5">Últimas {perf.sparklineData.length} sessões</p>
                  </div>
                  <div className={`flex items-center gap-1.5 text-[11px] font-black px-3 py-1.5 rounded-lg ${
                    perf.trend > 0 ? 'text-emerald-400 bg-emerald-500/10' :
                    perf.trend < 0 ? 'text-rose-400 bg-rose-500/10' :
                    'text-gray-500 bg-white/5'
                  }`}>
                    {perf.trend > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
                     perf.trend < 0 ? <TrendingDown className="w-3.5 h-3.5" /> :
                     <Minus className="w-3.5 h-3.5" />}
                    {perf.trend > 0 ? `+${perf.trend}%` : perf.trend < 0 ? `${perf.trend}%` : 'Estável'}
                  </div>
                </div>
                <Sparkline data={perf.sparklineData} />
                <div className="flex justify-between mt-1">
                  <span className="text-[8px] text-gray-700">Mais antiga</span>
                  <span className="text-[8px] text-gray-700">Mais recente</span>
                </div>
              </div>
            )}

            {/* Por Cenário */}
            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-white/5">
                <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600">Performance por Cenário</p>
              </div>
              <div className="divide-y divide-white/5">
                {perf.byScenario.map((s, i) => (
                  <div key={s.name} className="px-5 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <span className="text-[9px] text-gray-700 font-black w-4 shrink-0">{i + 1}</span>
                        <span className="text-[11px] font-black text-white truncate">{s.name}</span>
                      </div>
                      <span className={`text-[12px] font-black shrink-0 ml-3 ${accClass(s.accuracy)}`}>{s.accuracy}%</span>
                    </div>
                    <div className="flex items-center gap-3 pl-6">
                      <div className="flex-1 h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${s.accuracy}%`, backgroundColor: accColor(s.accuracy) }} />
                      </div>
                      <span className="text-[8px] text-gray-700 shrink-0">{s.hands} mãos · {s.sessions} sess.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Viés de Decisão */}
            <div className="bg-[#111] border border-white/5 rounded-2xl p-5">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600">Viés de Decisão</p>
                  <p className="text-[10px] text-gray-600 mt-1">Onde você erra — e como</p>
                </div>
                {perf.biasLabel && (
                  <span className="text-[9px] font-black uppercase tracking-widest text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1.5 rounded-lg shrink-0 ml-3">
                    {perf.biasLabel}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {(['FOLD', 'CALL', 'RAISE'] as const).map(action => {
                  const missed = perf.byCorrect[action] || 0;
                  const actedWrong = perf.byWrongAction[action] || 0;
                  const pctMissed = perf.totalWrong > 0 ? Math.round((missed / perf.totalWrong) * 100) : 0;
                  const colors: Record<string, string> = { FOLD: '#f87171', CALL: '#60a5fa', RAISE: '#34d399' };
                  const col = colors[action];
                  return (
                    <div key={action}>
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: col }}>{action}</span>
                          <span className="text-[8px] text-gray-700">deveria {action.toLowerCase()}, mas errou</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-black text-gray-500">{missed}x</span>
                          <span className="text-[8px] text-gray-700">({pctMissed}%)</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pctMissed}%`, backgroundColor: col, opacity: 0.75 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              {perf.biasTip && (
                <p className="text-[10px] text-gray-600 mt-4 pt-4 border-t border-white/5 leading-relaxed">
                  {perf.biasTip}
                </p>
              )}
            </div>

            {/* Pior Performance */}
            {perf.worstScenarios.length > 0 && (
              <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                  <p className="text-[8px] font-black uppercase tracking-[0.3em] text-gray-600">Pior Performance</p>
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500/40" />
                </div>
                <div className="divide-y divide-white/5">
                  {perf.worstScenarios.map((s, i) => (
                    <div key={s.name} className="px-5 py-4 flex items-center gap-4">
                      <span className="text-[10px] font-black text-gray-700 w-4 shrink-0 text-center">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-white truncate mb-2">{s.name}</p>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-rose-500/60" style={{ width: `${s.accuracy}%` }} />
                        </div>
                      </div>
                      <span className="text-[15px] font-black text-rose-400 shrink-0">{s.accuracy}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </>)}

          {/* ── HISTÓRICO ── */}
          {activeTab === 'historico' && (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isExpanded = expandedId === session.id;
                const accuracy = session.totalHands > 0
                  ? Math.round((session.correctHands / session.totalHands) * 100) : 0;
                const wrongCount = session.wrongHands.length;
                return (
                  <div key={session.id} className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden">
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : session.id)}
                      className="w-full flex items-center gap-4 p-4 text-left hover:bg-white/5 transition-all"
                    >
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 font-black text-[11px] ${
                        accuracy >= 70 ? 'bg-emerald-500/10 text-emerald-400' :
                        accuracy >= 50 ? 'bg-amber-500/10 text-amber-400' :
                        'bg-rose-500/10 text-rose-400'
                      }`}>{accuracy}%</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-black text-white truncate">{session.scenarioName}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[9px] text-gray-600 font-mono">{formatDate(session.date)}</span>
                          <span className="flex items-center gap-1 text-[9px] text-gray-600">
                            <Clock className="w-2.5 h-2.5" />
                            {formatDuration(session.durationSeconds)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-center">
                          <div className="text-[13px] font-black text-white">{session.totalHands}</div>
                          <div className="text-[7px] text-gray-600 uppercase tracking-widest">Mãos</div>
                        </div>
                        <div className="text-center">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-400" />
                            <span className="text-[12px] font-black text-emerald-400">{session.correctHands}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <XCircle className="w-3 h-3 text-rose-400" />
                            <span className="text-[12px] font-black text-rose-400">{wrongCount}</span>
                          </div>
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-600" /> : <ChevronDown className="w-4 h-4 text-gray-600" />}
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t border-white/5 p-4 space-y-2">
                        {wrongCount === 0 ? (
                          <div className="flex items-center gap-2 py-3 justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                            <span className="text-[11px] text-emerald-400 font-black uppercase tracking-widest">Sessão Perfeita!</span>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 mb-3">
                              <Target className="w-3.5 h-3.5 text-rose-400" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">
                                {wrongCount} mão{wrongCount > 1 ? 's' : ''} errada{wrongCount > 1 ? 's' : ''}
                              </span>
                            </div>
                            {session.wrongHands.map((wh, i) => (
                              <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-3 space-y-1.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-[12px] font-black text-white font-mono">{wh.hand}</span>
                                  {wh.isTimeout && (
                                    <span className="text-[9px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded font-black">TIMEOUT</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1.5">
                                    <XCircle className="w-3 h-3 text-rose-400 shrink-0" />
                                    <span className="text-[10px] text-rose-400 font-black uppercase">{wh.action}</span>
                                  </div>
                                  <span className="text-gray-700 text-[9px]">→</span>
                                  <div className="flex items-center gap-1.5">
                                    <CheckCircle className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span className="text-[10px] text-emerald-400 font-black uppercase">{wh.correctAction}</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default HistoryScreen;
