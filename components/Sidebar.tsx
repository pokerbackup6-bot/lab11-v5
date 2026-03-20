import React, { useState } from 'react';
import RangeMatrix from './RangeMatrix.tsx';
import { HandRecord, RangeData, TrainingGoal } from '../types.ts';
import { motion, AnimatePresence } from 'motion/react';
import {
  Settings,
  RotateCcw,
  Square,
  Info,
  Users,
  Edit3,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronLeft,
  LogOut,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  BarChart3,
  History,
  Target,
  Pin,
  PinOff,
  Menu,
  Trophy,
  UserCircle
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  isOpen: boolean;
  isPinned: boolean;
  onToggle: () => void;
  onTogglePin: () => void;
  onToggleFocusMode: () => void;
  onStopTreino: () => void;
  onRestartTreino: () => void;
  onShowSpotInfo: () => void;
  onShowConfig: () => void;
  onShowScenarioCreator?: () => void;
  onShowAdminMember?: () => void;
  onBackToSelection?: () => void;
  onShowProfile?: () => void;
  onShowRanking?: () => void;
  onShowHistory?: () => void;
  onLogout?: () => void;
  currentUser?: string | null;
  history: HandRecord[];
  ranges?: RangeData;
  customActions?: string[];
  selectedHand?: string | null;
  board?: string[];
  trainingGoal?: TrainingGoal;
  sessionElapsedSeconds: number;
}

const CUSTOM_PALETTE = [
  '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6',
];

