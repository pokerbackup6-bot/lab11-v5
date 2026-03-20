import React, { useState, useEffect } from 'react';
import { Player, PlayerStatus } from '../types.ts';

type DeckType = 'standard' | '4color';

const SUIT_BG_4C: Record<string, string> = { h: '#dc2626', d: '#1d4ed8', c: '#15803d', s: '#111827' };
const SUIT_BORDER_4C: Record<string, string> = { h: '#ef4444', d: '#3b82f6', c: '#22c55e', s: '#374151' };

interface PlayerSeatProps {
  player: Player;
  isMain?: boolean;
  bigBlindValue?: number;
  className?: string;
  timeRemaining?: number;
  maxTime?: number;
  totalPlayers?: number;
  isMobile?: boolean;
  deckType?: DeckType;
}

const getSuitSymbol = (suitChar: string) => {
  switch (suitChar?.toLowerCase()) {
    case 'c': return '♣';
    case 'd': return '♦';
    case 'h': return '♥';
    case 's': return '♠';
    default: return suitChar;
  }
};

const getSuitColor = (suitChar: string) => {
  switch (suitChar?.toLowerCase()) {
    case 'c': return 'text-green-600';
    case 'd': return 'text-blue-600';
    case 'h': return 'text-red-600';
    case 's': return 'text-black';
    default: return 'text-black';
  }
};

