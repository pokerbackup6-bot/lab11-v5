
import React from 'react';
import { createPortal } from 'react-dom';
import { RangeData, ActionFrequency } from '../types.ts';

const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
const SUITS = ['h', 'd', 'c', 's'];

const CUSTOM_PALETTE = [
  '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6',
];

const getActionColor = (label: string, index: number): string => {
  const l = label.toLowerCase();
  if (l.includes('fold')) return '#334155';
  if (l.includes('check')) return '#0ea5e9';
  if (l.includes('call') || l.includes('pagar') || l === 'limp') return '#2563eb';
  if (l.includes('baixo') || l.includes('30%')) return '#10b981';
  if (l.includes('médio') || l.includes('medio') || l.includes('50%')) return '#f59e0b';
  if (l.includes('alto') || l.includes('80%')) return '#f97316';
  if (l.includes('overbet') || l.includes('125%')) return '#ef4444';
  if (l.includes('all-in') || l.includes('shove')) return '#ef4444';
  if (l.includes('raise') || l === 'rfi' || l.includes('3-bet') || l.includes('4-bet') || l.includes('aumentar') || l.includes('iso') || l.includes('bet')) return '#10b981';
  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
};

const EMPTY_CELL_BG = '#0a0a0a';
const SUIT_SYMBOL: Record<string, string> = { h: '♥', d: '♦', c: '♣', s: '♠' };
const SUIT_COLOR: Record<string, string>  = { h: '#f87171', d: '#60a5fa', c: '#4ade80', s: '#94a3b8' };

interface RangeMatrixProps {
  ranges?: RangeData;
  customActions?: string[];
  selectedHand?: string | null;
  board?: string[];
}

