
import React, { useState, useCallback } from 'react';
import { ArrowLeft, Upload, ChevronDown, ChevronUp, AlertCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
  type ParsedCashHand,
  type StreetName,
  parsePokerStarsCashHistory,
  summarizeHeroStreet,
} from '../utils/handHistoryParser.ts';

interface SpotReplayScreenProps {
  onBack: () => void;
}

// ─── Suit colours ─────────────────────────────────────────────────────────────

const SUIT_COLOR: Record<string, string> = {
  h: '#ef4444', // red
  d: '#3b82f6', // blue
  s: '#e2e8f0', // white/light
  c: '#22c55e', // green
};

const SUIT_SYMBOL: Record<string, string> = {
  h: '♥', d: '♦', s: '♠', c: '♣',
};

// ─── Mini card ────────────────────────────────────────────────────────────────

const Card: React.FC<{ card: string; size?: 'sm' | 'md' }> = ({ card, size = 'md' }) => {
  if (!card || card.length < 2) return null;
  const rank = card.slice(0, -1).toUpperCase();
  const suit = card.slice(-1).toLowerCase();
  const color = SUIT_COLOR[suit] ?? '#e2e8f0';
  const symbol = SUIT_SYMBOL[suit] ?? suit;
  const isSm = size === 'sm';
  return (
    <div
      className={`inline-flex flex-col items-center justify-center rounded font-black leading-none select-none
        ${isSm ? 'w-6 h-8 text-[10px]' : 'w-8 h-11 text-xs'}`}
      style={{ background: '#1a1a2e', border: `1.5px solid ${color}40`, color }}
    >
      <span>{rank}</span>
      <span style={{ fontSize: isSm ? 8 : 10 }}>{symbol}</span>
    </div>
  );
};

// ─── Community board ─────────────────────────────────────────────────────────

const Board: React.FC<{ cards: string[] }> = ({ cards }) => {
  if (!cards.length) return null;
  return (
    <div className="flex gap-1 items-center">
      {cards.map((c, i) => <Card key={i} card={c} size="sm" />)}
    </div>
  );
};

// ─── Net BB badge ─────────────────────────────────────────────────────────────

const ResultBadge: React.FC<{ bb: number }> = ({ bb }) => {
  const abs = Math.abs(bb);
  const formatted = (bb >= 0 ? '+' : '') + abs.toFixed(1) + ' BB';
  if (bb > 0.1)  return <span className="text-emerald-400 font-black text-xs">{formatted}</span>;
  if (bb < -0.1) return <span className="text-rose-400 font-black text-xs">{formatted}</span>;
  return <span className="text-gray-400 font-black text-xs">0.0 BB</span>;
};

// ─── Hand card (collapsed / expanded) ────────────────────────────────────────

const STREETS: StreetName[] = ['preflop', 'flop', 'turn', 'river'];
const STREET_LABELS: Record<StreetName, string> = {
  preflop: 'PRÉ-FLOP',
  flop:    'FLOP',
  turn:    'TURN',
  river:   'RIVER',
};

