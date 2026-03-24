import { PlayerStatus, RangeData, Scenario, TrainingMode } from '../types.ts';

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

// Generates all 169 standard preflop hand keys (AA, AKs, AKo, ..., 32o)
const RANKS_DESC = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
export const generateAll169Hands = (): string[] => {
  const hands: string[] = [];
  for (let i = 0; i < RANKS_DESC.length; i++) {
    for (let j = 0; j <= i; j++) {
      if (i === j) {
        hands.push(RANKS_DESC[i] + RANKS_DESC[j]); // pair: AA, KK, ...
      } else {
        hands.push(RANKS_DESC[j] + RANKS_DESC[i] + 's'); // suited: AKs, ...
        hands.push(RANKS_DESC[j] + RANKS_DESC[i] + 'o'); // offsuit: AKo, ...
      }
    }
  }
  return hands;
};

// Returns the action with the highest frequency for a given hand key
export const getDominantAction = (handKey: string, ranges: RangeData): string => {
  const actionMap = ranges[handKey];
  if (!actionMap) return 'Fold';
  const entries = Object.entries(actionMap) as [string, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? 'Fold';
};

// A "close decision" hand has a dominant action with ≤80% frequency share (mixed strategy / edge of range)
export const isCloseDecision = (handKey: string, ranges: RangeData): boolean => {
  const actionMap = ranges[handKey];
  if (!actionMap) return false;
  const values = Object.values(actionMap) as number[];
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return false;
  const max = Math.max(...values);
  return max / total <= 0.80;
};

export interface PoolItem {
  variantId?: string;
  handKey: string;
}

const fisherYates = <T>(arr: T[]): T[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// Builds a hand pool with stratified shuffle (interleaved by dominant action)
// and anti-repeat: recentKeys are moved to the end of the pool.
export const buildHandPool = (
  scenario: Scenario,
  mode: TrainingMode,
  recentKeys: string[]
): PoolItem[] => {
  // 1. Collect all active items
  type PoolItemWithRanges = PoolItem & { ranges: RangeData };
  let allItems: PoolItemWithRanges[] = [];

  const isPreflop = scenario.street === 'PREFLOP';

  if (scenario.variants && scenario.variants.length > 0) {
    scenario.variants.forEach(variant => {
      getActiveHandsFromRange(variant.ranges).forEach(handKey => {
        allItems.push({ variantId: variant.id, handKey, ranges: variant.ranges });
      });
    });
  } else {
    getActiveHandsFromRange(scenario.ranges).forEach(handKey => {
      allItems.push({ handKey, ranges: scenario.ranges });
    });

    // For preflop scenarios, add hand types missing from the range as phantom fold hands.
    // These hands have no entry in ranges → handleActionClick's else-branch marks fold correct.
    if (isPreflop) {
      const inRangeKeys = new Set(Object.keys(scenario.ranges));
      // Count active (non-zero) hands already in pool to size the fold set proportionally
      const activeCount = allItems.length;
      // Target: folds represent ~35% of the combined pool (realistic preflop fold rate)
      // Cap phantom folds so they don't overwhelm narrow ranges
      const foldTarget = Math.min(
        Math.round(activeCount * 0.54), // 35% of total ≈ 54% of active count
        80                               // hard cap
      );
      const phantomFolds = generateAll169Hands()
        .filter(h => !inRangeKeys.has(h));
      fisherYates(phantomFolds);
      phantomFolds.slice(0, foldTarget).forEach(handKey => {
        allItems.push({ handKey, ranges: scenario.ranges });
      });
    }
  }

  if (allItems.length === 0) return [];

  // 2. Filter for close decisions mode – phantom fold hands are excluded (obvious folds)
  if (mode === 'close') {
    const closeItems = allItems.filter(item => isCloseDecision(item.handKey, item.ranges));
    if (closeItems.length >= 3) allItems = closeItems;
  }

  // 3. Group by dominant action
  const groups = new Map<string, PoolItemWithRanges[]>();
  allItems.forEach(item => {
    const action = getDominantAction(item.handKey, item.ranges);
    if (!groups.has(action)) groups.set(action, []);
    groups.get(action)!.push(item);
  });

  // 4. Shuffle within each group
  groups.forEach(group => fisherYates(group));

  // 5. Interleave groups via round-robin for balanced action coverage
  const queues = [...groups.values()];
  const interleaved: PoolItem[] = [];
  while (queues.some(q => q.length > 0)) {
    for (const q of queues) {
      if (q.length > 0) {
        const { ranges: _r, ...item } = q.shift()!;
        interleaved.push(item);
      }
    }
  }

  // 6. Anti-repeat at cycle boundary: push recent keys to the end
  if (recentKeys.length > 0) {
    const recentSet = new Set(recentKeys);
    const front = interleaved.filter(item => !recentSet.has(item.handKey));
    const back = interleaved.filter(item => recentSet.has(item.handKey));
    return [...front, ...back];
  }

  return interleaved;
};
