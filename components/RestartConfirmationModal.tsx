
import React from 'react';

interface RestartConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const RestartConfirmationModal: React.FC<RestartConfirmationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f0f0f] w-full max-w-sm border border-white/10 rounded-2xl shadow-2xl overflow-hidden p-8 flex flex-col items-center text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6 border border-red-500/20">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        
        <h2 className="text-xl font-black text-white uppercase tracking-tight mb-3">Reiniciar Treino?</h2>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Tem certeza que deseja reiniciar o treino? <br/>
          <span className="text-red-400 font-bold uppercase text-[10px] tracking-widest mt-2 block">Todo o seu progresso será perdido.</span>
        </p>

        <div className="w-full space-y-3">
          <button 
            onClick={onConfirm}
            className="w-full py-4 bg-red-600 hover:bg-red-500 border border-red-400 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-[0_4px_12px_rgba(220,38,38,0.3)]"
          >
            Quero Reiniciar
          </button>
          <button 
            onClick={onClose}
            className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all"
          >
            Voltar ao Treino
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestartConfirmationModal;
