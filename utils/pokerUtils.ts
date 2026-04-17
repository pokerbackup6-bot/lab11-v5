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

export const generateCardsFromKey = (key: string, excludeCards?: Set<string>): string[] => {
  const excluded = excludeCards || new Set<string>();
  const maxRetries = 50;

  if (key.length === 4) return [key.substring(0, 2), key.substring(2, 4)];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    let c1: string, c2: string;

    if (key.length === 2 && key[0] === key[1]) {
      const rank = key[0];
      const s1 = SUITS[Math.floor(Math.random() * SUITS.length)];
      let s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
      while (s1 === s2) s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
      c1 = rank + s1; c2 = rank + s2;
    } else if (key.endsWith('s')) {
      const r1 = key[0]; const r2 = key[1];
      const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
      c1 = r1 + suit; c2 = r2 + suit;
    } else if (key.endsWith('o')) {
      const r1 = key[0]; const r2 = key[1];
      const s1 = SUITS[Math.floor(Math.random() * SUITS.length)];
      let s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
      while (s1 === s2) s2 = SUITS[Math.floor(Math.random() * SUITS.length)];
      c1 = r1 + s1; c2 = r2 + s2;
    } else {
      return ['As', 'Ad'];
    }

    if (!excluded.has(c1) && !excluded.has(c2)) return [c1, c2];
  }

  // Fallback: retorna sem checagem (raro)
  if (key.length === 2 && key[0] === key[1]) return [key[0] + 'h', key[0] + 'd'];
  if (key.endsWith('s')) return [key[0] + 'h', key[1] + 'h'];
  return [key[0] + 'h', key[1] + 'd'];
};

// ---------------------------------------------------------------------------
// Opponent Range: sorteia mão do oponente e determina ação via frequência
// ---------------------------------------------------------------------------
export const dealOpponentAction = (
  opponentRanges: RangeData
): { handKey: string; action: string } | null => {
  // Filtra mãos com pelo menos uma ação não-Fold
  const activeHands = Object.keys(opponentRanges).filter(key => {
    const freq = opponentRanges[key];
    const nonFoldTotal = Object.entries(freq)
      .filter(([action]) => !action.toLowerCase().includes('fold'))
      .reduce((sum, [, f]) => sum + (f as number), 0);
    return nonFoldTotal > 0;
  });

  if (activeHands.length === 0) return null;

  // Sorteia mão aleatória
  const handKey = activeHands[Math.floor(Math.random() * activeHands.length)];

  // Seleção ponderada da ação (exclui Fold)
  const freqs = opponentRanges[handKey];
  const entries = Object.entries(freqs).filter(
    ([action]) => !action.toLowerCase().includes('fold')
  ) as [string, number][];

  if (entries.length === 0) return null;

  const total = entries.reduce((s, [, f]) => s + f, 0);
  let r = Math.random() * total;
  for (const [action, freq] of entries) {
    r -= freq;
    if (r <= 0) return { handKey, action };
  }
  return { handKey, action: entries[0][0] };
};

export const getActiveHandsFromRange = (ranges: RangeData): string[] => {
  return Object.keys(ranges).filter(key => {
    const frequencies = ranges[key];
    const totalFreq = Object.values(frequencies).reduce((sum, f) => sum + (f as number), 0);
    return totalFreq > 0;
  });
};

// Returns the action with the highest frequency for a given hand key
export const getDominantAction = (handKey: string, ranges: RangeData): string => {
  const actionMap = ranges[handKey];
  if (!actionMap) return 'Fold';
  const entries = Object.entries(actionMap) as [string, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0]?.[0] ?? 'Fold';
};

// A "close decision" hand has a dominant action with ≤80% frequency share (mixed strategy)
export const isCloseDecision = (handKey: string, ranges: RangeData): boolean => {
  const actionMap = ranges[handKey];
  if (!actionMap) return false;
  const values = Object.values(actionMap) as number[];
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) return false;
  const max = Math.max(...values);
  return max / total <= 0.80;
};

// Detects hands near the boundary where the dominant action changes within a hand family.
// Example: in RFI BTN, K6o=Raise and K5o=Fold → both are border hands, as are the 2
// hands on each side (K8o, K7o, K4o, K3o with radius=3).
// Only hands that exist in the range are returned.
const RANKS_DESC_LOCAL = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

