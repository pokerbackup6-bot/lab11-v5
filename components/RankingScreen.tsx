import React, { useState, useMemo } from 'react';
import { ArrowLeft, Trophy, Target, Layers } from 'lucide-react';

const MEMBERS_STORAGE_KEY = 'gto_members';
const USER_STATS_KEY = 'lab11_user_stats';

interface RankingEntry {
  email: string;
  name: string;
  totalHands: number;
  correctHands: number;
  accuracy: number;
}

interface RankingScreenProps {
  currentUser: string | null;
  onBack: () => void;
}

const MEDAL_COLORS = ['text-yellow-400', 'text-gray-400', 'text-amber-600'];
const MEDAL_BG = ['bg-yellow-400/10 border-yellow-400/20', 'bg-gray-400/10 border-gray-400/20', 'bg-amber-600/10 border-amber-600/20'];

const RankingScreen: React.FC<RankingScreenProps> = ({ currentUser, onBack }) => {
  const [sortBy, setSortBy] = useState<'hands' | 'accuracy'>('hands');

  const entries = useMemo((): RankingEntry[] => {
    const members: Array<{ name: string; email: string }> =
      JSON.parse(localStorage.getItem(MEMBERS_STORAGE_KEY) || '[]');
    const statsData: Record<string, { totalHands: number; correctHands: number }> =
      JSON.parse(localStorage.getItem(USER_STATS_KEY) || '{}');

    return members
      .map(m => {
        const s = statsData[m.email] || { totalHands: 0, correctHands: 0 };
        return {
          email: m.email,
          name: m.name,
          totalHands: s.totalHands,
          correctHands: s.correctHands,
          accuracy: s.totalHands > 0 ? Math.round((s.correctHands / s.totalHands) * 100) : 0,
        };
      })
      .filter(e => e.totalHands > 0)
      .sort((a, b) =>
        sortBy === 'hands'
          ? b.totalHands - a.totalHands || b.accuracy - a.accuracy
          : b.accuracy - a.accuracy || b.totalHands - a.totalHands
      );
  }, [sortBy]);

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map(w => w[0]).join('');

  return (
    <div className="w-full min-h-screen overflow-y-auto bg-[#050505] text-white">
      {/* Header */}
      <div className="flex items-center gap-4 p-8 border-b border-white/5">
        <button
          onClick={onBack}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-[13px] font-black uppercase tracking-[0.3em] text-white flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            Ranking
          </h1>
          <p className="text-[10px] text-gray-600 mt-0.5">
            {entries.length > 0 ? `${entries.length} jogador${entries.length > 1 ? 'es' : ''} com treinos registrados` : 'Nenhum treino registrado ainda'}
          </p>
        </div>

        {/* Sort Toggle */}
        <div className="flex bg-[#111] rounded-xl p-1 border border-white/5">
          <button
            onClick={() => setSortBy('hands')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              sortBy === 'hands' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            Mãos
          </button>
          <button
            onClick={() => setSortBy('accuracy')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              sortBy === 'accuracy' ? 'bg-sky-600 text-white shadow-sm' : 'text-gray-500 hover:text-white'
            }`}
          >
            <Target className="w-3 h-3" />
            Precisão
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto p-8">
        {entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Trophy className="w-12 h-12 text-gray-800" />
            <p className="text-gray-600 text-[11px] font-black uppercase tracking-widest text-center">
              Nenhum treino registrado ainda.<br />
              <span className="text-gray-700 normal-case font-normal tracking-normal text-[10px]">Os treinos aparecerão aqui após a primeira sessão.</span>
            </p>
          </div>
        ) : (
          <>
            {/* Column Headers */}
            <div className="flex items-center gap-4 px-4 mb-3">
              <div className="w-8 shrink-0" />
              <div className="w-10 shrink-0" />
              <div className="flex-1 text-[8px] font-black uppercase tracking-widest text-gray-700">Jogador</div>
              <div className="w-16 text-[8px] font-black uppercase tracking-widest text-gray-700 text-center">Mãos</div>
              <div className="w-16 text-[8px] font-black uppercase tracking-widest text-gray-700 text-center">Precisão</div>
            </div>

            <div className="space-y-2">
              {entries.map((entry, idx) => {
                const isMe = entry.email === currentUser;
                const isTop3 = idx < 3;
                return (
                  <div
                    key={entry.email}
                    className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                      isMe
                        ? 'bg-sky-600/10 border-sky-500/20'
                        : isTop3
                        ? `${MEDAL_BG[idx]} border`
                        : 'bg-[#111] border-white/5'
                    }`}
                  >
                    {/* Position */}
                    <div className="w-8 flex items-center justify-center shrink-0">
                      {isTop3 ? (
                        <Trophy className={`w-4 h-4 ${MEDAL_COLORS[idx]}`} />
                      ) : (
                        <span className="text-[11px] font-black text-gray-600">#{idx + 1}</span>
                      )}
                    </div>

                    {/* Avatar */}
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        isMe
                          ? 'bg-sky-600/30 border-sky-500/30'
                          : 'bg-white/5 border-white/5'
                      }`}
                    >
                      <span className={`text-[11px] font-black ${isMe ? 'text-sky-300' : 'text-gray-400'}`}>
                        {getInitials(entry.name)}
                      </span>
                    </div>

                    {/* Name */}
                    <div className="flex-1 min-w-0">
                      <div className={`text-[12px] font-black truncate ${isMe ? 'text-sky-300' : 'text-white'}`}>
                        {entry.name}
                      </div>
                      {isMe && (
                        <span className="text-[8px] font-black uppercase tracking-widest text-sky-500/70">Você</span>
                      )}
                    </div>

                    {/* Hands */}
                    <div className="w-16 text-center shrink-0">
                      <div className="text-[14px] font-black text-white">{entry.totalHands.toLocaleString()}</div>
                      {sortBy === 'hands' && (
                        <div className="mt-0.5 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500/60 rounded-full"
                            style={{ width: `${Math.min(100, (entry.totalHands / (entries[0]?.totalHands || 1)) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>

                    {/* Accuracy */}
                    <div className="w-16 text-center shrink-0">
                      <div className={`text-[14px] font-black ${
                        entry.accuracy >= 70 ? 'text-emerald-400'
                        : entry.accuracy >= 50 ? 'text-amber-400'
                        : 'text-rose-400'
                      }`}>
                        {entry.accuracy}%
                      </div>
                      {sortBy === 'accuracy' && (
                        <div className="mt-0.5 h-1 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              entry.accuracy >= 70 ? 'bg-emerald-500/60'
                              : entry.accuracy >= 50 ? 'bg-amber-500/60'
                              : 'bg-rose-500/60'
                            }`}
                            style={{ width: `${entry.accuracy}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default RankingScreen;