const getActionColor = (label: string, index: number): string => {
  const l = label.toLowerCase();
  if (l.includes('fold')) return '#334155';
  if (l.includes('check')) return '#0ea5e9';
  if (l.includes('call') || l.includes('pagar') || l === 'limp') return '#2563eb';

  // Mesmas cores do criador de cenários
  if (l.includes('baixo') || l.includes('30%')) return '#10b981'; // Verde
  if (l.includes('médio') || l.includes('medio') || l.includes('50%')) return '#f59e0b'; // Amber
  if (l.includes('alto') || l.includes('80%')) return '#f97316'; // Laranja
  if (l.includes('overbet') || l.includes('125%')) return '#ef4444'; // Vermelho

  if (l.includes('all-in') || l.includes('shove')) return '#ef4444';
  if (l.includes('raise') || l === 'rfi' || l.includes('3-bet') || l.includes('4-bet') || l.includes('aumentar') || l.includes('iso') || l.includes('bet')) return '#10b981';

  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
};

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  isPinned,
  onToggle,
  onTogglePin,
  onToggleFocusMode,
  onStopTreino,
  onRestartTreino,
  onShowSpotInfo,
  onShowConfig,
  onShowScenarioCreator,
  onShowAdminMember,
  onBackToSelection: _onBackToSelection,
  onShowProfile,
  onShowRanking,
  onShowHistory,
  onLogout,
  currentUser,
  history,
  ranges,
  customActions = ['Fold', 'Call', 'Raise', 'All-In'],
  selectedHand = null,
  board = [],
  trainingGoal,
  sessionElapsedSeconds
}) => {
  const [activeAccordion, setActiveAccordion] = useState<string | null>('gestao');
  const [rangeVisible, setRangeVisible] = useState<boolean>(
    () => localStorage.getItem('lab11_range_visible') !== 'false'
  );

  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };

  const toggleRangeVisible = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRangeVisible(prev => {
      const next = !prev;
      localStorage.setItem('lab11_range_visible', String(next));
      return next;
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const correctCount = history.filter(h => h.status === 'correct').length;
  const incorrectCount = history.filter(h => h.status === 'incorrect').length;
  const timeoutCount = history.filter(h => h.isTimeout).length;
  const precision = history.length > 0 ? Math.round((correctCount / history.length) * 100) : 0;

  const isAdmin = currentUser === 'gabrielfmacedo@ymail.com' || currentUser === 'pokerbackup6@gmail.com';

  let progressPercent = 0;
  let progressText = "";

  if (trainingGoal) {
    if (trainingGoal.type === 'hands') {
      progressPercent = (history.length / trainingGoal.value) * 100;
      progressText = `${history.length} / ${trainingGoal.value} MÃOS`;
    } else if (trainingGoal.type === 'time') {
      const targetSeconds = trainingGoal.value * 60;
      progressPercent = (sessionElapsedSeconds / targetSeconds) * 100;
      progressText = `${formatTime(sessionElapsedSeconds)} / ${formatTime(targetSeconds)}`;
    } else {
      progressPercent = 0;
      progressText = `${history.length} MÃOS JOGADAS`;
    }
  }

  return (
    <AnimatePresence mode="wait">
      {!isOpen ? (
        <motion.button 
          key="reopen-btn"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          onClick={onToggle}
          className="fixed left-6 top-6 z-[101] w-12 h-12 bg-sky-600 border border-sky-400 text-white rounded-2xl flex items-center justify-center hover:bg-sky-500 transition-all shadow-[0_8px_20px_rgba(14,165,233,0.3)] active:scale-90"
          title="Abrir Menu"
        >
          <Menu className="w-6 h-6" strokeWidth={3} />
        </motion.button>
      ) : (
        <motion.div 
          key="sidebar"
          initial={{ x: -320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -320, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-[#0a0a0a]/90 backdrop-blur-2xl border-r border-white/5 z-[100] flex flex-col shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-white/5 flex justify-between items-start shrink-0">
            <div>
              <h2 className="text-sky-400 font-black text-[9px] tracking-[0.2em] uppercase mb-1">PRO TRAINING</h2>
              <h1 className="text-white font-black text-xl leading-tight uppercase tracking-tighter">LAB11</h1>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-gray-500 text-[9px] font-black uppercase tracking-widest">Sessão Ativa</span>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={onTogglePin} 
                className={cn(
                  "p-2.5 transition-all rounded-xl border",
                  isPinned 
                    ? "bg-sky-500/20 border-sky-500/30 text-sky-400 shadow-[0_0_15px_rgba(14,165,233,0.1)]" 
                    : "bg-white/5 border-white/10 text-gray-500 hover:text-white"
                )}
              >
                {isPinned ? <Pin className="w-4 h-4" /> : <PinOff className="w-4 h-4" />}
              </button>
              
              <button 
                onClick={onToggle} 
                className="p-2.5 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/10"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4 bg-white/[0.02] border-b border-white/5 shrink-0">
            <div className="flex justify-between items-end mb-2.5">
              <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Progresso</span>
              <span className="text-[10px] font-mono font-black text-white">{progressText}</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden relative">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progressPercent, 100)}%` }}
                className="h-full bg-sky-500 rounded-full shadow-[0_0_12px_rgba(56,189,248,0.6)] relative z-10"
              />
              <div className="absolute inset-0 bg-sky-500/10 blur-sm"></div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
            {/* Gestão de Treino */}
            <section className="border-b border-white/5">
              <button 
                onClick={() => toggleAccordion('gestao')}
                className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500 group-hover:scale-110 transition-transform">
                    <Target className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-300">Gestão</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-gray-600 transition-transform duration-300", activeAccordion === 'gestao' && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {activeAccordion === 'gestao' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <button 
                          onClick={onShowConfig}
                          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all group"
                        >
                          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Ajustes</span>
                        </button>
                        <button 
                          onClick={onRestartTreino}
                          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/10 transition-all group"
                        >
                          <RotateCcw className="w-4 h-4 group-hover:-rotate-45 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Reiniciar</span>
                        </button>
                        <button 
                          onClick={onShowSpotInfo}
                          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 text-sky-400 hover:bg-sky-500/10 transition-all group"
                        >
                          <Info className="w-4 h-4 group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Spot Info</span>
                        </button>
                        <button 
                          onClick={onStopTreino}
                          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-rose-500/5 border border-rose-500/10 text-rose-400 hover:bg-rose-500/10 transition-all group"
                        >
                          <Square className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Parar</span>
                        </button>
                      </div>

                      <button 
                        onClick={onToggleFocusMode}
                        className="w-full flex items-center justify-between p-4 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 text-indigo-400 hover:bg-indigo-500/10 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <Eye className="w-4 h-4" />
                          <span className="text-[9px] font-black uppercase tracking-widest">Modo Foco</span>
                        </div>
                        <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"></div>
                      </button>

                      {isAdmin && (
                        <div className="space-y-2 pt-2">
                          <button 
                            onClick={onShowAdminMember}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 transition-all group"
                          >
                            <Users className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Membros</span>
                          </button>
                          <button 
                            onClick={onShowScenarioCreator}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-sky-500/5 border border-sky-500/10 text-sky-400 hover:bg-sky-500/10 transition-all group"
                          >
                            <Edit3 className="w-4 h-4" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Criador</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Estratégia */}
            <section className="border-b border-white/5">
              <button 
                onClick={() => toggleAccordion('estrategia')}
                className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500 group-hover:scale-110 transition-transform">
                    <Activity className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-300">Estratégia</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={toggleRangeVisible}
                    title={rangeVisible ? 'Ocultar range' : 'Mostrar range'}
                    className={cn(
                      "p-1.5 rounded-lg border transition-all",
                      rangeVisible
                        ? "bg-purple-500/10 border-purple-500/20 text-purple-400 hover:bg-purple-500/20"
                        : "bg-white/5 border-white/10 text-gray-600 hover:text-gray-400"
                    )}
                  >
                    {rangeVisible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                  </button>
                  <ChevronDown className={cn("w-4 h-4 text-gray-600 transition-transform duration-300", activeAccordion === 'estrategia' && "rotate-180")} />
                </div>
              </button>
              
              <AnimatePresence>
                {activeAccordion === 'estrategia' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6">
                      <div className="bg-black/40 rounded-2xl p-4 border border-white/5">
                        {rangeVisible ? (
                          <>
                            <div className="mb-4">
                              <RangeMatrix ranges={ranges} customActions={customActions} selectedHand={selectedHand} board={board} />
                            </div>
                            <div className="flex flex-wrap gap-3">
                              {customActions.map((action, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <div
                                    className="w-2.5 h-2.5 rounded-[3px] border border-white/10"
                                    style={{ backgroundColor: getActionColor(action, idx) }}
                                  ></div>
                                  <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest">{action}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center gap-2 py-6">
                            <EyeOff className="w-5 h-5 text-gray-700" />
                            <span className="text-[9px] text-gray-700 font-black uppercase tracking-widest">Range oculto</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Performance */}
            <section className="border-b border-white/5">
              <button 
                onClick={() => toggleAccordion('performance')}
                className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500 group-hover:scale-110 transition-transform">
                    <BarChart3 className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-300">Performance</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-gray-600 transition-transform duration-300", activeAccordion === 'performance' && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {activeAccordion === 'performance' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-4">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                          <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block mb-1">Acertos</span>
                          <div className="text-xl font-black text-emerald-500">{correctCount}</div>
                        </div>
                        <div className="bg-black/40 p-4 rounded-2xl border border-white/5 text-center">
                          <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest block mb-1">Erros</span>
                          <div className="text-xl font-black text-rose-500">{incorrectCount}</div>
                        </div>
                      </div>
                      
                      {timeoutCount > 0 && (
                        <div className="bg-amber-500/5 p-4 rounded-2xl border border-amber-500/10 text-center">
                          <span className="text-[8px] text-amber-500/60 uppercase font-black tracking-widest block mb-1">Timeouts</span>
                          <div className="text-xl font-black text-amber-500">{timeoutCount}</div>
                        </div>
                      )}

                      <div className="bg-black/40 p-4 rounded-2xl border border-white/5">
                        <div className="flex justify-between items-end mb-3">
                          <span className="text-[8px] text-gray-600 uppercase font-black tracking-widest">Precisão</span>
                          <span className="text-sm font-black text-sky-400">{precision}%</span>
                        </div>
                        <div className="flex h-3 gap-0.5 rounded-full overflow-hidden bg-white/5 p-0.5">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${precision}%` }}
                            className="bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.4)]" 
                          />
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${history.length > 0 ? 100 - precision : 0}%` }}
                            className="bg-rose-500 rounded-full" 
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>

            {/* Histórico */}
            <section className="border-b border-white/5">
              <button 
                onClick={() => toggleAccordion('historico')}
                className="w-full p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-sky-500/10 text-sky-500 group-hover:scale-110 transition-transform">
                    <History className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-300">Histórico</span>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-gray-600 transition-transform duration-300", activeAccordion === 'historico' && "rotate-180")} />
              </button>
              
              <AnimatePresence>
                {activeAccordion === 'historico' && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-6 space-y-1">
                      {history.length === 0 ? (
                        <div className="text-[9px] text-gray-600 font-black uppercase text-center py-12 tracking-[0.2em]">Sem dados</div>
                      ) : (
                        [...history].reverse().slice(0, 8).map((hand) => (
                          <motion.div 
                            key={hand.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-all border border-transparent hover:border-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                "w-8 h-8 rounded-xl flex items-center justify-center transition-colors",
                                hand.isTimeout ? 'bg-amber-500/10 text-amber-500' : 
                                hand.status === 'correct' ? 'bg-emerald-500/10 text-emerald-500' : 
                                'bg-rose-500/10 text-rose-500'
                              )}>
                                {hand.isTimeout ? <Clock className="w-4 h-4" /> : 
                                 hand.status === 'correct' ? <CheckCircle2 className="w-4 h-4" /> : 
                                 <XCircle className="w-4 h-4" />}
                              </div>
                              <div>
                                <div className="text-[11px] font-mono font-black text-white uppercase tracking-tighter">{hand.cards}</div>
                                <div className="text-[8px] text-gray-500 font-black uppercase tracking-widest mt-0.5">{hand.action}</div>
                              </div>
                            </div>
                            <div className="text-[8px] text-gray-700 font-black font-mono">{hand.timestamp}</div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/5 space-y-2 shrink-0">
            <div className="flex gap-2">
              {onShowProfile && (
                <button
                  onClick={onShowProfile}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 hover:text-white transition-all"
                >
                  <UserCircle className="w-4 h-4" />
                  Perfil
                </button>
              )}
              {onShowRanking && (
                <button
                  onClick={onShowRanking}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-yellow-500/10 hover:text-yellow-400 hover:border-yellow-500/10 transition-all"
                >
                  <Trophy className="w-4 h-4" />
                  Ranking
                </button>
              )}
              {onShowHistory && (
                <button
                  onClick={onShowHistory}
                  className="flex-1 flex items-center justify-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/5 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-sky-500/10 hover:text-sky-400 hover:border-sky-500/10 transition-all"
                >
                  <History className="w-4 h-4" />
                  Histórico
                </button>
              )}
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/5 text-gray-500 text-[9px] font-black uppercase tracking-widest hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/10 transition-all group"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Sair da Conta
              </button>
            )}
            <div className="text-center">
              <span className="text-[8px] text-gray-700 font-black tracking-[0.3em] uppercase">LAB11 v1.0</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Sidebar;