export const getBorderHands = (ranges: RangeData, radius = 3): Set<string> => {
  const result = new Set<string>();

  // Dominant action for a key; '__none__' if absent or all-zero
  const dom = (key: string): string => {
    const m = ranges[key];
    if (!m) return '__none__';
    const entries = Object.entries(m) as [string, number][];
    const total = entries.reduce((s, [, v]) => s + v, 0);
    if (total === 0) return '__none__';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  };

  // Mark `radius` hands on each side of a border at position borderIdx
  const markBorder = (family: string[], borderIdx: number) => {
    const lo = Math.max(0, borderIdx - radius + 1);
    const hi = Math.min(family.length - 1, borderIdx + radius);
    for (let k = lo; k <= hi; k++) {
      if (ranges[family[k]]) result.add(family[k]);
    }
  };

  const findBorders = (family: string[]) => {
    for (let k = 0; k < family.length - 1; k++) {
      const da = dom(family[k]);
      const db = dom(family[k + 1]);
      if (da !== '__none__' && db !== '__none__' && da !== db) {
        markBorder(family, k);
      }
    }
  };

  // Suited and offsuit families: high card H + kickers (ordered strongest → weakest)
  for (let i = 0; i < RANKS_DESC_LOCAL.length; i++) {
    const H = RANKS_DESC_LOCAL[i];
    if (i < RANKS_DESC_LOCAL.length - 1) {
      const suited: string[] = [];
      const offsuit: string[] = [];
      for (let j = i + 1; j < RANKS_DESC_LOCAL.length; j++) {
        suited.push(H + RANKS_DESC_LOCAL[j] + 's');
        offsuit.push(H + RANKS_DESC_LOCAL[j] + 'o');
      }
      findBorders(suited);
      findBorders(offsuit);
    }
  }

  // Pairs: AA → 22
  findBorders(RANKS_DESC_LOCAL.map(r => r + r));

  return result;
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

// Builds a randomised hand pool from the scenario's configured hands.
// Anti-repeat: recently-seen hands are pushed to the end of each new cycle.
export const buildHandPool = (
  scenario: Scenario,
  mode: TrainingMode,
  recentKeys: string[]
): PoolItem[] => {
  // 1. Collect all active items (only hands explicitly configured in the scenario)
  type PoolItemWithRanges = PoolItem & { ranges: RangeData };
  let allItems: PoolItemWithRanges[] = [];

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
  }

  if (allItems.length === 0) return [];

  // 2. Filter for close decisions mode:
  //    - mixed strategy hands (dominant action ≤ 80% frequency)
  //    - border hands (near where the dominant action changes within a hand family)
  if (mode === 'close') {
    // Pre-compute border sets keyed by ranges object reference (one per variant / main ranges)
    const borderCache = new Map<RangeData, Set<string>>();
    const borders = (ranges: RangeData): Set<string> => {
      if (!borderCache.has(ranges)) borderCache.set(ranges, getBorderHands(ranges));
      return borderCache.get(ranges)!;
    };

    const closeItems = allItems.filter(item =>
      isCloseDecision(item.handKey, item.ranges) || borders(item.ranges).has(item.handKey)
    );

    if (closeItems.length >= 3) allItems = closeItems;
  }

  // 3. Group by dominant action and shuffle within each group
  const groups = new Map<string, PoolItemWithRanges[]>();
  allItems.forEach(item => {
    const action = getDominantAction(item.handKey, item.ranges);
    if (!groups.has(action)) groups.set(action, []);
    groups.get(action)!.push(item);
  });
  groups.forEach(g => fisherYates(g));

  // 4. Weighted random selection with consecutive-repeat penalty.
  //    Pure Fisher-Yates on a balanced pool produces alternating sequences
  //    by chance. Here we weight each action by its remaining count but
  //    divide that weight by 2 after 1 consecutive repeat, and by 6 after
  //    2+ consecutive repeats, forcing natural run variation:
  //    R, R, F, R, F, F, F, R, R, F, ... — no fixed pattern.
  const queues = [...groups.entries()].map(([action, items]) => ({ action, items }));
  const result: PoolItem[] = [];
  let lastAction = '';
  let consecutive = 0;

  while (queues.some(q => q.items.length > 0)) {
    const available = queues.filter(q => q.items.length > 0);

    // Compute weights — penalise the last-used action
    const weights = available.map(q => {
      let w = q.items.length;
      if (q.action === lastAction) {
        w = consecutive >= 2
          ? Math.max(1, Math.floor(w / 6))   // strong penalty after 2+ in a row
          : Math.max(1, Math.floor(w / 2));   // mild penalty after 1 in a row
      }
      return w;
    });

    // Pick one queue at random, weighted
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let chosenIdx = available.length - 1;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { chosenIdx = i; break; }
    }

    const chosen = available[chosenIdx];
    const { ranges: _r, ...item } = chosen.items.shift()!;
    result.push(item);

    if (chosen.action === lastAction) {
      consecutive++;
    } else {
      lastAction = chosen.action;
      consecutive = 1;
    }
  }

  // 5. Anti-repeat at cycle boundary: move recently-seen hands to the END
  if (recentKeys.length > 0) {
    const recentSet = new Set(recentKeys);
    const front = result.filter(item => !recentSet.has(item.handKey));
    const back  = result.filter(item =>  recentSet.has(item.handKey));
    return [...front, ...back];
  }

  return result;
};
