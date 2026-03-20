import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Player, PlayerStatus, TimeBankOption, HandRecord, Scenario } from '../types.ts';
import PlayerSeat from './PlayerSeat.tsx';
import { 
  BIG_BLIND_VALUE, 
  RANKS, 
  getTablePositions, 
  getPreflopOrder, 
  getActionColor, 
  generateCardsFromKey 
} from '../utils/pokerUtils.ts';

interface PokerTableProps {
  tableId: number;
  activeScenario: Scenario;
  timeBankSetting: TimeBankOption;
  onHandComplete: (hand: HandRecord) => void;
  getNextHandKey: () => string;
  isMobile: boolean;
  isFocusMode: boolean;
}

const PokerTable: React.FC<PokerTableProps> = ({
  tableId,
  activeScenario,
  timeBankSetting,
  onHandComplete,
  getNextHandKey,
  isMobile,
  isFocusMode
}) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [board, setBoard] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'correct' | 'incorrect' | 'timeout'>('idle');
  const [currentPot, setCurrentPot] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const timerRef = useRef<number | null>(null);

  const resetToNewHand = useCallback(() => {
    const randomHandKey = getNextHandKey();
    if (!randomHandKey) return;

    const heroCards = generateCardsFromKey(randomHandKey);

    const count = activeScenario.playerCount;
    const tablePositions = getTablePositions(count);
    const preflopOrder = getPreflopOrder(count);

    const isFlop = activeScenario.street === 'FLOP';
    setBoard(isFlop ? (activeScenario.board || ['Ah', 'Kh', 'Qh']) : []);

    let totalPot = 0;
    const heroOrderIndex = preflopOrder.indexOf(activeScenario.heroPos);

    const isIsoAction = activeScenario.preflopAction.toLowerCase() === 'iso';
    const opponentBetVal = activeScenario.opponentBetSize || 0;
    
    const scenarioPlayers: Player[] = tablePositions.map((posName, i) => {
      const isHero = posName === activeScenario.heroPos;
      const isOpponent = activeScenario.opponents.includes(posName);
      const orderIndex = preflopOrder.indexOf(posName);
      
      let status = PlayerStatus.IDLE;
      let betAmount = 0;
      let hasCards = false;
      let lastAction = undefined;

      if (isFlop) {
        if (isHero || isOpponent) hasCards = true;
        else status = PlayerStatus.FOLDED;

        if (isHero) status = PlayerStatus.ACTING;
        
        if (isOpponent && activeScenario.opponentAction) {
          lastAction = activeScenario.opponentAction.toUpperCase();
        }
        
        betAmount = 0;
      } else {
        if (isIsoAction && isOpponent) {
          betAmount = BIG_BLIND_VALUE;
          status = PlayerStatus.IDLE;
          hasCards = true;
        } 
        else if (!isIsoAction && isOpponent && activeScenario.opponents[0] === posName && opponentBetVal > 0) {
          betAmount = opponentBetVal * BIG_BLIND_VALUE;
          status = PlayerStatus.IDLE;
          hasCards = true;
        }
        
        if (orderIndex < heroOrderIndex && orderIndex !== -1) {
          if (!isOpponent) status = PlayerStatus.FOLDED;
        } else if (isHero) {
          status = PlayerStatus.ACTING;
          hasCards = true;
        } else if (orderIndex > heroOrderIndex) {
          hasCards = true;
        }

        if (posName === 'SB') { betAmount = Math.max(betAmount, BIG_BLIND_VALUE / 2); }
        else if (posName === 'BB') { betAmount = Math.max(betAmount, BIG_BLIND_VALUE); }
      }

      totalPot += betAmount;

      const isDealer = count === 2 ? posName === 'SB' : posName === 'BTN';

      return {
        id: i + 1,
        name: `PLAYER_${i + 1}`,
        chips: (Number(activeScenario.stackBB) * Number(BIG_BLIND_VALUE)) - (isFlop ? 0 : Number(betAmount)),
        positionName: posName,
        status: status,
        betAmount: betAmount,
        lastAction: lastAction,
        cards: isHero ? heroCards : (hasCards ? ['BACK', 'BACK'] : undefined),
        isDealer: isDealer
      };
    });

    if (isFlop) {
      totalPot = (activeScenario.initialPotBB || 5.5) * BIG_BLIND_VALUE;
    }

    setPlayers(scenarioPlayers);
    setCurrentPot(totalPot);
    setFeedback('idle');
    if (timeBankSetting !== 'OFF') setTimeRemaining(timeBankSetting as number);
    else setTimeRemaining(0);
  }, [timeBankSetting, activeScenario, getNextHandKey]);

  useEffect(() => {
    resetToNewHand();
  }, [activeScenario, resetToNewHand]);

  const handleActionClick = useCallback((label: string, isTimeout: boolean = false) => {
    if (feedback !== 'idle' && !isTimeout) return;
    if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }

    const heroIndex = players.findIndex(p => p.positionName === activeScenario?.heroPos);
    const hero = players[heroIndex];
    if (!hero || !activeScenario) return;

    const [c1, c2] = hero.cards!;
    const r1 = c1[0]; const s1 = c1[1]; const r2 = c2[0]; const s2 = c2[1];
    const rank1Idx = RANKS.indexOf(r1); const rank2Idx = RANKS.indexOf(r2);
    
    let handKey = ''; let comboKey = r1 + s1 + r2 + s2;
    if (rank1Idx === rank2Idx) handKey = r1 + r2;
    else if (rank1Idx > rank2Idx) handKey = r1 + r2 + (s1 === s2 ? 's' : 'o');
    else handKey = r2 + r1 + (s1 === s2 ? 's' : 'o');

    const ranges = activeScenario.ranges;
    const labelLower = label.toLowerCase();

    const actionMap = ranges[comboKey] || ranges[handKey];
    let isCorrect = false;
    let correctAction = 'Fold';

    if (actionMap) {
      const baseAction = labelLower.includes('raise') || labelLower.includes('iso') ? 'Raise' : labelLower.includes('call') || labelLower.includes('check') ? 'Call' : label;
      const freq = actionMap[label] || actionMap[baseAction] || 0;
      isCorrect = (freq as number) > 0;
      
      const entries = Object.entries(actionMap);
      const sortedEntries = entries.sort((a, b) => (b[1] as number) - (a[1] as number));
      const bestAction = sortedEntries[0];
      if (bestAction) correctAction = bestAction[0];
    } else {
      isCorrect = labelLower.includes('fold');
    }

    if (!isTimeout) {
      let additionalBetVal = 0;
      let newTotalBetRaw = hero.betAmount || 0;
      let newChips = hero.chips;

      const isBettingAction = labelLower.includes('raise') || 
                              labelLower.includes('all-in') || 
                              labelLower.includes('shove') || 
                              labelLower.includes('rfi') || 
                              labelLower.includes('bet') ||
                              labelLower.includes('call') ||
                              labelLower.includes('iso') ||
                              labelLower.includes('check') ||
                              labelLower.includes('pagar');

      if (isBettingAction && !labelLower.includes('check')) {
        let betAmountBB: number = 0;
        
        if (labelLower.includes('call') || labelLower.includes('pagar')) {
          betAmountBB = Number(activeScenario.opponentBetSize || 1);
        } else if (labelLower.includes('all-in') || labelLower.includes('shove')) {
          betAmountBB = (Number(hero.chips) + Number(hero.betAmount)) / BIG_BLIND_VALUE;
        } else {
          const match = label.match(/(\d+\.?\d*)/);
          if (label.includes('%')) {
            const percentage = match ? parseFloat(match[0]) : 0;
            betAmountBB = (currentPot / BIG_BLIND_VALUE) * (percentage / 100);
          } else {
            betAmountBB = match ? parseFloat(match[0]) : Number(activeScenario.heroBetSize);
          }
        }
        
        const currentBetVal = Number(hero.betAmount || 0);
        const bbVal = Number(BIG_BLIND_VALUE);
        
        newTotalBetRaw = betAmountBB * bbVal;
        additionalBetVal = newTotalBetRaw - currentBetVal;
        newChips = Number(hero.chips || 0) - additionalBetVal;
      }

      setPlayers(prev => {
        const next = [...prev];
        const playerToUpdate = next[heroIndex];
        if (!playerToUpdate) return prev;
        const p = { ...playerToUpdate };
        
        p.chips = newChips;
        p.betAmount = newTotalBetRaw;
        p.lastAction = label.toUpperCase();
        p.status = labelLower.includes('fold') ? PlayerStatus.FOLDED : PlayerStatus.IDLE;
        
        next[heroIndex] = p;
        return next;
      });

      if (additionalBetVal !== 0) {
        setCurrentPot(curr => Number(curr) + additionalBetVal);
      }
    }

    const status = isCorrect ? 'correct' : 'incorrect';
    setFeedback(isTimeout ? 'timeout' : status);

    const newHand: HandRecord = {
      id: Date.now(),
      cards: hero.cards?.join(' ') || '??',
      action: isTimeout ? 'TEMPO ESGOTADO' : label,
      correctAction: correctAction,
      status: status,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isTimeout: isTimeout
    };
    onHandComplete(newHand);
    setTimeout(() => resetToNewHand(), 1500);
  }, [players, feedback, resetToNewHand, activeScenario, currentPot, onHandComplete]);

  useEffect(() => {
    if (timeBankSetting === 'OFF' || feedback !== 'idle' || timeRemaining <= 0) {
      if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
      return;
    }
    timerRef.current = window.setInterval(() => {
      setTimeRemaining(prev => {
        const next = prev - 0.1;
        if (next <= 0) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          handleActionClick('Fold', true);
          return 0;
        }
        return next;
      });
    }, 100);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [timeBankSetting, feedback, timeRemaining, handleActionClick]);

  const actions = activeScenario.customActions || ["Fold", "Call", "Raise"];

  return (
    <div className={`relative w-full h-full flex flex-col items-center justify-center bg-[#0a0a0a] border border-white/5 overflow-hidden ${isFocusMode ? 'rounded-none' : 'rounded-2xl'}`}>
      {/* Table ID Label */}
      <div className="absolute top-4 left-4 z-50 bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/10">
        <span className="text-white/40 text-[10px] font-black tracking-widest uppercase">Mesa {tableId}</span>
      </div>

      {/* Pot Display */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center">
        <div className="bg-black/40 backdrop-blur-xl px-6 py-2 rounded-2xl border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center">
          <span className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Pote Total</span>
          <span className="text-white text-3xl font-black tracking-tighter">
            {(currentPot / BIG_BLIND_VALUE).toFixed(1)} <span className="text-white/40 text-xl ml-1">BB</span>
          </span>
        </div>
        
        {/* Board Cards */}
        {board.length > 0 && (
          <div className="flex gap-2 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {board.map((card, i) => {
              const rank = card.slice(0, -1);
              const suit = card.slice(-1).toLowerCase();
              const suitSymbol = suit === 'c' ? '♣' : suit === 'd' ? '♦' : suit === 'h' ? '♥' : '♠';
              const suitColor = suit === 'c' ? 'text-green-600' : suit === 'd' ? 'text-blue-600' : suit === 'h' ? 'text-red-600' : 'text-black';
              return (
                <div key={i} className={`w-14 h-20 bg-white rounded-lg shadow-2xl flex flex-col items-center justify-center border border-gray-200 transform hover:scale-105 transition-transform ${suitColor}`}>
                  <span className="text-2xl font-black leading-none">{rank === 'T' ? '10' : rank}</span>
                  <span className="text-3xl">{suitSymbol}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Players */}
      <div className="relative w-full h-full max-w-5xl max-h-[600px] mx-auto">
        {players.map((p, i) => {
          const count = players.length;
          let posClass = "";
          
          if (count === 2) {
            posClass = i === 0 ? "bottom-12 left-1/2 -translate-x-1/2" : "top-12 left-1/2 -translate-x-1/2";
          } else if (count === 4) {
            if (i === 0) posClass = "bottom-12 left-1/2 -translate-x-1/2";
            else if (i === 1) posClass = "left-12 top-1/2 -translate-y-1/2";
            else if (i === 2) posClass = "top-12 left-1/2 -translate-x-1/2";
            else posClass = "right-12 top-1/2 -translate-y-1/2";
          } else if (count === 6) {
            if (i === 0) posClass = "bottom-12 left-1/2 -translate-x-1/2";
            else if (i === 1) posClass = "bottom-24 left-12";
            else if (i === 2) posClass = "top-24 left-12";
            else if (i === 3) posClass = "top-12 left-1/2 -translate-x-1/2";
            else if (i === 4) posClass = "top-24 right-12";
            else posClass = "bottom-24 right-12";
          } else {
            if (i === 0) posClass = "bottom-8 left-1/2 -translate-x-1/2";
            else if (i === 1) posClass = "bottom-20 left-24";
            else if (i === 2) posClass = "top-1/2 -translate-y-1/2 left-8";
            else if (i === 3) posClass = "top-20 left-24";
            else if (i === 4) posClass = "top-8 left-1/2 -translate-x-1/2";
            else if (i === 5) posClass = "top-20 right-24";
            else if (i === 6) posClass = "top-1/2 -translate-y-1/2 right-8";
            else if (i === 7) posClass = "bottom-20 right-24";
            else posClass = "bottom-8 right-1/4";
          }

          return (
            <PlayerSeat 
              key={p.id} 
              player={p} 
              isMain={p.positionName === activeScenario.heroPos}
              bigBlindValue={BIG_BLIND_VALUE}
              className={`absolute ${posClass}`}
              timeRemaining={p.positionName === activeScenario.heroPos ? timeRemaining : 0}
              maxTime={p.positionName === activeScenario.heroPos ? (timeBankSetting as number) : 0}
              totalPlayers={count}
              isMobile={isMobile}
            />
          );
        })}
      </div>

      {/* Feedback Overlay */}
      {feedback !== 'idle' && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className={`
            px-12 py-6 rounded-3xl border-2 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col items-center gap-2 transform animate-in zoom-in duration-300
            ${feedback === 'correct' ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 
              feedback === 'timeout' ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' :
              'bg-red-500/20 border-red-500/50 text-red-400'}
          `}>
            <span className="text-5xl mb-2">
              {feedback === 'correct' ? '✅' : feedback === 'timeout' ? '⏰' : '❌'}
            </span>
            <span className="text-3xl font-black uppercase tracking-[0.2em]">
              {feedback === 'correct' ? 'Correto' : feedback === 'timeout' ? 'Tempo Esgotado' : 'Incorreto'}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-[60] flex gap-3 px-4 w-full max-w-2xl justify-center overflow-x-auto no-scrollbar py-4">
        {actions.map((label, i) => (
          <button
            key={i}
            onClick={() => handleActionClick(label)}
            disabled={feedback !== 'idle'}
            style={{ backgroundColor: getActionColor(label, i) }}
            className={`
              min-w-[120px] px-6 py-4 rounded-2xl text-white font-black uppercase tracking-widest text-sm
              shadow-[0_10px_30px_rgba(0,0,0,0.3)] transition-all transform
              hover:scale-105 active:scale-95 hover:brightness-110
              disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
              border border-white/20
            `}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PokerTable;
