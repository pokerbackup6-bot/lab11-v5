
import React from 'react';

interface SpotInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  trainingName: string;
  description?: string;
  videoLink?: string;
}

const SpotInfoModal: React.FC<SpotInfoModalProps> = ({ isOpen, onClose, trainingName, description, videoLink }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f0f0f] w-full max-w-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header com Botão de Fechar */}
        <div className="p-4 border-b border-white/5 flex justify-end">
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="px-8 pb-8 pt-2 flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-sky-500/10 rounded-full flex items-center justify-center mb-6 border border-sky-500/20 shadow-[0_0_20px_rgba(56,189,248,0.1)]">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" strokeWidth="2.5">
              <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-4">{trainingName}</h2>
          
          <div className="text-gray-300 text-sm leading-relaxed mb-8 px-2 max-h-40 overflow-y-auto custom-scrollbar">
            {description ? (
              <p>{description}</p>
            ) : (
              <p>Nenhuma descrição disponível para este cenário.</p>
            )}
          </div>

          {videoLink && (
            <button 
              onClick={() => window.open(videoLink, '_blank')}
              className="w-full py-4 bg-sky-600 hover:bg-sky-500 border border-sky-400 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all shadow-[0_4px_15px_rgba(56,189,248,0.3)] flex items-center justify-center gap-3"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
              Assistir Aula
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpotInfoModal;
