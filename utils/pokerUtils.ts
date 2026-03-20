import { PlayerStatus, RangeData } from '../types.ts';

export const BIG_BLIND_VALUE = 20;
export const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
export const SUITS = ['c', 'd', 'h', 's'];

export const getSuitSymbol = (suitChar: string) => {
  switch (suitChar?.toLowerCase()) {
    case 'c': return '♣';
    case 'd': return '♦';
    case 'h': return '♥';
    case 's': return '♠';
    default: return suitChar;
  }
};

export const getSuitColor = (suitChar: string) => {
  switch (suitChar?.toLowerCase()) {
    case 'c': return 'text-green-600';
    case 'd': return 'text-blue-600';
    case 'h': return 'text-red-600';
    case 's': return 'text-gray-900';
    default: return 'text-black';
  }
};

export const getTablePositions = (count: number) => {
  if (count === 2) return ['SB', 'BB'];
  if (count <= 4) return ['CO', 'BTN', 'SB', 'BB'];
  if (count <= 6) return ['BTN', 'SB', 'BB', 'LJ', 'HJ', 'CO'];
  return ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'];
};

export const getPreflopOrder = (count: number) => {
  if (count === 2) return ['SB', 'BB'];
  if (count <= 4) return ['CO', 'BTN', 'SB', 'BB'];
  if (count <= 6) return ['LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  return ['UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
};

const CUSTOM_PALETTE = [
  '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1', '#14b8a6',
];

export const getActionColor = (label: string, index: number): string => {
  const l = label.toLowerCase();
  if (l.includes('fold')) return '#334155';
  if (l.includes('call') || l.includes('pagar') || l === 'limp' || l === 'check') return '#0ea5e9';
  if (l.includes('raise') || l === 'rfi' || l.includes('3-bet') || l.includes('4-bet') || l.includes('aumentar') || l.includes('iso')) return '#10b981';
  if (l.includes('all-in') || l.includes('shove')) return '#ef4444';
  return CUSTOM_PALETTE[index % CUSTOM_PALETTE.length];
};

export const generateCardsFromKey = (key: string): string[] => {
  if (key.length === 4) return [key.substring(0, 2), key.substring(2, 4)];
  if (key.length === 2 && key[0] === key[1]) {
    const rank = key[0];
    const s1 = SUITS[Math.floor(Math.random() * SUITS.length)];
    let s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
    while (s1 === s2) s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
    return [rank + s1, rank + s2];
  }
  if (key.endsWith('s')) {
    const r1 = key[0]; const r2 = key[1];
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    return [r1 + suit, r2 + suit];
  }
  if (key.endsWith('o')) {
    const r1 = key[0]; const r2 = key[1];
    const s1 = SUITS[Math.floor(Math.random() * SUITS.length)];
    let s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
    while (s1 === s2) s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
    return [r1 + s1, r2 + s2];
  }
  return ['As', 'Ad'];
};

export const getActiveHandsFromRange = (ranges: RangeData): string[] => {
  return Object.keys(ranges).filter(key => {
    const frequencies = ranges[key];
    const totalFreq = Object.values(frequencies).reduce((sum, f) => sum + (f as number), 0);
    return totalFreq > 0;
  });
};
