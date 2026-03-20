
import React from 'react';

interface StopTrainingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const StopTrainingModal: React.FC<StopTrainingModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f0f0f] w-full max-w-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center mb-6 border border-sky-500/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
            <path d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        
        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-3">Encerrar Sessão?</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Deseja finalizar o treino atual? <br/>
          <span className="text-sky-400 font-bold uppercase text-[10px] tracking-widest mt-2 block">Você verá seu relatório de performance completo.</span>
        </p>

        <div className="w-full space-y-3">
          <button 
            onClick={onConfirm}
            className="w-full py-4 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-[0_4px_12px_rgba(56,189,248,0.3)]"
          >
            Encerrar e Ver Relatório
          </button>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all"
          >
            Continuar Treinando
          </button>
        </div>
      </div>
    </div>
  );
};

export default StopTrainingModal;