const PlayerSeat: React.FC<PlayerSeatProps> = ({
  player,
  isMain = false,
  bigBlindValue = 20,
  className = "",
  timeRemaining = 0,
  maxTime = 0,
  totalPlayers = 9,
  isMobile = false,
  deckType = 'standard',
}) => {
  const [showAction, setShowAction] = useState(false);
  const isActing = player.status === PlayerStatus.ACTING;
  const isFolded = player.status === PlayerStatus.FOLDED;

  useEffect(() => {
    if (player.lastAction) {
      setShowAction(true);
      const timer = setTimeout(() => setShowAction(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [player.lastAction]);

  const displayChips = () => {
    return (player.chips / bigBlindValue).toFixed(1) + " BB";
  };

  const displayBet = () => {
    if (!player.betAmount || player.betAmount <= 0) return null;
    return (player.betAmount / bigBlindValue).toFixed(1) + " BB";
  };

  const getOverlayPosition = () => {
    // Caso especial para Heads-Up (2 jogadores)
    if (totalPlayers === 2) {
      if (className.includes('top')) return 'top-[115%]';
      if (className.includes('bottom')) return 'bottom-[125%]';
    }

    // Ajuste independente da posição do SB baseado no tamanho da mesa
    if (player.positionName === 'SB') {
      if (totalPlayers === 9) {
        // Ajuste SB Mobile: Movimentado levemente para a esquerda (reduzindo left) e mantendo altura anterior
        if (isMobile) return 'left-[100%] bottom-[75%]';
        return 'left-[40%] bottom-[115%]';
      } else if (totalPlayers === 6) {
        return 'left-[110%] top-[15%]';
      } else if (totalPlayers === 4) {
        return 'left-[110%] top-[60%]';
      }
    }

    if (player.positionName === 'BB') {
      if (totalPlayers === 4) {
        return 'top-[115%]';
      }
      return 'left-[115%] bottom-[55%]'; 
    }

    if (player.positionName === 'UTG') {
      return 'left-[115%] top-[45%]';
    }

    if (player.positionName === 'UTG+1') {
      return 'top-[105%] md:translate-x-0 translate-x-6';
    }

    if (player.positionName === 'MP') {
      return 'top-[105%] md:translate-x-0 -translate-x-6';
    }

    if (player.positionName === 'LJ') {
      return 'top-[70%] -translate-x-36';
    }

    if (player.positionName === 'HJ') {
      return 'top-[60%] -translate-x-36';
    }

    if (player.positionName === 'CO') {
      if (totalPlayers === 4) {
        return 'top-[75%] -translate-x-36';
      }
      // Ajuste CO Mobile 9-max: Movimentado mais para a esquerda (dentro da mesa) e para baixo
      if (isMobile && totalPlayers === 9) {
        return 'bottom-[65%] right-[110%]';
      }
      // Desktop 9-max CO: Acima das cartas
      return 'bottom-[135%] right-[25%]';
    }
    
    if (isMain) return isMobile ? 'bottom-[110%]' : 'bottom-[125%]';
    if (className.includes('left')) return 'left-[85%] bottom-[85%]';
    if (className.includes('right')) return 'right-[85%] bottom-[85%]';
    if (className.includes('top')) return 'top-[100%]';
    if (className.includes('bottom')) return 'bottom-[105%]';
    return '';
  };

  const getDealerPosition = () => {
    if (className.includes('bottom')) return 'bottom-[85%] left-[90%]';
    if (className.includes('top')) return 'top-[85%] left-[10%]';
    if (className.includes('left')) return 'left-[85%] bottom-[-10%]';
    if (className.includes('right')) return 'right-[85%] bottom-[-10%]';
    return 'top-0 right-0';
  };

  const progress = maxTime > 0 ? (timeRemaining / maxTime) : 0;
  
  const getTimerColor = () => {
    if (progress > 0.5) return 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]';
    if (progress > 0.2) return 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]';
    return 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]';
  };

  return (
    <div className={`relative flex flex-col items-center ${className} transition-all duration-500 ${isFolded ? 'opacity-20 grayscale' : ''}`}>
      
      {/* Dealer Button */}
      {player.isDealer && (
        <div className={`absolute ${getDealerPosition()} z-50 pointer-events-none`}>
          <div className="relative w-7 h-7 bg-white rounded-full border border-slate-300 flex items-center justify-center shadow-xl">
             <span className="text-black text-[12px] font-black relative z-10 tracking-tighter">D</span>
          </div>
        </div>
      )}

      {/* Cards */}
      {!isFolded && (isMain || player.status !== PlayerStatus.FOLDED) && (
        <div className={`flex items-end transition-transform z-0 ${isMain ? 'gap-1 mb-[-4px]' : '-space-x-5 mb-[-6px]'}`}>
           {isMain && player.cards ? (
             <>
               {player.cards.map((card, i) => {
                 const rank = card.slice(0, -1);
                 const suit = card.slice(-1).toLowerCase();
                 return (
                   <div
                     key={i}
                     className="w-12 h-18 rounded-md shadow-2xl flex flex-col items-center justify-center leading-none font-bold border"
                     style={deckType === '4color'
                       ? { backgroundColor: SUIT_BG_4C[suit] ?? '#fff', borderColor: SUIT_BORDER_4C[suit] ?? '#e5e7eb' }
                       : { backgroundColor: '#fff', borderColor: '#e5e7eb' }
                     }
                   >
                     <span className={`text-xl font-black ${deckType === '4color' ? 'text-white' : getSuitColor(suit)}`}>{rank === 'T' ? '10' : rank}</span>
                     <span className={`text-2xl ${deckType === '4color' ? 'text-white' : getSuitColor(suit)}`}>{getSuitSymbol(suit)}</span>
                   </div>
                 );
               })}
             </>
           ) : (
             <div className="flex -space-x-5">
               <div className="w-10 h-14 bg-[#1c3c9c] border border-[#001f3f] rounded shadow-lg transform -rotate-12 overflow-hidden">
                 <div className="w-full h-full opacity-25 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:4px_4px]"></div>
               </div>
               <div className="w-10 h-14 bg-[#1c3c9c] border border-[#001f3f] rounded shadow-lg transform rotate(6deg) overflow-hidden">
                 <div className="w-full h-full opacity-25 bg-[radial-gradient(circle,white_1px,transparent_1px)] bg-[size:4px_4px]"></div>
               </div>
             </div>
           )}
        </div>
      )}

      {/* Player Box */}
      <div className={`
        relative w-32 overflow-hidden rounded-md border transition-all z-10
        ${isActing ? 'border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.5)] ring-2 ring-sky-400/30' : 'border-black bg-[#0a0a0a] shadow-2xl'}
      `}>
        <div className="px-2 py-3 flex flex-col items-center gap-1.5 bg-gradient-to-b from-[#1a1a1a] to-[#050505]">
          <span className={`font-black text-[13px] text-center uppercase tracking-wider drop-shadow-md ${isActing ? 'text-sky-400' : isFolded ? 'text-white/20' : 'text-white'}`}>
            {isFolded ? 'FOLD' : player.positionName}
          </span>

          <div className={`w-full bg-[#000000] rounded border py-1.5 flex items-center justify-center shadow-[inset_0_2px_10px_rgba(0,0,0,1)] min-h-[36px] ${isActing ? 'border-sky-900/50' : 'border-white/10'}`}>
             {showAction && player.lastAction ? (
               <span className="text-white font-mono text-[18px] font-black tracking-tighter uppercase transition-all duration-300 transform scale-100 opacity-100">
                 {player.lastAction}
               </span>
             ) : (
               <span className="text-[#55efc4] font-mono text-[18px] font-black tracking-tighter drop-shadow-[0_0_8px_rgba(85,239,196,0.3)] whitespace-nowrap transition-all duration-500 opacity-100">
                 {displayChips()}
               </span>
             )}
          </div>
        </div>

        {/* Linear Timer Bar for Acting Hero */}
        {isActing && maxTime > 0 && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-black/50">
            <div 
              className={`h-full transition-all duration-100 linear ${getTimerColor()}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Overlay: Bets */}
      <div className={`absolute pointer-events-none flex flex-col items-center gap-1 ${getOverlayPosition()} z-30`}>
        {displayBet() && (
          <div className="flex items-center bg-black/90 rounded-full pl-0.5 pr-2.5 py-0.5 border border-white/20 shadow-2xl backdrop-blur-md whitespace-nowrap transition-all">
            <div className="w-4 h-4 bg-sky-600 rounded-full border border-white/40 flex items-center justify-center relative flex-shrink-0">
              <div className="w-1.5 h-1.5 border border-white/20 rounded-full"></div>
            </div>
            <span className="text-white text-[11px] font-black ml-1.5 leading-none">{displayBet()}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PlayerSeat;