const HandCard: React.FC<{ hand: ParsedCashHand }> = ({ hand }) => {
  const [expanded, setExpanded] = useState(false);

  const stackBB  = hand.players.find(p => p.isHero)?.startStack ?? 0;
  const stackBBs = hand.stakes.bb > 0 ? (stackBB / hand.stakes.bb).toFixed(0) : '?';
  const bbLabel  = `NL${(hand.stakes.bb * 100).toFixed(0)}`; // e.g. NL5

  const playedStreets = STREETS.filter(s => hand.streets[s] && (hand.streets[s]!.actions.length > 0 || hand.streets[s]!.newCards.length > 0));

  return (
    <div
      className="rounded-2xl border border-white/5 bg-white/[0.025] overflow-hidden cursor-pointer hover:border-white/10 transition-all"
      onClick={() => setExpanded(e => !e)}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-3 p-3">
        {/* Cards */}
        <div className="flex gap-1 shrink-0">
          {hand.heroCards.length === 2
            ? hand.heroCards.map((c, i) => <Card key={i} card={c} />)
            : <div className="w-8 h-11 rounded bg-white/5 border border-white/10 flex items-center justify-center text-gray-600 text-[10px]">?</div>
          }
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-black text-xs uppercase tracking-widest">{hand.heroPosition}</span>
            <span className="text-gray-500 text-[10px]">{stackBBs} BB</span>
            <span className="text-gray-600 text-[10px]">{bbLabel} · {hand.tableMaxSize}-max</span>
            <span className="text-gray-600 text-[10px] hidden sm:inline">{hand.tableName}</span>
          </div>
          {/* Board preview */}
          {hand.board.length > 0 && (
            <div className="mt-1">
              <Board cards={hand.board} />
            </div>
          )}
        </div>

        {/* Result + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <ResultBadge bb={hand.heroNetBB} />
          {expanded ? <ChevronUp size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-white/5 px-4 pb-4 pt-3 space-y-3">
          {/* Date + table */}
          <p className="text-gray-500 text-[10px]">
            {hand.date.replace(/\//g, '-')} · Hand #{hand.id} · {hand.tableName}
          </p>

          {/* Players */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
            {hand.players.map(p => (
              <div key={p.seat} className="flex items-center gap-1.5 text-[10px]">
                <span className={p.isHero ? 'text-amber-400 font-black' : 'text-gray-500'}>
                  {p.position}
                </span>
                <span className={p.isHero ? 'text-white' : 'text-gray-400'} style={{ maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.isHero ? <strong>{p.name}</strong> : p.name}
                </span>
                {p.holeCards.length === 2 && !p.isHero && (
                  <div className="flex gap-0.5">
                    <Card card={p.holeCards[0]} size="sm" />
                    <Card card={p.holeCards[1]} size="sm" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Streets */}
          <div className="space-y-2">
            {playedStreets.map(street => {
              const s = hand.streets[street]!;
              const heroSummary = summarizeHeroStreet(hand, street);
              return (
                <div key={street}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-black tracking-widest text-gray-500 uppercase">{STREET_LABELS[street]}</span>
                    {s.newCards.length > 0 && <Board cards={s.newCards} />}
                  </div>
                  {s.actions.map((a, ai) => {
                    const isHero = a.player === hand.heroName;
                    let actionText = '';
                    switch (a.type) {
                      case 'fold':    actionText = 'Fold'; break;
                      case 'check':   actionText = 'Check'; break;
                      case 'call':    actionText = `Call $${a.amount?.toFixed(2)}`; break;
                      case 'bet':     actionText = `Bet $${a.amount?.toFixed(2)}`; break;
                      case 'raise':   actionText = `Raise → $${a.totalAmount?.toFixed(2)}`; break;
                      case 'post-sb': actionText = `Post SB $${a.amount?.toFixed(2)}`; break;
                      case 'post-bb': actionText = `Post BB $${a.amount?.toFixed(2)}`; break;
                    }
                    if (a.isAllIn) actionText += ' (All-in)';
                    return (
                      <div key={ai} className={`flex items-center gap-2 text-[10px] py-0.5 ${isHero ? 'text-amber-300' : 'text-gray-500'}`}>
                        <span className="font-bold" style={{ minWidth: 80, maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {a.player}
                        </span>
                        <span>{actionText}</span>
                      </div>
                    );
                  })}
                  {heroSummary && (
                    <p className="text-[10px] text-amber-400/80 mt-0.5 pl-0">
                      Hero: <span className="font-black">{heroSummary}</span>
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Result breakdown */}
          <div className="flex gap-4 text-[10px] pt-1 border-t border-white/5">
            <span className="text-gray-500">Investido: <span className="text-white">${hand.heroInvestedDollars.toFixed(2)}</span></span>
            <span className="text-gray-500">Coletado: <span className="text-white">${hand.heroCollectedDollars.toFixed(2)}</span></span>
            <span className="text-gray-500">Pot: <span className="text-white">${hand.totalPotDollars.toFixed(2)}</span></span>
            <span className="text-gray-500">Rake: <span className="text-white">${hand.rakeDollars.toFixed(2)}</span></span>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main screen ──────────────────────────────────────────────────────────────

const SpotReplayScreen: React.FC<SpotReplayScreenProps> = ({ onBack }) => {
  const [rawText, setRawText] = useState('');
  const [hands, setHands] = useState<ParsedCashHand[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPasted, setIsPasted] = useState(false);

  const handleParse = useCallback(() => {
    setError(null);
    if (!rawText.trim()) {
      setError('Cole o hand history antes de processar.');
      return;
    }
    const parsed = parsePokerStarsCashHistory(rawText);
    if (parsed.length === 0) {
      setError('Nenhuma mão reconhecida. Verifique se é um hand history do PokerStars (cash game, Hold\'em No Limit).');
      return;
    }
    setHands(parsed);
    setIsPasted(true);
  }, [rawText]);

  const handleReset = () => {
    setHands([]);
    setRawText('');
    setError(null);
    setIsPasted(false);
  };

  // Stats
  const totalBB     = hands.reduce((s, h) => s + h.heroNetBB, 0);
  const winningHands = hands.filter(h => h.heroNetBB > 0.1).length;
  const losingHands  = hands.filter(h => h.heroNetBB < -0.1).length;

  return (
    <div className="w-full min-h-screen bg-[#050505] text-white font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#050505]/95 backdrop-blur border-b border-white/5 px-4 py-3 flex items-center gap-4">
        <button onClick={onBack} className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors text-xs font-black uppercase tracking-widest">
          <ArrowLeft size={14} />
          Voltar
        </button>
        <div className="flex-1">
          <h1 className="text-sm font-black uppercase tracking-widest text-white">Spot Replay</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest">PokerStars · Cash Game</p>
        </div>
        {isPasted && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-all"
          >
            Nova Sessão
          </button>
        )}
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Paste section */}
        {!isPasted && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 p-4 bg-white/[0.02]">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Cole o Hand History</p>
              <p className="text-[10px] text-gray-600 mb-3">
                Suporte: PokerStars · Hold'em No Limit · Cash Game · Uma ou múltiplas mãos
              </p>
              <textarea
                className="w-full h-48 bg-black/40 border border-white/10 rounded-xl p-3 text-[11px] text-gray-300 font-mono resize-none focus:outline-none focus:border-white/20 placeholder:text-gray-700"
                placeholder={"PokerStars Hand #123456789:  Hold'em No Limit ($0.02/$0.05 USD) - 2026/03/29...\nTable 'Philoctetes II' 6-max Seat #4 is the button\n..."}
                value={rawText}
                onChange={e => setRawText(e.target.value)}
                spellCheck={false}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <button
              onClick={handleParse}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 border border-emerald-400/40 rounded-2xl text-xs font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
            >
              <Upload size={14} />
              Processar Hand History
            </button>
          </div>
        )}

        {/* Parsed hands */}
        {isPasted && hands.length > 0 && (
          <div className="space-y-4">
            {/* Summary stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Mãos</p>
                <p className="text-lg font-black text-white">{hands.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Resultado</p>
                <p className={`text-lg font-black ${totalBB > 0 ? 'text-emerald-400' : totalBB < 0 ? 'text-rose-400' : 'text-gray-400'}`}>
                  {totalBB >= 0 ? '+' : ''}{totalBB.toFixed(1)} BB
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/[0.025] p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest">W/L</p>
                <p className="text-sm font-black">
                  <span className="text-emerald-400">{winningHands}</span>
                  <span className="text-gray-600"> / </span>
                  <span className="text-rose-400">{losingHands}</span>
                </p>
              </div>
            </div>

            {/* Hand list */}
            <div className="space-y-2">
              {hands.map(h => <HandCard key={h.id} hand={h} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotReplayScreen;