const RangeMatrix: React.FC<RangeMatrixProps> = ({
  ranges = {},
  customActions = ['Fold', 'Call', 'Raise', 'All-In'],
  selectedHand = null,
  board = []
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [hoveredHand, setHoveredHand] = React.useState<string | null>(null);
  const [tooltipPos, setTooltipPos] = React.useState({ x: 0, y: 0 });
  const [detailHand, setDetailHand] = React.useState<string | null>(null);
  const leaveTimerRef = React.useRef<number | null>(null);

  // Normaliza board uma vez
  const normalizedBoard = React.useMemo(() =>
    board.map(c => {
      if (!c) return '';
      const val = c.trim().toUpperCase().replace(/10/g, 'T');
      return val.length === 2 ? val[0] + val[1].toLowerCase() : val;
    }).filter(c => c.length === 2),
  [board]);

  const getPossibleCombos = (handKey: string): string[] => {
    const r1 = handKey[0];
    const r2 = handKey[1];
    const isSuited = handKey.endsWith('s');
    const isPair = handKey.length === 2;
    const combos: string[] = [];
    for (const s1 of SUITS) {
      for (const s2 of SUITS) {
        const c1 = r1 + s1;
        const c2 = r2 + s2;
        if (normalizedBoard.includes(c1) || normalizedBoard.includes(c2)) continue;
        if (isPair) {
          if (SUITS.indexOf(s1) < SUITS.indexOf(s2)) combos.push(c1 + c2);
        } else if (isSuited) {
          if (s1 === s2) combos.push(c1 + c2);
        } else {
          if (s1 !== s2) combos.push(c1 + c2);
        }
      }
    }
    return combos;
  };

  const getAggregatedFrequencies = (handKey: string): ActionFrequency => {
    const r1 = handKey[0];
    const r2 = handKey[1];
    const isSuited = handKey.endsWith('s');
    const isPair = handKey.length === 2;
    const possibleCombos = getPossibleCombos(handKey);
    const totalPossible = possibleCombos.length;
    if (totalPossible === 0) return {};
    const comboMap: Record<string, ActionFrequency> = {};
    const handData = ranges[handKey];
    if (handData) {
      possibleCombos.forEach(c => { comboMap[c] = Object.assign({}, handData); });
    }
    Object.entries(ranges).forEach(([k, data]) => {
      if (k.length !== 4) return;
      const cr1 = k[0]; const cs1 = k[1]; const cr2 = k[2]; const cs2 = k[3];
      const ranksMatch = (cr1 === r1 && cr2 === r2) || (cr1 === r2 && cr2 === r1);
      if (!ranksMatch) return;
      const suitMatch = isPair ? cr1 === cr2 : isSuited ? cs1 === cs2 : cs1 !== cs2;
      if (!suitMatch) return;
      const key1 = cr1 + cs1 + cr2 + cs2;
      const key2 = cr2 + cs2 + cr1 + cs1;
      if (possibleCombos.includes(key1)) comboMap[key1] = Object.assign({}, data);
      else if (possibleCombos.includes(key2)) comboMap[key2] = Object.assign({}, data);
    });
    const aggregated: ActionFrequency = {};
    Object.values(comboMap).forEach(data => {
      Object.entries(data).forEach(([act, freq]) => {
        aggregated[act] = (aggregated[act] || 0) + ((freq as number) / totalPossible);
      });
    });
    return aggregated;
  };

  // Frequências individuais por combo
  const getPerComboData = (handKey: string) => {
    const combos = getPossibleCombos(handKey);
    if (!combos.length) return [];
    const catData = ranges[handKey];
    return combos.map(combo => {
      const rev = combo[2] + combo[3] + combo[0] + combo[1];
      const freqs = ranges[combo] ?? ranges[rev] ?? catData ?? {};
      const entries = Object.entries(freqs)
        .filter(([, f]) => (f as number) > 0.5)
        .sort((a, b) => {
          if (a[0] === 'Fold') return 1;
          if (b[0] === 'Fold') return -1;
          return (b[1] as number) - (a[1] as number);
        });
      return { combo, entries, r1: combo[0], s1: combo[1], r2: combo[2], s2: combo[3] };
    });
  };

  const normalizeHandKey = (key: string): string => {
    if (!key || key.length !== 4) return key;
    const r1 = key[0], s1 = key[1], r2 = key[2], s2 = key[3];
    if (r1 === r2) return r1 + r2;
    const idx1 = RANKS.indexOf(r1);
    const idx2 = RANKS.indexOf(r2);
    const [high, low, hs, ls] = idx1 < idx2 ? [r1, r2, s1, s2] : [r2, r1, s2, s1];
    return hs === ls ? high + low + 's' : high + low + 'o';
  };

  const getCellStyles = (handKey: string, expanded: boolean = false) => {
    const normalizedSelected = selectedHand ? normalizeHandKey(selectedHand) : null;
    const isSelected = normalizedSelected === handKey;
    const possibleCombos = getPossibleCombos(handKey);
    if (possibleCombos.length === 0) {
      return {
        backgroundColor: '#0f172a', color: '#1e293b', opacity: 0.4,
        border: isSelected ? '1px solid white' : 'none',
        zIndex: isSelected ? 30 : 1,
      };
    }
    const aggregated = getAggregatedFrequencies(handKey);
    if (Object.keys(aggregated).length === 0) {
      return {
        backgroundColor: EMPTY_CELL_BG, color: '#444',
        border: isSelected ? '1px solid white' : 'none',
        boxShadow: isSelected ? 'inset 0 0 0 1px white' : 'none',
        zIndex: isSelected ? 30 : 1
      };
    }
    const entries = Object.entries(aggregated).sort((a, b) => {
      if (a[0] === 'Fold') return 1;
      if (b[0] === 'Fold') return -1;
      return 0;
    });
    let cumulative = 0;
    const gradientParts = entries.map(([act, freq]) => {
      const start = cumulative.toFixed(2);
      cumulative += freq;
      const end = cumulative.toFixed(2);
      const actionIdx = customActions.indexOf(act);
      const color = getActionColor(act, actionIdx !== -1 ? actionIdx : 0);
      return `${color} ${start}% ${end}%`;
    });
    if (cumulative < 99.99) gradientParts.push(`${EMPTY_CELL_BG} ${cumulative.toFixed(2)}% 100%`);
    const foldFreq = aggregated['Fold'] || 0;
    const textColor = foldFreq > 70 ? '#94a3b8' : 'white';
    return {
      background: entries.length > 0 ? `linear-gradient(to right, ${gradientParts.join(', ')})` : EMPTY_CELL_BG,
      color: textColor,
      border: isSelected ? '1px solid white' : 'none',
      boxShadow: isSelected ? '0 0 10px rgba(255,255,255,0.5), inset 0 0 0 1px white' : 'none',
      zIndex: isSelected ? 30 : 1,
      transform: isSelected ? (expanded ? 'scale(1.1)' : 'scale(1.15)') : 'none'
    };
  };

  // Detecta células com variância entre combos (para indicador visual)
  const cellVariance = React.useMemo(() => {
    const result: Record<string, boolean> = {};
    for (let row = 0; row < RANKS.length; row++) {
      for (let col = 0; col < RANKS.length; col++) {
        const r1 = RANKS[row], r2 = RANKS[col];
        const isPair = row === col, isSuited = col > row;
        const key = isPair ? r1 + r2 : isSuited ? r1 + r2 + 's' : r2 + r1 + 'o';
        const data = getPerComboData(key);
        if (data.length < 2) { result[key] = false; continue; }
        const first = JSON.stringify(data[0].entries);
        result[key] = !data.every(d => JSON.stringify(d.entries) === first);
      }
    }
    return result;
  }, [ranges, normalizedBoard]);

  // Handlers com delay para permitir mover o mouse até o tooltip
  const clearLeaveTimer = () => {
    if (leaveTimerRef.current !== null) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }
  };

  const handleMouseMove = (e: React.MouseEvent, label: string) => {
    clearLeaveTimer();
    setHoveredHand(label);
    setTooltipPos({ x: e.clientX, y: e.clientY });
  };

  const handleCellMouseLeave = () => {
    leaveTimerRef.current = window.setTimeout(() => setHoveredHand(null), 150);
  };

  const handleTooltipMouseEnter = () => clearLeaveTimer();
  const handleTooltipMouseLeave = () => setHoveredHand(null);

  // Dados do tooltip (visão agregada)
  const tooltipData = React.useMemo(() => {
    if (!hoveredHand) return null;
    const aggregated = getAggregatedFrequencies(hoveredHand);
    const entries = Object.entries(aggregated)
      .filter(([, freq]) => (freq as number) > 0.1)
      .sort((a, b) => {
        if (a[0] === 'Fold') return 1;
        if (b[0] === 'Fold') return -1;
        return (b[1] as number) - (a[1] as number);
      });
    return entries.length > 0 ? entries : null;
  }, [hoveredHand, ranges, normalizedBoard]);

  // Dados do modal de detalhe (por combo)
  const detailData = React.useMemo(() => {
    if (!detailHand) return null;
    return getPerComboData(detailHand);
  }, [detailHand, ranges, normalizedBoard]);

  const MatrixGrid = ({ expanded = false }: { expanded?: boolean }) => (
    <div className={expanded ? "grid grid-cols-13 h-full w-full gap-0.5" : "grid grid-cols-13 h-full w-full gap-0"}>
      {RANKS.map((r1, row) =>
        RANKS.map((r2, col) => {
          const isPair = row === col;
          const isSuited = col > row;
          const label = isPair ? r1 + r2 : isSuited ? r1 + r2 + 's' : r2 + r1 + 'o';
          const styles = getCellStyles(label, expanded);
          return (
            <div
              key={label}
              style={styles}
              className={`relative flex items-center justify-center font-bold transition-all duration-300 hover:z-20 hover:shadow-xl cursor-default ${expanded ? 'text-[8px] sm:text-[10px] md:text-[12px] rounded-sm' : 'text-[5px] sm:text-[7px]'}`}
              title={expanded ? undefined : label}
              onMouseMove={expanded ? (e) => handleMouseMove(e, label) : undefined}
              onMouseLeave={expanded ? handleCellMouseLeave : undefined}
            >
              {label}
              {expanded && cellVariance[label] && (
                <div className="absolute top-[2px] right-[2px] w-[4px] h-[4px] rounded-full bg-amber-400/90 pointer-events-none" />
              )}
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <>
      <div
        onClick={() => setIsExpanded(true)}
        className="w-full aspect-square bg-[#0a0a0a] rounded-lg border border-white/5 p-1 overflow-hidden shadow-2xl cursor-zoom-in hover:border-white/20 transition-all"
      >
        <MatrixGrid />
      </div>

      {/* Matriz expandida */}
      {isExpanded && createPortal(
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-10 animate-in fade-in duration-300"
          onClick={() => setIsExpanded(false)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" />
          <div
            className="relative w-full max-w-[95vw] sm:max-w-[85vh] aspect-square bg-[#0a0a0a] rounded-2xl border border-white/10 p-2 sm:p-4 shadow-[0_0_50px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsExpanded(false)}
              className="absolute -top-12 right-0 text-white/60 hover:text-white flex items-center gap-2 text-[11px] font-black uppercase tracking-widest transition-colors"
            >
              Fechar Matriz
              <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">✕</div>
            </button>

            <MatrixGrid expanded />

            <div className="absolute -bottom-16 left-0 right-0 flex flex-wrap justify-center gap-4">
              {customActions.map((action, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-black/40 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-full">
                  <div className="w-3 h-3 rounded-sm border border-white/10" style={{ backgroundColor: getActionColor(action, idx) }} />
                  <span className="text-[9px] text-gray-300 font-black uppercase tracking-widest">{action}</span>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Tooltip simples (hover) — interativo para o mouse transitar */}
      {isExpanded && hoveredHand && tooltipData && createPortal(
        <div
          className="fixed z-[10000] pointer-events-auto"
          style={{
            left: tooltipPos.x + 14,
            top: tooltipPos.y - 8,
            transform: tooltipPos.x > window.innerWidth - 220 ? 'translateX(-110%)' : undefined,
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="bg-[#111827] border border-white/15 rounded-xl shadow-2xl px-3 py-2.5 min-w-[145px]">
            {/* Header */}
            <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1.5">
              <span className="text-white font-black text-[11px] uppercase tracking-widest">{hoveredHand}</span>
            </div>

            {/* Frequências agregadas */}
            <div className="flex flex-col gap-1">
              {tooltipData.map(([action, freq]) => {
                const idx = customActions.indexOf(action);
                const color = getActionColor(action, idx !== -1 ? idx : 0);
                return (
                  <div key={action} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="text-gray-300 text-[10px] font-semibold">{action}</span>
                    </div>
                    <span className="text-white text-[10px] font-black tabular-nums">
                      {(freq as number).toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Botão "Ver por combo" */}
            <button
              onClick={() => { setDetailHand(hoveredHand); setHoveredHand(null); }}
              className="mt-2.5 w-full pt-2 border-t border-white/10 text-[9px] font-black uppercase tracking-widest text-sky-400 hover:text-sky-300 transition-colors flex items-center justify-center gap-1.5"
            >
              <span className="text-base leading-none">+</span>
              Ver por combo
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Modal de detalhe por combo */}
      {detailHand && detailData && createPortal(
        <div
          className="fixed inset-0 z-[10002] flex items-center justify-center p-4"
          onClick={() => setDetailHand(null)}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div
            className="relative bg-[#111827] border border-white/10 rounded-2xl shadow-2xl p-5 max-w-sm w-full max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-gray-500 text-[9px] font-black uppercase tracking-widest mb-0.5">Frequência por combo</p>
                <h3 className="text-white font-black text-base uppercase tracking-widest">{detailHand}</h3>
              </div>
              <button
                onClick={() => setDetailHand(null)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all text-sm"
              >✕</button>
            </div>

            {/* Legenda de ações */}
            <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-white/10">
              {customActions.map((action, idx) => (
                <div key={action} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: getActionColor(action, idx) }} />
                  <span className="text-[9px] text-gray-400 font-semibold">{action}</span>
                </div>
              ))}
            </div>

            {/* Lista de combos */}
            <div className="flex flex-col gap-2.5">
              {detailData.map(({ combo, entries, r1, s1, r2, s2 }) => {
                const total = entries.reduce((s, [, f]) => s + (f as number), 0);
                return (
                  <div key={combo} className="bg-white/[0.04] border border-white/5 rounded-xl p-3">
                    {/* Nome do combo */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[14px] font-mono font-black leading-none">
                        <span className="text-white">{r1}</span>
                        <span style={{ color: SUIT_COLOR[s1] }}>{SUIT_SYMBOL[s1] ?? s1}</span>
                        <span className="text-white"> {r2}</span>
                        <span style={{ color: SUIT_COLOR[s2] }}>{SUIT_SYMBOL[s2] ?? s2}</span>
                      </span>
                      {entries.length === 0 && (
                        <span className="text-[9px] text-gray-600 uppercase font-black">sem range</span>
                      )}
                    </div>

                    {entries.length > 0 && (
                      <>
                        {/* Barra de distribuição */}
                        <div className="h-[7px] rounded-full overflow-hidden bg-[#0a0a0a] flex mb-2">
                          {entries.map(([act, freq]) => {
                            const idx = customActions.indexOf(act);
                            return (
                              <div
                                key={act}
                                style={{ width: `${freq as number}%`, backgroundColor: getActionColor(act, idx !== -1 ? idx : 0) }}
                              />
                            );
                          })}
                          {total < 99 && <div style={{ flex: 1, backgroundColor: EMPTY_CELL_BG }} />}
                        </div>

                        {/* Percentuais por ação */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {entries.map(([act, freq]) => {
                            const idx = customActions.indexOf(act);
                            const color = getActionColor(act, idx !== -1 ? idx : 0);
                            return (
                              <div key={act} className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ backgroundColor: color }} />
                                <span className="text-[9px] text-gray-400">{act}</span>
                                <span className="text-[10px] text-white font-black tabular-nums">
                                  {(freq as number).toFixed(0)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default RangeMatrix;
