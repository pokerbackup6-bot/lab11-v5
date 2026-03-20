import React, { useState } from 'react';
import { TrainingGoal, TrainingGoalType } from '../types.ts';

interface TrainingSetupScreenProps {
  scenarioName: string;
  onStart: (goal: TrainingGoal) => void;
  onBack: () => void;
}

const TrainingSetupScreen: React.FC<TrainingSetupScreenProps> = ({ scenarioName, onStart, onBack }) => {
  const [goalType, setGoalType] = useState<TrainingGoalType>('hands');
  const [handsValue, setHandsValue] = useState<number>(100);
  const [timeValue, setTimeValue] = useState<number>(20);

  const handleStart = () => {
    onStart({
      type: goalType,
      value: goalType === 'hands' ? handsValue : (goalType === 'time' ? timeValue : 0)
    });
  };

  return (
    <div className="fixed inset-0 bg-[#050505] text-white overflow-y-auto custom-scrollbar flex flex-col items-center justify-start md:justify-center p-4 py-10 md:py-6 animate-in fade-in zoom-in duration-500">
      <div className="w-full max-w-2xl bg-[#0f0f0f] border border-white/5 rounded-[32px] md:rounded-[40px] p-6 md:p-10 shadow-[0_40px_80px_-20px_rgba(0,0,0,1)] relative overflow-hidden shrink-0 my-auto">
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/5 blur-[100px] rounded-full -mr-32 -mt-32 pointer-events-none"></div>
        
        <div className="text-center mb-8 md:mb-10">
          <h4 className="text-sky-500 text-[9px] md:text-[10px] font-black tracking-[0.4em] uppercase mb-3 md:mb-4">Configuração de Sessão</h4>
          <h1 className="text-2xl md:text-4xl font-black text-white tracking-tighter uppercase mb-2 leading-tight">QUANTO TEMPO DESEJA TREINAR?</h1>
          <p className="text-gray-500 font-bold uppercase text-[10px] md:text-[11px] tracking-widest">{scenarioName}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 mb-8 md:mb-10">
          <button 
            onClick={() => setGoalType('hands')}
            className={`p-4 md:p-6 rounded-[20px] md:rounded-[24px] border transition-all flex flex-row md:flex-col items-center justify-center gap-3 ${goalType === 'hands' ? 'bg-sky-600 border-sky-400 shadow-2xl scale-[1.02] md:scale-105' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
          >
            <svg width="20" height="20" className="md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1" /></svg>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">Quantidade de Mãos</span>
          </button>
          <button 
            onClick={() => setGoalType('time')}
            className={`p-4 md:p-6 rounded-[20px] md:rounded-[24px] border transition-all flex flex-row md:flex-col items-center justify-center gap-3 ${goalType === 'time' ? 'bg-sky-600 border-sky-400 shadow-2xl scale-[1.02] md:scale-105' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
          >
            <svg width="20" height="20" className="md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">Tempo de Treino</span>
          </button>
          <button 
            onClick={() => setGoalType('free')}
            className={`p-4 md:p-6 rounded-[20px] md:rounded-[24px] border transition-all flex flex-row md:flex-col items-center justify-center gap-3 ${goalType === 'free' ? 'bg-sky-600 border-sky-400 shadow-2xl scale-[1.02] md:scale-105' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'}`}
          >
            <svg width="20" height="20" className="md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-center">Treino Livre</span>
          </button>
        </div>

        {goalType === 'hands' && (
          <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
              {[25, 100, 250].map(val => (
                <button 
                  key={val} 
                  onClick={() => setHandsValue(val)}
                  className={`py-3 md:py-4 rounded-xl border text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${handsValue === val ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                >
                  {val === 25 ? 'Rápido 25' : val === 100 ? 'Moderado 100' : 'Longo 250'}
                </button>
              ))}
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[9px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest">Ajuste Manual</label>
                <input 
                  type="number" 
                  value={handsValue} 
                  onChange={(e) => setHandsValue(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-center text-sky-400 font-black text-sm outline-none focus:border-sky-500"
                />
              </div>
              <input 
                type="range" min="20" max="1000" step="10" value={handsValue} 
                onChange={(e) => setHandsValue(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-sky-500" 
              />
              <div className="flex justify-between text-[8px] text-gray-600 font-black uppercase">
                <span>20 Mãos</span>
                <span>1.000 Mãos</span>
              </div>
            </div>
          </div>
        )}

        {goalType === 'time' && (
          <div className="space-y-6 md:space-y-8 animate-in slide-in-from-bottom-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3">
              {[5, 20, 45].map(val => (
                <button 
                  key={val} 
                  onClick={() => setTimeValue(val)}
                  className={`py-3 md:py-4 rounded-xl border text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all ${timeValue === val ? 'bg-white text-black border-white' : 'bg-white/5 border-white/10 text-gray-400'}`}
                >
                  {val === 5 ? 'Rápido 5m' : val === 20 ? 'Moderado 20m' : 'Longo 45m'}
                </button>
              ))}
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[9px] md:text-[10px] text-gray-500 font-black uppercase tracking-widest">Minutos de Treino</label>
                <input 
                  type="number" 
                  value={timeValue} 
                  onChange={(e) => setTimeValue(Math.max(1, parseInt(e.target.value) || 0))}
                  className="w-20 bg-white/5 border border-white/10 rounded-lg py-2 px-3 text-center text-sky-400 font-black text-sm outline-none focus:border-sky-500"
                />
              </div>
              <input 
                type="range" min="5" max="120" step="5" value={timeValue} 
                onChange={(e) => setTimeValue(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-full appearance-none cursor-pointer accent-sky-500" 
              />
              <div className="flex justify-between text-[8px] text-gray-600 font-black uppercase">
                <span>5 Minutos</span>
                <span>120 Minutos</span>
              </div>
            </div>
          </div>
        )}

        {goalType === 'free' && (
          <div className="py-8 md:py-12 text-center animate-in fade-in duration-500">
            <p className="text-gray-500 text-xs md:text-sm font-bold uppercase tracking-widest">Treino por tempo indeterminado</p>
          </div>
        )}

        <div className="mt-8 md:mt-10 flex flex-col md:flex-row gap-3 md:gap-4">
          <button 
            onClick={onBack}
            className="order-2 md:order-1 flex-1 py-4 md:py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-all"
          >
            Voltar
          </button>
          <button 
            onClick={handleStart}
            className="order-1 md:order-2 flex-[2] py-4 md:py-5 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all shadow-2xl shadow-sky-500/20 active:scale-95"
          >
            Iniciar Treinamento
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrainingSetupScreen;