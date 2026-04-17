import React from 'react';
import { TimeBankOption } from '../types.ts';

export type DeckType = 'standard' | '4color';
export type TableStyle = 'classic' | 'premium';

const SUIT_4COLOR: Record<string, string> = { h: '#dc2626', d: '#1d4ed8', c: '#15803d', s: '#111827' };

export type TableCount = 1 | 2;

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeBank: TimeBankOption;
  setTimeBank: (val: TimeBankOption) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  deckType: DeckType;
  setDeckType: (val: DeckType) => void;
  tableStyle: TableStyle;
  setTableStyle: (val: TableStyle) => void;
  tableCount: TableCount;
  setTableCount: (val: TableCount) => void;
}

const SUIT_SYMBOLS: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_STD_COLOR: Record<string, string> = { h: '#dc2626', d: '#1d4ed8', c: '#15803d', s: '#111827' };

const renderMiniCards = (deckType: DeckType) =>
  ['h', 'd', 'c', 's'].map((s, i) => (
    <div
      key={i}
      className="w-7 h-10 rounded flex items-center justify-center font-black text-lg border shadow"
      style={
        deckType === '4color'
          ? { backgroundColor: SUIT_4COLOR[s], borderColor: 'rgba(255,255,255,0.2)', color: '#fff' }
          : { backgroundColor: '#fff', borderColor: '#d1d5db', color: SUIT_STD_COLOR[s] }
      }
    >
      {SUIT_SYMBOLS[s]}
    </div>
  ));

const MiniTableClassic = () => (
  <div
    className="w-20 h-12 rounded-[20px] border-[3px] border-[#111]"
    style={{ background: 'radial-gradient(ellipse at center, #6d0000 0%, #3d0000 65%, #0d0000 100%)' }}
  />
);

const MiniTablePremium = () => (
  <div
    className="w-20 h-12 rounded-[20px] overflow-hidden relative"
    style={{
      background: 'linear-gradient(160deg, #161610 0%, #0f0f0b 50%, #1a1a14 100%)',
      border: '1.5px solid rgba(195,155,55,0.28)',
      boxShadow: '0 4px 16px rgba(0,0,0,0.92), inset 0 1px 3px rgba(220,185,80,0.18)',
    }}
  >
    <div
      className="absolute rounded-[14px] overflow-hidden"
      style={{
        inset: '5px',
        background: 'radial-gradient(ellipse at 50% 44%, #1e4820 0%, #0f2812 40%, #050e06 100%)',
        border: '1px solid rgba(8,28,10,1)',
        boxShadow: 'inset 0 5px 16px rgba(0,0,0,0.9), inset 4px 0 12px rgba(0,0,0,0.85), inset -4px 0 12px rgba(0,0,0,0.85)',
      }}
    >
      {/* Vignette radial */}
      <div className="absolute inset-0 rounded-[14px]" style={{ background: 'radial-gradient(ellipse at 50% 46%, transparent 24%, rgba(0,0,0,0.58) 70%, rgba(0,0,0,0.86) 100%)' }} />
      {/* Perspectiva sutil */}
      <div className="absolute inset-0 rounded-[14px]" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 52%)' }} />
    </div>
  </div>
);

const ConfigModal: React.FC<ConfigModalProps> = ({
  isOpen,
  onClose,
  timeBank,
  setTimeBank,
  soundEnabled,
  setSoundEnabled,
  deckType,
  setDeckType,
  tableStyle,
  setTableStyle,
  tableCount,
  setTableCount,
}) => {
  if (!isOpen) return null;

  const timeBankOptions: TimeBankOption[] = ['OFF', 7, 15, 25];

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0f0f0f] w-full max-w-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-5 border-b border-white/5 flex justify-between items-center shrink-0">
          <h2 className="text-white font-black text-xs uppercase tracking-widest">Configurações do Treino</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto">

          {/* Time Bank */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 bg-sky-500 rounded-full"></div>
              <h3 className="text-white font-bold text-sm uppercase tracking-tight">Time Bank</h3>
            </div>
            <p className="text-gray-500 text-[11px] mb-4 leading-relaxed">
              Defina o tempo máximo para tomar cada decisão. Se o tempo esgotar, o sistema executará um FOLD automático.
            </p>
            <div className="grid grid-cols-4 gap-2">
              {timeBankOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setTimeBank(opt)}
                  className={`py-3 rounded-xl border text-[10px] font-black transition-all ${
                    timeBank === opt
                      ? 'bg-sky-600 border-sky-400 text-white shadow-[0_0_15px_rgba(14,165,233,0.3)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {opt === 'OFF' ? 'OFF' : `${opt}s`}
                </button>
              ))}
            </div>
          </section>

          {/* Estilo da Mesa */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
              <h3 className="text-white font-bold text-sm uppercase tracking-tight">Estilo da Mesa</h3>
            </div>
            <p className="text-gray-500 text-[11px] mb-4 leading-relaxed">
              O estilo Premium adiciona profundidade e iluminação sutil à mesa, sem alterar nenhuma funcionalidade.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['classic', 'premium'] as TableStyle[]).map((val) => (
                <button
                  key={val}
                  onClick={() => setTableStyle(val)}
                  className={`py-4 rounded-xl border text-[10px] font-black transition-all flex flex-col items-center gap-3 ${
                    tableStyle === val
                      ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {val === 'classic' ? <MiniTableClassic /> : <MiniTablePremium />}
                  <span className="uppercase tracking-widest">{val === 'classic' ? 'Clássico' : 'Premium'}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Baralho */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
              <h3 className="text-white font-bold text-sm uppercase tracking-tight">Tipo de Baralho</h3>
            </div>
            <p className="text-gray-500 text-[11px] mb-4 leading-relaxed">
              No baralho 4 cores cada naipe tem a cor do fundo da carta, com rank e símbolo em branco.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['standard', '4color'] as DeckType[]).map((val) => (
                <button
                  key={val}
                  onClick={() => setDeckType(val)}
                  className={`py-4 rounded-xl border text-[10px] font-black transition-all flex flex-col items-center gap-3 ${
                    deckType === val
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <div className="flex gap-1">
                    {renderMiniCards(val)}
                  </div>
                  <span className="uppercase tracking-widest">{val === 'standard' ? 'Padrão' : '4 Cores'}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Sons de Feedback */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full"></div>
              <h3 className="text-white font-bold text-sm uppercase tracking-tight">Sons de Feedback</h3>
            </div>
            <p className="text-gray-500 text-[11px] mb-4 leading-relaxed">
              Sons sutis de acerto, erro e distribuição de cartas para reforçar o aprendizado por repetição.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([true, false] as const).map((val) => (
                <button
                  key={String(val)}
                  onClick={() => setSoundEnabled(val)}
                  className={`py-3 rounded-xl border text-[10px] font-black transition-all ${
                    soundEnabled === val
                      ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  {val ? 'ATIVO' : 'SILENCIOSO'}
                </button>
              ))}
            </div>
          </section>

          {/* Quantidade de Mesas */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-1.5 bg-rose-500 rounded-full"></div>
              <h3 className="text-white font-bold text-sm uppercase tracking-tight">Mesas Simultâneas</h3>
            </div>
            <p className="text-gray-500 text-[11px] mb-4 leading-relaxed">
              Treine em 2 mesas ao mesmo tempo para aumentar o volume de mãos e simular multitabling.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([1, 2] as TableCount[]).map((val) => (
                <button
                  key={val}
                  onClick={() => setTableCount(val)}
                  className={`py-3 rounded-xl border text-[10px] font-black transition-all flex flex-col items-center gap-2 ${
                    tableCount === val
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <div className="flex gap-1">
                    {Array.from({ length: val }).map((_, i) => (
                      <div key={i} className={`w-8 h-5 rounded-[6px] border ${tableCount === val ? 'border-rose-400/50 bg-rose-900/30' : 'border-white/10 bg-white/5'}`} />
                    ))}
                  </div>
                  <span className="uppercase tracking-widest">{val === 1 ? '1 Mesa' : '2 Mesas'}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Salvar */}
          <div className="pt-2">
            <button
              onClick={onClose}
              className="w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest text-white transition-all"
            >
              Salvar e Voltar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;
