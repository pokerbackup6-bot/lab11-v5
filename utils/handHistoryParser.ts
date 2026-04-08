
export type HandPlatform = 'pokerstars';
export type StreetName = 'preflop' | 'flop' | 'turn' | 'river';

export interface ParsedAction {
  player: string;
  type: 'post-sb' | 'post-bb' | 'fold' | 'check' | 'call' | 'bet' | 'raise';
  amount?: number;        // for call/bet/post: amount put in; for raise: the "raises BY" amount
  totalAmount?: number;   // for raise: the "to $Y" total committed this street
  isAllIn?: boolean;
}

export interface ParsedStreet {
  newCards: string[];
  actions: ParsedAction[];
}

export interface ParsedPlayer {
  seat: number;
  name: string;
  startStack: number;
  position: string;
  isHero: boolean;
  holeCards: string[];
}

export interface ParsedCashHand {
  id: string;
  platform: HandPlatform;
  stakes: { sb: number; bb: number; currency: string };
  tableName: string;
  tableMaxSize: number;
  date: string;
  buttonSeat: number;

  players: ParsedPlayer[];
  heroName: string;
  heroCards: string[];
  heroPosition: string;

  streets: Partial<Record<StreetName, ParsedStreet>>;
  board: string[];

  totalPotDollars: number;
  rakeDollars: number;
  heroInvestedDollars: number;
  heroCollectedDollars: number;
  heroNetBB: number;

  rawText: string;
  parseError?: string;
}

// ─── Regex helpers ────────────────────────────────────────────────────────────

const R_HEADER = /PokerStars Hand #(\d+):\s+Hold'em No Limit \(\$([0-9.]+)\/\$([0-9.]+) (USD|EUR|GBP)\) - (\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2})/;
const R_TABLE  = /Table '([^']+)' (\d+)-max Seat #(\d+) is the button/;
const R_SEAT   = /^Seat (\d+): (.+?) \(\$([0-9.]+) in chips\)/;
const R_DEALT  = /^Dealt to (.+?) \[([2-9TJQKAa][cdhs]) ([2-9TJQKAa][cdhs])\]/;
const R_POST_SB  = /^(.+?): posts small blind \$([0-9.]+)/;
const R_POST_BB  = /^(.+?): posts big blind \$([0-9.]+)/;
const R_FOLD   = /^(.+?): folds/;
const R_CHECK  = /^(.+?): checks/;
const R_CALL   = /^(.+?): calls \$([0-9.]+)(?: and is all-in)?/;
const R_BET    = /^(.+?): bets \$([0-9.]+)(?: and is all-in)?/;
const R_RAISE  = /^(.+?): raises \$([0-9.]+) to \$([0-9.]+)(?: and is all-in)?/;
const R_FLOP   = /^\*\*\* FLOP \*\*\* \[([2-9TJQKAa][cdhs]) ([2-9TJQKAa][cdhs]) ([2-9TJQKAa][cdhs])\]/;
const R_TURN   = /^\*\*\* TURN \*\*\* \[.*?\] \[([2-9TJQKAa][cdhs])\]/;
const R_RIVER  = /^\*\*\* RIVER \*\*\* \[.*?\] \[([2-9TJQKAa][cdhs])\]/;
const R_SHOW   = /^(.+?): shows \[([2-9TJQKAa][cdhs]) ([2-9TJQKAa][cdhs])\]/;
const R_MUCK   = /^(.+?): mucks hand/;
const R_COLLECT_HAND = /^(.+?) collected \(\$([0-9.]+)\) from (?:main |side )?pot/;
const R_POT_SUMMARY  = /Total pot \$([0-9.]+).*?Rake \$([0-9.]+)/;
const R_COLLECT_POT  = /^(.+?) collected \$([0-9.]+) from (?:main |side )?pot/;

// ─── Position assignment ──────────────────────────────────────────────────────

function getPositionNames(n: number): string[] {
  switch (n) {
    case 2:  return ['BTN', 'BB'];
    case 3:  return ['BTN', 'SB', 'BB'];
    case 4:  return ['BTN', 'SB', 'BB', 'UTG'];
    case 5:  return ['BTN', 'SB', 'BB', 'UTG', 'CO'];
    case 6:  return ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'];
    case 7:  return ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'HJ', 'CO'];
    case 8:  return ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'];
    case 9:  return ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'LJ', 'CO'];
    default: return Array.from({ length: n }, (_, i) => i === 0 ? 'BTN' : `P${i + 1}`);
  }
}

// ─── Single-hand parser ───────────────────────────────────────────────────────

