
import React, { useState, useMemo } from 'react';
import { HandRecord } from '../types.ts';

interface PerformanceChartProps {
  history: HandRecord[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ history }) => {
  if (history.length < 2) {
    return (
      <div className="h-32 flex items-center justify-center border border-white/5 bg-black/20 rounded-xl">
        <span className="text-[10px] text-gray-600 font-bold uppercase tracking-widest">Gráfico disponível após 2 mãos</span>
      </div>
    );
  }

  let currentScore = 0;
  const points = history.map((h, i) => {
    if (h.status === 'correct') currentScore += 1;
    else currentScore -= 1;
    return { x: i, y: currentScore };
  });

  const minScore = Math.min(...points.map(p => p.y), 0);
  const maxScore = Math.max(...points.map(p => p.y), 1);
  const scoreRange = maxScore - minScore;
  
  const width = 400;
  const height = 120;
  const padding = 10;

  const getX = (x: number) => (x / (history.length - 1)) * (width - padding * 2) + padding;
  const getY = (y: number) => height - padding - ((y - minScore) / (scoreRange || 1)) * (height - padding * 2);

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(p.x)} ${getY(p.y)}`).join(' ');

  return (
    <div className="relative bg-black/40 p-4 rounded-xl border border-white/5 overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <span className="text-[9px] text-gray-500 font-black uppercase tracking-[0.2em]">Fluxo de Performance</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-32 overflow-visible">
        <line x1={padding} y1={getY(0)} x2={width - padding} y2={getY(0)} stroke="white" strokeWidth="1" strokeOpacity="0.05" strokeDasharray="4 4" />
        <path d={pathD} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-[0_0_8px_rgba(14,165,233,0.5)]" />
      </svg>
      <div className="flex justify-between mt-2 px-1">
         <span className="text-[8px] text-gray-600 font-bold tracking-widest">INÍCIO</span>
         <span className="text-[8px] text-gray-600 font-bold tracking-widest">AGORA</span>
      </div>
    </div>
  );
};

interface SessionReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNewTraining: () => void;
  history: HandRecord[];
  scenarioName: string;
}

const SessionReportModal: React.FC<SessionReportModalProps> = ({ isOpen, onClose, onNewTraining, history, scenarioName }) => {
  const [view, setView] = useState<'summary' | 'errors'>('summary');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success'>('idle');

  const stats = useMemo(() => {
    const correct = history.filter(h => h.status === 'correct').length;
    const incorrect = history.filter(h => h.status === 'incorrect').length;
    const precision = history.length > 0 ? Math.round((correct / history.length) * 100) : 0;
    const wrongHands = history.filter(h => h.status === 'incorrect');
    return { correct, incorrect, precision, wrongHands };
  }, [history]);

  if (!isOpen) return null;

  const getReportText = () => {
    return `📊 RELATÓRIO DE TREINO LAB11\n\n🎯 Treino: ${scenarioName}\n📈 Precisão: ${stats.precision}%\n🃏 Total de Mãos: ${history.length}\n✅ Acertos: ${stats.correct}\n❌ Erros: ${stats.incorrect}`;
  };

  const copyReportText = async () => {
    const text = getReportText();
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('success');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (err) {
      console.error("Failed to copy report:", err);
    }
  };

  const copyAllErrors = async () => {
    if (stats.wrongHands.length === 0) return;
    const text = `❌ LISTA DE ERROS - ${scenarioName}\n\n` + 
      stats.wrongHands.map(h => `Mão: ${h.cards} | Sua Ação: ${h.action} | Correto: ${h.correctAction}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      alert("Todos os erros foram copiados para a área de transferência!");
    } catch (err) {
      console.error("Failed to copy errors:", err);
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(getReportText() + "\n\nBora grindar! 🚀");
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const copyHand = (hand: HandRecord) => {
    const text = `Mão: ${hand.cards} | Sua Ação: ${hand.action} | Correto: ${hand.correctAction} | Treino: ${scenarioName}`;
    navigator.clipboard.writeText(text);
    alert("Mão copiada!");
  };

  return (
    <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-[#0a0a0a] w-full max-w-lg border border-white/10 rounded-3xl shadow-[0_32px_64px_-16px_rgba(0,0,0,1)] flex flex-col max-h-[92vh]">
        <div className="p-8 border-b border-white/5 bg-gradient-to-br from-white/5 to-transparent">
          <div className="flex justify-between items-start mb-6">
            <div>
              <span className="text-[10px] text-sky-500 font-black uppercase tracking-[0.3em] mb-1 block">Sessão Finalizada</span>
              <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-tight truncate max-w-[340px]">{scenarioName}</h2>
            </div>
            <button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12" /></svg></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                <span className="text-[9px] text-gray-500 font-black uppercase mb-1 block">Precisão</span>
                <span className="text-2xl font-black text-sky-400">{stats.precision}%</span>
             </div>
             <div className="bg-white/5 p-4 rounded-2xl border border-white/5 text-center">
                <span className="text-[9px] text-gray-500 font-black uppercase mb-1 block">Mãos</span>
                <span className="text-2xl font-black text-white">{history.length}</span>
             </div>
          </div>
        </div>

        <div className="flex p-2 bg-black/40 mx-8 mt-6 rounded-2xl border border-white/5">
          <button onClick={() => setView('summary')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'summary' ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500'}`}>Resumo</button>
          <button onClick={() => setView('errors')} className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${view === 'errors' ? 'bg-white/10 text-white shadow-xl' : 'text-gray-500'}`}>Erros ({stats.wrongHands.length})</button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {view === 'summary' ? (
            <div className="space-y-8 animate-in fade-in duration-500">
              <PerformanceChart history={history} />
              <div className="grid grid-cols-2 gap-3">
                <button onClick={shareWhatsApp} className="flex items-center justify-center gap-2 py-4 bg-green-600 text-white rounded-2xl font-black text-[10px] uppercase transition-all shadow-lg hover:bg-green-500">
                   <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.185-.573c.948.517 2.04.809 3.144.81 3.185 0 5.774-2.587 5.774-5.77 0-3.184-2.587-5.748-5.772-5.748zm3.292 8.163c-.144.406-.833.784-1.147.828-.312.045-.603.127-1.711-.311-1.352-.533-2.199-1.896-2.266-1.986-.067-.09-1.226-1.631-1.226-3.11 0-1.48.761-2.213 1.031-2.512.27-.3.585-.376.787-.376.203 0 .405.002.584.01.188.009.439-.072.69.536.252.613.855 2.083.93 2.234.075.15.126.326.025.528-.101.201-.151.326-.302.502-.151.176-.316.393-.453.528-.152.151-.311.316-.134.62.177.304.788 1.299 1.688 2.102.864.773 1.583 1.01 1.933 1.162.35.152.556.126.764-.112.208-.239.896-.104 1.135.239.239.342.157.652.126.837z"/></svg>
                   WhatsApp
                </button>
                <button 
                  onClick={copyReportText} 
                  className={`flex items-center justify-center gap-2 py-4 border rounded-2xl font-black text-[10px] uppercase transition-all ${copyStatus === 'success' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}`}
                >
                  {copyStatus === 'success' ? 'Copiado!' : 'COPIAR RELATÓRIO'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-500">
              {stats.wrongHands.length > 0 && (
                <button 
                  onClick={copyAllErrors}
                  className="w-full py-4 bg-sky-600/10 border border-sky-400/20 rounded-2xl text-sky-400 text-[9px] font-black uppercase tracking-widest hover:bg-sky-600/20 transition-all flex items-center justify-center gap-3 mb-4 shadow-xl"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                  COPIAR TODOS OS ERROS
                </button>
              )}
              
              <div className="space-y-3">
                {stats.wrongHands.map(hand => (
                  <div key={hand.id} className="p-5 bg-white/5 border border-white/5 rounded-[24px] group transition-all hover:border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-mono font-black text-white tracking-wider">{hand.cards}</span>
                      <button onClick={() => copyHand(hand)} className="p-2 opacity-0 group-hover:opacity-100 bg-white/5 rounded-xl transition-all" title="Copiar esta mão">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2" /></svg>
                      </button>
                    </div>
                    <div className="flex flex-col gap-2">
                       <div className="flex items-center gap-2">
                          <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest min-w-[70px]">Sua ação:</span>
                          <span className="text-[10px] text-red-400 font-black uppercase bg-red-400/10 px-2 py-0.5 rounded-lg border border-red-400/20">{hand.action}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className="text-[8px] text-gray-500 font-black uppercase tracking-widest min-w-[70px]">Correto:</span>
                          <span className="text-[10px] text-sky-400 font-black uppercase bg-sky-400/10 px-2 py-0.5 rounded-lg border border-sky-400/20">{hand.correctAction}</span>
                       </div>
                    </div>
                  </div>
                ))}
                {stats.wrongHands.length === 0 && (
                   <div className="py-12 text-center">
                      <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                         <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="3"><path d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p className="text-gray-500 font-black uppercase text-[10px] tracking-widest">Nenhum erro cometido!</p>
                   </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="p-8 bg-black/80 border-t border-white/10 flex flex-col gap-3">
          <button onClick={onNewTraining} className="py-5 w-full rounded-2xl bg-sky-600 border border-sky-400 text-xs font-black uppercase tracking-[0.2em] text-white hover:bg-sky-500 shadow-[0_8px_24px_rgba(56,189,248,0.4)] transition-all active:scale-95">
            Iniciar Novo Treino
          </button>
          <button onClick={onClose} className="py-4 w-full rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-all active:scale-95">
            Voltar ao Menu
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionReportModal;