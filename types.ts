
export enum PlayerStatus {
  IDLE = 'IDLE',
  ACTING = 'ACTING',
  FOLDED = 'FOLDED',
  POST_SB = 'POST_SB',
  POST_BB = 'POST_BB'
}

export interface Player {
  id: number;
  name: string;
  chips: number;
  positionName: string;
  status?: PlayerStatus;
  cards?: string[];
  betAmount?: number;
  lastAction?: string; // Última ação realizada (ex: 'Check', 'Call', 'Raise')
  isDealer?: boolean;
}

export type ActionType = 'Fold' | 'Call' | 'Raise' | 'All-In';

export type TimeBankOption = 'OFF' | 7 | 15 | 25;

export interface HandRecord {
  id: number;
  cards: string;
  action: string;
  correctAction: string;
  status: 'correct' | 'incorrect';
  timestamp: string;
  isTimeout?: boolean;
}

export interface ActionFrequency {
  [action: string]: number;
}

export interface RangeData {
  [handOrCombo: string]: ActionFrequency;
}

export interface BoardVariant {
  id: string;
  board: string[];
  ranges: RangeData;
  customActions?: string[];
  isDuplicate?: boolean;
}

export interface Scenario {
  id: string;
  name: string;
  modality: string;
  street: string;
  preflopAction: string;
  playerCount: number;
  heroPos: string;
  opponents: string[];
  stackBB: number;
  heroBetSize: number; // Tamanho da aposta/aumento do herói em BBs
  opponentBetSize?: number; // Tamanho do raise inicial do vilão em BBs
  initialPotBB?: number; // Tamanho do pote inicial em BBs (para Pós-Flop)
  board?: string[]; // Cartas na mesa (ex: ['Ah', 'Kd', '2s'])
  ranges: RangeData;
  variants?: BoardVariant[]; // Múltiplos boards para o mesmo spot pós-flop
  opponentAction?: string; // Ação prévia do oponente (ex: 'Check', 'Bet')
  customActions?: string[]; // Novos rótulos de botões customizados
  description?: string;
  videoLink?: string;
  isPublished?: boolean; // false = rascunho (não aparece no treino), true = publicado
}

export interface User {
  email: string;
  name: string;
  password?: string;
  mustChangePassword?: boolean;
  isAdmin?: boolean;
  hasMultiLoginAttempt?: boolean;
  whatsapp?: string;
}

export type TrainingGoalType = 'hands' | 'time' | 'free';

export type TrainingMode = 'normal' | 'close';

export interface TrainingGoal {
  type: TrainingGoalType;
  value: number; // Quantidade de mãos ou minutos
  mode: TrainingMode;
}