function parseOneCashHand(text: string): ParsedCashHand | null {
  const lines = text.split('\n').map(l => l.trimEnd());

  // Header
  const headerMatch = lines[0]?.match(R_HEADER);
  if (!headerMatch) return null;
  const id       = headerMatch[1];
  const sb       = parseFloat(headerMatch[2]);
  const bb       = parseFloat(headerMatch[3]);
  const currency = headerMatch[4];
  const date     = headerMatch[5];

  // Table
  const tableMatch = lines[1]?.match(R_TABLE);
  if (!tableMatch) return null;
  const tableName    = tableMatch[1];
  const tableMaxSize = parseInt(tableMatch[2]);
  const buttonSeat   = parseInt(tableMatch[3]);

  // Seats
  const players: ParsedPlayer[] = [];
  let li = 2;
  while (li < lines.length) {
    const m = lines[li].match(R_SEAT);
    if (!m) break;
    players.push({
      seat: parseInt(m[1]),
      name: m[2].trim(),
      startStack: parseFloat(m[3]),
      position: '',
      isHero: false,
      holeCards: [],
    });
    li++;
  }

  if (players.length === 0) return null;

  // Assign positions
  const sortedSeats = players.map(p => p.seat).sort((a, b) => a - b);
  const btnIdx = sortedSeats.indexOf(buttonSeat);
  if (btnIdx !== -1) {
    const posNames = getPositionNames(players.length);
    for (let offset = 0; offset < sortedSeats.length; offset++) {
      const sIdx = (btnIdx + offset) % sortedSeats.length;
      const p = players.find(pl => pl.seat === sortedSeats[sIdx]);
      if (p) p.position = posNames[offset];
    }
  }

  // Parse action sections
  const streets: Partial<Record<StreetName, ParsedStreet>> = {};
  let heroName = '';
  let heroCards: string[] = [];
  let currentStreet: StreetName | null = null;
  let board: string[] = [];
  let totalPotDollars = 0;
  let rakeDollars = 0;
  let heroCollectedDollars = 0;
  let heroInvestedDollars = 0;

  // Track per-street commitment for the hero (to compute invest on raises)
  const streetHeroCommitted: Record<string, number> = {
    preflop: 0, flop: 0, turn: 0, river: 0,
  };

  for (; li < lines.length; li++) {
    const line = lines[li];
    if (!line.trim()) continue;

    // Section markers
    if (line.startsWith('*** HOLE CARDS ***')) {
      currentStreet = 'preflop';
      streets.preflop = { newCards: [], actions: [] };
      continue;
    }
    const flopM = line.match(R_FLOP);
    if (flopM) {
      currentStreet = 'flop';
      const cards = [flopM[1], flopM[2], flopM[3]];
      board.push(...cards);
      streets.flop = { newCards: cards, actions: [] };
      continue;
    }
    const turnM = line.match(R_TURN);
    if (turnM) {
      currentStreet = 'turn';
      board.push(turnM[1]);
      streets.turn = { newCards: [turnM[1]], actions: [] };
      continue;
    }
    const riverM = line.match(R_RIVER);
    if (riverM) {
      currentStreet = 'river';
      board.push(riverM[1]);
      streets.river = { newCards: [riverM[1]], actions: [] };
      continue;
    }
    if (line.startsWith('*** SHOW DOWN ***') || line.startsWith('*** SUMMARY ***')) {
      currentStreet = null;
      if (line.startsWith('*** SUMMARY ***')) {
        // Parse summary section
        for (let si = li + 1; si < lines.length; si++) {
          const sl = lines[si];
          const potM = sl.match(R_POT_SUMMARY);
          if (potM) {
            totalPotDollars = parseFloat(potM[1]);
            rakeDollars     = parseFloat(potM[2]);
          }
          // "PlayerName collected $X.XX from [main/side] pot"  (no parentheses)
          const collectM = sl.match(R_COLLECT_POT);
          if (collectM && collectM[1] === heroName) {
            heroCollectedDollars += parseFloat(collectM[2]);
          }
        }
        break;
      }
      continue;
    }

    // Dealt to (hero detection)
    const dealtM = line.match(R_DEALT);
    if (dealtM) {
      heroName = dealtM[1].trim();
      heroCards = [dealtM[2], dealtM[3]];
      const hp = players.find(p => p.name === heroName);
      if (hp) hp.isHero = true;
      continue;
    }

    // Showdown cards
    const showM = line.match(R_SHOW);
    if (showM) {
      const p = players.find(pl => pl.name === showM[1].trim());
      if (p) p.holeCards = [showM[2], showM[3]];
      if (showM[1].trim() === heroName) heroCards = [showM[2], showM[3]];
    }
    const muckM = line.match(R_MUCK);
    if (muckM) {
      // no cards revealed
    }

    // During-hand collection (when others fold and pot is awarded)
    const collectHandM = line.match(R_COLLECT_HAND);
    if (collectHandM && collectHandM[1].trim() === heroName) {
      heroCollectedDollars += parseFloat(collectHandM[2]);
    }

    // Actions
    if (!currentStreet) continue;
    const streetObj = streets[currentStreet];
    if (!streetObj) continue;

    const isHeroLine = () => {
      const colon = line.indexOf(': ');
      if (colon === -1) return false;
      return line.substring(0, colon).trim() === heroName;
    };

    const sbM = line.match(R_POST_SB);
    if (sbM) {
      const action: ParsedAction = { player: sbM[1].trim(), type: 'post-sb', amount: parseFloat(sbM[2]) };
      streetObj.actions.push(action);
      if (sbM[1].trim() === heroName) {
        heroInvestedDollars += action.amount!;
        streetHeroCommitted.preflop = action.amount!;
      }
      continue;
    }
    const bbM = line.match(R_POST_BB);
    if (bbM) {
      const action: ParsedAction = { player: bbM[1].trim(), type: 'post-bb', amount: parseFloat(bbM[2]) };
      streetObj.actions.push(action);
      if (bbM[1].trim() === heroName) {
        heroInvestedDollars += action.amount!;
        streetHeroCommitted.preflop = action.amount!;
      }
      continue;
    }
    const foldM = line.match(R_FOLD);
    if (foldM) {
      streetObj.actions.push({ player: foldM[1].trim(), type: 'fold' });
      continue;
    }
    const checkM = line.match(R_CHECK);
    if (checkM) {
      streetObj.actions.push({ player: checkM[1].trim(), type: 'check' });
      continue;
    }
    const callM = line.match(R_CALL);
    if (callM) {
      const isAllIn = line.includes('and is all-in');
      const amt = parseFloat(callM[2]);
      streetObj.actions.push({ player: callM[1].trim(), type: 'call', amount: amt, isAllIn });
      if (isHeroLine()) {
        heroInvestedDollars += amt;
        streetHeroCommitted[currentStreet] += amt;
      }
      continue;
    }
    const betM = line.match(R_BET);
    if (betM) {
      const isAllIn = line.includes('and is all-in');
      const amt = parseFloat(betM[2]);
      streetObj.actions.push({ player: betM[1].trim(), type: 'bet', amount: amt, isAllIn });
      if (isHeroLine()) {
        heroInvestedDollars += amt;
        streetHeroCommitted[currentStreet] = amt;
      }
      continue;
    }
    const raiseM = line.match(R_RAISE);
    if (raiseM) {
      const isAllIn = line.includes('and is all-in');
      const raiseBy  = parseFloat(raiseM[2]);
      const raiseTo  = parseFloat(raiseM[3]);
      streetObj.actions.push({ player: raiseM[1].trim(), type: 'raise', amount: raiseBy, totalAmount: raiseTo, isAllIn });
      if (isHeroLine()) {
        const alreadyIn = streetHeroCommitted[currentStreet];
        const additional = raiseTo - alreadyIn;
        heroInvestedDollars += additional;
        streetHeroCommitted[currentStreet] = raiseTo;
      }
      continue;
    }
  }

  // Also catch pre-flop blind posts that may appear before *** HOLE CARDS ***
  // (they're already handled above since we process line by line)

  const heroPlayer = players.find(p => p.isHero);
  const heroPosition = heroPlayer?.position ?? '';

  // Set hero hole cards on player object
  if (heroPlayer && heroCards.length === 2) heroPlayer.holeCards = heroCards;

  const heroNetBB = bb > 0 ? (heroCollectedDollars - heroInvestedDollars) / bb : 0;

  return {
    id,
    platform: 'pokerstars',
    stakes: { sb, bb, currency },
    tableName,
    tableMaxSize,
    date,
    buttonSeat,
    players,
    heroName,
    heroCards,
    heroPosition,
    streets,
    board,
    totalPotDollars,
    rakeDollars,
    heroInvestedDollars,
    heroCollectedDollars,
    heroNetBB,
    rawText: text,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect if text contains PokerStars cash game hand history.
 */
export function isPokerStarsCashHistory(text: string): boolean {
  return /PokerStars Hand #\d+:\s+Hold'em No Limit \(\$[0-9.]+\/\$[0-9.]+ (USD|EUR|GBP)\)/.test(text);
}

/**
 * Parse one or multiple PokerStars cash game hands from raw text.
 * Returns only successfully parsed hands (null results are filtered out).
 */
export function parsePokerStarsCashHistory(text: string): ParsedCashHand[] {
  // Split on "PokerStars Hand #" boundaries (keeping the delimiter)
  const chunks = text.split(/(?=PokerStars Hand #)/).filter(c => c.trim().length > 0);
  const results: ParsedCashHand[] = [];
  for (const chunk of chunks) {
    const hand = parseOneCashHand(chunk);
    if (hand) results.push(hand);
  }
  return results;
}

/**
 * Returns a human-readable summary of a hero action on a given street.
 */
export function summarizeHeroStreet(hand: ParsedCashHand, street: StreetName): string {
  const s = hand.streets[street];
  if (!s) return '';
  const heroActions = s.actions.filter(a => a.player === hand.heroName);
  if (heroActions.length === 0) return '';

  const parts: string[] = [];
  for (const a of heroActions) {
    switch (a.type) {
      case 'fold':    parts.push('Fold'); break;
      case 'check':   parts.push('Check'); break;
      case 'call':    parts.push(`Call ${a.amount?.toFixed(2)}`); break;
      case 'bet':     parts.push(`Bet ${a.amount?.toFixed(2)}`); break;
      case 'raise':   parts.push(`Raise → ${a.totalAmount?.toFixed(2)}`); break;
      case 'post-sb': parts.push('Post SB'); break;
      case 'post-bb': parts.push('Post BB'); break;
    }
    if (a.isAllIn) parts[parts.length - 1] += ' (All-in)';
  }
  return parts.join(' → ');
}
